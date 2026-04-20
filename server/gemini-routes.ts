import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  insertGeminiRecording,
  listGeminiRecordings,
  getGeminiRecording,
  deleteGeminiRecording,
  updateGeminiRecordingLabel,
} from './gemini-db';
import { AUDIO_DIR } from './db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// POST /api/gemini/synthesize — Proxy TTS request to Gemini API
router.post('/synthesize', async (req: Request, res: Response) => {
  const { apiKey, model, voiceName, text } = req.body as {
    apiKey?: string;
    model?: string;
    voiceName?: string;
    text?: string;
  };

  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!key) {
    res.status(400).json({ error: 'Missing apiKey' });
    return;
  }
  if (!model || !voiceName || !text) {
    res.status(400).json({ error: 'Missing model, voiceName, or text' });
    return;
  }

  const url = `${GEMINI_API_BASE}/${model}:generateContent`;

  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      response_modalities: ['AUDIO'],
      speech_config: {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: voiceName,
          },
        },
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      res.status(response.status).json({
        error: `Gemini API error (${response.status})`,
        upstreamMessage: typeof json === 'object' && json !== null ? JSON.stringify(json) : text,
      });
      return;
    }

    const json = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inline_data?: { mime_type?: string; data?: string };
          }>;
        };
      }>;
    };

    const inlineData = json.candidates?.[0]?.content?.parts?.[0]?.inline_data;
    if (!inlineData?.data) {
      res.status(502).json({ error: 'Gemini API returned no audio data' });
      return;
    }

    const audioBuffer = Buffer.from(inlineData.data, 'base64');
    const mimeType = inlineData.mime_type || 'audio/wav';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.setHeader('X-Audio-Mime-Type', mimeType);
    res.send(audioBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call Gemini API';
    res.status(500).json({ error: message });
  }
});

// POST /api/gemini/recordings — Save recording
router.post('/recordings', upload.single('audio'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const config = JSON.parse(req.body.config);
    const id = uuidv4();
    const ext = config.mime_type === 'audio/mp3' ? '.mp3' : '.wav';
    const audioFilename = `gemini-${id}${ext}`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);

    fs.writeFileSync(audioPath, req.file.buffer);

    const row = insertGeminiRecording({
      id,
      model: config.model,
      voice_name: config.voice_name,
      voice_display_name: config.voice_display_name || null,
      text: config.text,
      audio_filename: audioFilename,
      api_response_time_ms: config.api_response_time_ms ?? null,
      label: config.label || null,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error('Error saving Gemini recording:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET /api/gemini/recordings — List all recordings
router.get('/recordings', (_req: Request, res: Response) => {
  const recordings = listGeminiRecordings();
  res.json(recordings);
});

// GET /api/gemini/recordings/:id — Get single recording
router.get('/recordings/:id', (req: Request, res: Response) => {
  const recording = getGeminiRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(recording);
});

// GET /api/gemini/recordings/:id/audio — Stream audio file
router.get('/recordings/:id/audio', (req: Request, res: Response) => {
  const recording = getGeminiRecording(req.params.id);
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
  const mimeType = ext === '.mp3' ? 'audio/mpeg' : 'audio/wav';
  res.setHeader('Content-Type', mimeType);
  fs.createReadStream(audioPath).pipe(res);
});

// DELETE /api/gemini/recordings/:id — Delete recording
router.delete('/recordings/:id', (req: Request, res: Response) => {
  const recording = getGeminiRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }

  deleteGeminiRecording(req.params.id);
  res.status(204).send();
});

// PATCH /api/gemini/recordings/:id — Update label
router.patch('/recordings/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  const updated = updateGeminiRecordingLabel(req.params.id, label);
  if (!updated) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(updated);
});

export default router;
