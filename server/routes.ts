import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  insertRecording,
  listRecordings,
  getRecording,
  deleteRecording,
  updateRecordingLabel,
  AUDIO_DIR,
} from './db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/recordings — Save recording
router.post('/recordings', upload.single('audio'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const config = JSON.parse(req.body.config);
    const id = uuidv4();
    const audioFilename = `${id}.mp3`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);

    // Save audio file to disk
    fs.writeFileSync(audioPath, req.file.buffer);

    const row = insertRecording({
      id,
      voice_name: config.voice_name,
      voice_display_name: config.voice_display_name,
      language: config.language,
      text: config.text,
      rate: config.rate,
      pitch: config.pitch,
      volume: config.volume,
      emphasis: config.emphasis || null,
      style: config.style || null,
      style_degree: config.style_degree ?? null,
      role: config.role || null,
      break_config: config.break_config || null,
      ssml: config.ssml,
      audio_filename: audioFilename,
      output_format: config.output_format || 'audio-16khz-128kbitrate-mono-mp3',
      api_response_time_ms: config.api_response_time_ms ?? null,
      label: config.label || null,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error('Error saving recording:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET /api/recordings — List all recordings
router.get('/recordings', (_req: Request, res: Response) => {
  const recordings = listRecordings();
  res.json(recordings);
});

// GET /api/recordings/:id — Get single recording
router.get('/recordings/:id', (req: Request, res: Response) => {
  const recording = getRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(recording);
});

// GET /api/recordings/:id/audio — Stream audio file
router.get('/recordings/:id/audio', (req: Request, res: Response) => {
  const recording = getRecording(req.params.id);
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

// DELETE /api/recordings/:id — Delete recording
router.delete('/recordings/:id', (req: Request, res: Response) => {
  const recording = getRecording(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  // Delete audio file
  const audioPath = path.join(AUDIO_DIR, recording.audio_filename);
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }

  deleteRecording(req.params.id);
  res.status(204).send();
});

// PATCH /api/recordings/:id — Update label
router.patch('/recordings/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  const updated = updateRecordingLabel(req.params.id, label);
  if (!updated) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(updated);
});

export default router;
