import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
  insertFishAudioRecording,
  listFishAudioRecordings,
  getFishAudioRecording,
  deleteFishAudioRecording,
  updateFishAudioRecordingLabel,
} from './fishaudio-db';
import { AUDIO_DIR } from './db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const FISHAUDIO_API_URL = 'https://api.fish.audio/v1/tts';
const FISHAUDIO_MODEL_URL = 'https://api.fish.audio/model';

// GET /api/fishaudio/voices — List/search voice models
router.get('/voices', async (req: Request, res: Response) => {
  const apiKey = (req.query.apiKey as string || '').trim();
  const search = (req.query.search as string || '').trim();
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const page = parseInt(req.query.page as string) || 1;
  const self = req.query.self === 'true';

  if (!apiKey) {
    res.status(400).json({ error: 'Missing apiKey' });
    return;
  }

  try {
    const params = new URLSearchParams();
    params.set('page_size', String(pageSize));
    params.set('page_number', String(page));
    params.set('sort_by', 'score');
    if (search) params.set('title', search);
    if (self) params.set('self', 'true');

    const response = await fetch(`${FISHAUDIO_MODEL_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({
        error: `Fish Audio API error (${response.status})`,
        upstreamMessage: text,
      });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch voices';
    res.status(500).json({ error: message });
  }
});

// POST /api/fishaudio/synthesize — Non-streaming: full WAV download
router.post('/synthesize', async (req: Request, res: Response) => {
  const { apiKey, model, body } = req.body as { apiKey?: string; model?: string; body?: Record<string, unknown> };
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  const mdl = typeof model === 'string' ? model.trim() : 's2-pro';

  if (!key) {
    res.status(400).json({ error: 'Missing apiKey' });
    return;
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Missing request body' });
    return;
  }

  try {
    const response = await fetch(FISHAUDIO_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        model: mdl,
      },
      body: JSON.stringify({ ...body, format: 'wav' }),
    });

    if (!response.ok) {
      const text = await response.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      res.status(response.status).json({
        error: `Fish Audio API error (${response.status})`,
        upstreamMessage: typeof json === 'object' && json !== null ? JSON.stringify(json) : text,
      });
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call Fish Audio API';
    res.status(500).json({ error: message });
  }
});

// POST /api/fishaudio/synthesize-stream — Streaming: pipe WAV binary stream
router.post('/synthesize-stream', async (req: Request, res: Response) => {
  const { apiKey, model, body } = req.body as { apiKey?: string; model?: string; body?: Record<string, unknown> };
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  const mdl = typeof model === 'string' ? model.trim() : 's2-pro';

  if (!key) {
    res.status(400).json({ error: 'Missing apiKey' });
    return;
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Missing request body' });
    return;
  }

  try {
    const response = await fetch(FISHAUDIO_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        model: mdl,
      },
      body: JSON.stringify({ ...body, format: 'wav' }),
    });

    if (!response.ok) {
      const text = await response.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      res.status(response.status).json({
        error: `Fish Audio streaming API error (${response.status})`,
        upstreamMessage: typeof json === 'object' && json !== null ? JSON.stringify(json) : text,
      });
      return;
    }

    if (!response.body) {
      res.status(502).json({ error: 'Fish Audio API returned no body' });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    Readable.fromWeb(response.body as unknown as ReadableStream).pipe(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call Fish Audio streaming API';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.end();
    }
  }
});

// POST /api/fishaudio/recordings — Save recording
router.post('/recordings', upload.single('audio'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const config = JSON.parse(req.body.config);
    const id = uuidv4();
    const audioFilename = `fishaudio-${id}.wav`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);

    fs.writeFileSync(audioPath, req.file.buffer);

    const row = insertFishAudioRecording({
      id,
      model: config.model,
      reference_id: config.reference_id || null,
      voice_name: config.voice_name || null,
      text: config.text,
      chunk_length: config.chunk_length ?? null,
      normalize: config.normalize != null ? (config.normalize ? 1 : 0) : null,
      latency: config.latency || null,
      temperature: config.temperature ?? null,
      top_p: config.top_p ?? null,
      speed: config.speed ?? null,
      volume: config.volume ?? null,
      audio_filename: audioFilename,
      api_response_time_ms: config.api_response_time_ms ?? null,
      stream_duration_ms: config.stream_duration_ms ?? null,
      label: config.label || null,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error('Error saving Fish Audio recording:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET /api/fishaudio/recordings — List all recordings
router.get('/recordings', (_req: Request, res: Response) => {
  const recordings = listFishAudioRecordings();
  res.json(recordings);
});

// GET /api/fishaudio/recordings/:id — Get single recording
router.get('/recordings/:id', (req: Request, res: Response) => {
  const recording = getFishAudioRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(recording);
});

// GET /api/fishaudio/recordings/:id/audio — Stream audio file
router.get('/recordings/:id/audio', (req: Request, res: Response) => {
  const recording = getFishAudioRecording(req.params.id);
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

// DELETE /api/fishaudio/recordings/:id — Delete recording
router.delete('/recordings/:id', (req: Request, res: Response) => {
  const recording = getFishAudioRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }

  deleteFishAudioRecording(req.params.id);
  res.status(204).send();
});

// PATCH /api/fishaudio/recordings/:id — Update label
router.patch('/recordings/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  const updated = updateFishAudioRecordingLabel(req.params.id, label);
  if (!updated) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(updated);
});

export default router;
