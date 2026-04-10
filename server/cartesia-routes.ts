import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
  insertCartesiaRecording,
  listCartesiaRecordings,
  getCartesiaRecording,
  deleteCartesiaRecording,
  updateCartesiaRecordingLabel,
} from './cartesia-db';
import { AUDIO_DIR } from './db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const CARTESIA_API_URL = 'https://api.cartesia.ai';
const CARTESIA_VERSION = '2026-03-01';

function cartesiaHeaders(apiKey: string): Record<string, string> {
  return {
    'X-API-Key': apiKey,
    'Cartesia-Version': CARTESIA_VERSION,
    'Content-Type': 'application/json',
  };
}

// GET /api/cartesia/voices — Proxy voice list from Cartesia API (paginated, fetches all)
router.get('/voices', async (req: Request, res: Response) => {
  const apiKey = typeof req.query.apiKey === 'string' ? req.query.apiKey.trim() : '';
  if (!apiKey) {
    res.status(400).json({ error: 'Missing apiKey query parameter' });
    return;
  }

  try {
    const allVoices: unknown[] = [];
    let startingAfter: string | undefined;

    while (true) {
      const params = new URLSearchParams({ limit: '100' });
      if (startingAfter) params.set('starting_after', startingAfter);

      const response = await fetch(`${CARTESIA_API_URL}/voices?${params}`, {
        headers: {
          'X-API-Key': apiKey,
          'Cartesia-Version': CARTESIA_VERSION,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        res.status(response.status).json({
          error: `Cartesia voices API error (${response.status})`,
          upstreamMessage: text,
        });
        return;
      }

      const json = await response.json() as { data: Array<{ id: string }>; has_more: boolean };
      allVoices.push(...json.data);

      if (!json.has_more || json.data.length === 0) break;
      startingAfter = json.data[json.data.length - 1].id;
    }

    res.json(allVoices);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Cartesia voices';
    res.status(500).json({ error: message });
  }
});

// POST /api/cartesia/synthesize — Non-streaming: get audio bytes from Cartesia
router.post('/synthesize', async (req: Request, res: Response) => {
  const { apiKey, body } = req.body as { apiKey?: string; body?: unknown };
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
    const response = await fetch(`${CARTESIA_API_URL}/tts/bytes`, {
      method: 'POST',
      headers: cartesiaHeaders(key),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      res.status(response.status).json({
        error: `Cartesia synthesis API error (${response.status})`,
        upstreamMessage: typeof json === 'object' && json !== null ? JSON.stringify(json) : text,
      });
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call Cartesia API';
    res.status(500).json({ error: message });
  }
});

// POST /api/cartesia/synthesize-stream — Streaming: pipe SSE from Cartesia
router.post('/synthesize-stream', async (req: Request, res: Response) => {
  const { apiKey, body } = req.body as { apiKey?: string; body?: unknown };
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
    const response = await fetch(`${CARTESIA_API_URL}/tts/sse`, {
      method: 'POST',
      headers: cartesiaHeaders(key),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      res.status(response.status).json({
        error: `Cartesia streaming API error (${response.status})`,
        upstreamMessage: typeof json === 'object' && json !== null ? JSON.stringify(json) : text,
      });
      return;
    }

    if (!response.body) {
      res.status(502).json({ error: 'Cartesia streaming API returned no body' });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    Readable.fromWeb(response.body as unknown as ReadableStream).pipe(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call Cartesia streaming API';
    res.status(500).json({ error: message });
  }
});

// POST /api/cartesia/recordings — Save recording
router.post('/recordings', upload.single('audio'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const config = JSON.parse(req.body.config);
    const id = uuidv4();
    const audioFilename = `cartesia-${id}.mp3`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);

    fs.writeFileSync(audioPath, req.file.buffer);

    const row = insertCartesiaRecording({
      id,
      model: config.model,
      voice_id: config.voice_id,
      voice_name: config.voice_name || null,
      text: config.text,
      language: config.language || null,
      speed: config.speed ?? null,
      volume: config.volume ?? null,
      emotion: config.emotion || null,
      audio_filename: audioFilename,
      api_response_time_ms: config.api_response_time_ms ?? null,
      stream_duration_ms: config.stream_duration_ms ?? null,
      label: config.label || null,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error('Error saving Cartesia recording:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET /api/cartesia/recordings — List all recordings
router.get('/recordings', (_req: Request, res: Response) => {
  const recordings = listCartesiaRecordings();
  res.json(recordings);
});

// GET /api/cartesia/recordings/:id — Get single recording
router.get('/recordings/:id', (req: Request, res: Response) => {
  const recording = getCartesiaRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(recording);
});

// GET /api/cartesia/recordings/:id/audio — Stream audio file
router.get('/recordings/:id/audio', (req: Request, res: Response) => {
  const recording = getCartesiaRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (!fs.existsSync(audioPath)) {
    res.status(404).json({ error: 'Audio file not found' });
    return;
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  fs.createReadStream(audioPath).pipe(res);
});

// DELETE /api/cartesia/recordings/:id — Delete recording
router.delete('/recordings/:id', (req: Request, res: Response) => {
  const recording = getCartesiaRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }

  deleteCartesiaRecording(req.params.id);
  res.status(204).send();
});

// PATCH /api/cartesia/recordings/:id — Update label
router.patch('/recordings/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  const updated = updateCartesiaRecordingLabel(req.params.id, label);
  if (!updated) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(updated);
});

export default router;
