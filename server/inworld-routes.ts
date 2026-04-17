import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  insertInworldRecording,
  listInworldRecordings,
  getInworldRecording,
  deleteInworldRecording,
  updateInworldRecordingLabel,
} from './inworld-db';
import { AUDIO_DIR } from './db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const INWORLD_TTS_URL = 'https://api.inworld.ai/tts/v1/voice';
const INWORLD_VOICES_URL = 'https://api.inworld.ai/voices/v1/voices';

function inworldHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Basic ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

// GET /api/inworld/voices — Proxy voice list
router.get('/voices', async (req: Request, res: Response) => {
  const apiKey = typeof req.query.apiKey === 'string' ? req.query.apiKey.trim() : '';
  if (!apiKey) {
    res.status(400).json({ error: 'Missing apiKey query parameter' });
    return;
  }

  try {
    const response = await fetch(INWORLD_VOICES_URL, {
      headers: { Authorization: `Basic ${apiKey}` },
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({
        error: `Inworld voices API error (${response.status})`,
        upstreamMessage: text,
      });
      return;
    }

    const json = await response.json() as { voices: unknown[] };
    res.json(json.voices);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Inworld voices';
    res.status(500).json({ error: message });
  }
});

// POST /api/inworld/synthesize — Non-streaming: decode base64 audioContent, send WAV bytes
router.post('/synthesize', async (req: Request, res: Response) => {
  const { apiKey, body } = req.body as { apiKey?: string; body?: Record<string, unknown> };
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';

  if (!key) {
    res.status(400).json({ error: 'Missing apiKey' });
    return;
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Missing request body' });
    return;
  }

  try {
    const response = await fetch(INWORLD_TTS_URL, {
      method: 'POST',
      headers: inworldHeaders(key),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      res.status(response.status).json({
        error: `Inworld synthesis API error (${response.status})`,
        upstreamMessage: typeof json === 'object' && json !== null ? JSON.stringify(json) : text,
      });
      return;
    }

    const json = await response.json() as { audioContent?: string };
    if (!json.audioContent) {
      res.status(502).json({ error: 'Inworld API returned no audioContent' });
      return;
    }

    const audioBuffer = Buffer.from(json.audioContent, 'base64');
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.send(audioBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call Inworld API';
    res.status(500).json({ error: message });
  }
});

// POST /api/inworld/synthesize-stream — Streaming: decode NDJSON chunks, strip WAV headers, pipe PCM
router.post('/synthesize-stream', async (req: Request, res: Response) => {
  const { apiKey, body } = req.body as { apiKey?: string; body?: Record<string, unknown> };
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';

  if (!key) {
    res.status(400).json({ error: 'Missing apiKey' });
    return;
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Missing request body' });
    return;
  }

  try {
    const response = await fetch(`${INWORLD_TTS_URL}:stream`, {
      method: 'POST',
      headers: inworldHeaders(key),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      res.status(response.status).json({
        error: `Inworld streaming API error (${response.status})`,
        upstreamMessage: typeof json === 'object' && json !== null ? JSON.stringify(json) : text,
      });
      return;
    }

    if (!response.body) {
      res.status(502).json({ error: 'Inworld streaming API returned no body' });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = (response.body as unknown as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const WAV_HEADER_SIZE = 44;

    const processLine = (line: string) => {
      line = line.trim();
      if (!line) return;
      try {
        const parsed = JSON.parse(line);
        const audioContent = parsed?.result?.audioContent;
        if (audioContent) {
          const decoded = Buffer.from(audioContent, 'base64');
          // Strip WAV header — each LINEAR16 chunk includes a complete WAV header
          const pcmData = decoded.byteLength > WAV_HEADER_SIZE
            ? decoded.subarray(WAV_HEADER_SIZE)
            : decoded;
          res.write(pcmData);
        }
      } catch {
        // Skip malformed lines
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        processLine(line);
      }
    }

    // Process any remaining data
    if (buffer.trim()) {
      processLine(buffer);
    }

    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call Inworld streaming API';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.end();
    }
  }
});

// POST /api/inworld/recordings — Save recording
router.post('/recordings', upload.single('audio'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const config = JSON.parse(req.body.config);
    const id = uuidv4();
    const audioFilename = `inworld-${id}.wav`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);

    fs.writeFileSync(audioPath, req.file.buffer);

    const row = insertInworldRecording({
      id,
      model: config.model,
      voice_id: config.voice_id,
      voice_name: config.voice_name || null,
      text: config.text,
      temperature: config.temperature ?? null,
      apply_text_normalization: config.apply_text_normalization || null,
      audio_filename: audioFilename,
      api_response_time_ms: config.api_response_time_ms ?? null,
      stream_duration_ms: config.stream_duration_ms ?? null,
      label: config.label || null,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error('Error saving Inworld recording:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET /api/inworld/recordings — List all recordings
router.get('/recordings', (_req: Request, res: Response) => {
  const recordings = listInworldRecordings();
  res.json(recordings);
});

// GET /api/inworld/recordings/:id — Get single recording
router.get('/recordings/:id', (req: Request, res: Response) => {
  const recording = getInworldRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(recording);
});

// GET /api/inworld/recordings/:id/audio — Stream audio file
router.get('/recordings/:id/audio', (req: Request, res: Response) => {
  const recording = getInworldRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (!fs.existsSync(audioPath)) {
    res.status(404).json({ error: 'Audio file not found' });
    return;
  }

  const ext = path.extname(recording.audio_filename).toLowerCase();
  const mimeType = ext === '.wav' ? 'audio/wav' : 'audio/mpeg';
  res.setHeader('Content-Type', mimeType);
  fs.createReadStream(audioPath).pipe(res);
});

// DELETE /api/inworld/recordings/:id — Delete recording
router.delete('/recordings/:id', (req: Request, res: Response) => {
  const recording = getInworldRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }

  deleteInworldRecording(req.params.id);
  res.status(204).send();
});

// PATCH /api/inworld/recordings/:id — Update label
router.patch('/recordings/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  const updated = updateInworldRecordingLabel(req.params.id, label);
  if (!updated) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(updated);
});

export default router;
