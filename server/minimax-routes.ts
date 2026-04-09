import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  insertMiniMaxRecording,
  listMiniMaxRecordings,
  getMiniMaxRecording,
  deleteMiniMaxRecording,
  updateMiniMaxRecordingLabel,
} from './minimax-db';
import { AUDIO_DIR } from './db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/minimax/recordings — Save recording
router.post('/recordings', upload.single('audio'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const config = JSON.parse(req.body.config);
    const id = uuidv4();
    const audioFilename = `minimax-${id}.mp3`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);

    fs.writeFileSync(audioPath, req.file.buffer);

    const row = insertMiniMaxRecording({
      id,
      model: config.model,
      voice_id: config.voice_id,
      voice_name: config.voice_name || null,
      text: config.text,
      speed: config.speed,
      vol: config.vol,
      pitch: config.pitch,
      emotion: config.emotion || null,
      language_boost: config.language_boost || null,
      voice_modify_timbre: config.voice_modify_timbre ?? null,
      voice_modify_intensity: config.voice_modify_intensity ?? null,
      voice_modify_sound_effect: config.voice_modify_sound_effect || null,
      audio_filename: audioFilename,
      api_response_time_ms: config.api_response_time_ms ?? null,
      stream_duration_ms: config.stream_duration_ms ?? null,
      label: config.label || null,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error('Error saving MiniMax recording:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET /api/minimax/recordings — List all recordings
router.get('/recordings', (_req: Request, res: Response) => {
  const recordings = listMiniMaxRecordings();
  res.json(recordings);
});

// GET /api/minimax/recordings/:id — Get single recording
router.get('/recordings/:id', (req: Request, res: Response) => {
  const recording = getMiniMaxRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(recording);
});

// GET /api/minimax/recordings/:id/audio — Stream audio file
router.get('/recordings/:id/audio', (req: Request, res: Response) => {
  const recording = getMiniMaxRecording(req.params.id);
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

// DELETE /api/minimax/recordings/:id — Delete recording
router.delete('/recordings/:id', (req: Request, res: Response) => {
  const recording = getMiniMaxRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }

  deleteMiniMaxRecording(req.params.id);
  res.status(204).send();
});

// PATCH /api/minimax/recordings/:id — Update label
router.patch('/recordings/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  const updated = updateMiniMaxRecordingLabel(req.params.id, label);
  if (!updated) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(updated);
});

export default router;
