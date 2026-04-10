import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
  insertQwen3Recording,
  listQwen3Recordings,
  getQwen3Recording,
  deleteQwen3Recording,
  updateQwen3RecordingLabel,
} from './qwen3-db';
import { AUDIO_DIR } from './db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

interface DashScopeProxyBody {
  apiKey?: string;
  body?: unknown;
}

// POST /api/qwen3/synthesize — Non-streaming: get audio URL from DashScope, download it, return bytes
router.post('/synthesize', async (req: Request, res: Response) => {
  const payload = req.body as DashScopeProxyBody;
  const apiKey = typeof payload?.apiKey === 'string' ? payload.apiKey.trim() : '';
  const body = payload?.body;

  if (!apiKey) {
    res.status(400).json({ error: 'Missing apiKey' });
    return;
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Missing request body' });
    return;
  }

  try {
    const response = await fetch(DASHSCOPE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      res.status(response.status).json({
        error: `DashScope synthesis API request failed (${response.status})`,
        upstreamCode: json?.code,
        upstreamMessage: json?.message || text || 'Unknown error',
      });
      return;
    }

    // Qwen3-TTS non-streaming returns { output: { audio: { url: "..." } } }
    const audioUrl = json?.output?.audio?.url;
    if (!audioUrl) {
      // Fallback: return the raw JSON in case the format differs
      res.json(json);
      return;
    }

    // Download the audio from the URL and pipe to client
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      res.status(502).json({ error: `Failed to download audio from DashScope URL (${audioResponse.status})` });
      return;
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call DashScope API';
    res.status(500).json({ error: message });
  }
});

// POST /api/qwen3/synthesize-stream — Streaming: pipe SSE from DashScope
router.post('/synthesize-stream', async (req: Request, res: Response) => {
  const payload = req.body as DashScopeProxyBody;
  const apiKey = typeof payload?.apiKey === 'string' ? payload.apiKey.trim() : '';
  const body = payload?.body;

  if (!apiKey) {
    res.status(400).json({ error: 'Missing apiKey' });
    return;
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Missing request body' });
    return;
  }

  try {
    const response = await fetch(DASHSCOPE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'enable',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      res.status(response.status).json({
        error: `DashScope streaming API request failed (${response.status})`,
        upstreamCode: json?.code,
        upstreamMessage: json?.message || text || 'Unknown error',
      });
      return;
    }

    if (!response.body) {
      res.status(502).json({ error: 'DashScope streaming API returned no body' });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    Readable.fromWeb(response.body as unknown as ReadableStream).pipe(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call DashScope streaming API';
    res.status(500).json({ error: message });
  }
});

// POST /api/qwen3/recordings — Save recording
router.post('/recordings', upload.single('audio'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const config = JSON.parse(req.body.config);
    const id = uuidv4();
    const audioFilename = `qwen3-${id}.mp3`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);

    fs.writeFileSync(audioPath, req.file.buffer);

    const row = insertQwen3Recording({
      id,
      model: config.model,
      voice: config.voice,
      voice_display_name: config.voice_display_name || null,
      text: config.text,
      language_type: config.language_type || 'Auto',
      instructions: config.instructions || null,
      optimize_instructions: config.optimize_instructions ?? null,
      audio_filename: audioFilename,
      api_response_time_ms: config.api_response_time_ms ?? null,
      stream_duration_ms: config.stream_duration_ms ?? null,
      label: config.label || null,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error('Error saving Qwen3 recording:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET /api/qwen3/recordings — List all recordings
router.get('/recordings', (_req: Request, res: Response) => {
  const recordings = listQwen3Recordings();
  res.json(recordings);
});

// GET /api/qwen3/recordings/:id — Get single recording
router.get('/recordings/:id', (req: Request, res: Response) => {
  const recording = getQwen3Recording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(recording);
});

// GET /api/qwen3/recordings/:id/audio — Stream audio file
router.get('/recordings/:id/audio', (req: Request, res: Response) => {
  const recording = getQwen3Recording(req.params.id);
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

// DELETE /api/qwen3/recordings/:id — Delete recording
router.delete('/recordings/:id', (req: Request, res: Response) => {
  const recording = getQwen3Recording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }

  deleteQwen3Recording(req.params.id);
  res.status(204).send();
});

// PATCH /api/qwen3/recordings/:id — Update label
router.patch('/recordings/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  const updated = updateQwen3RecordingLabel(req.params.id, label);
  if (!updated) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(updated);
});

export default router;
