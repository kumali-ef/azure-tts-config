import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'tts-recordings.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS fishaudio_recordings (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    reference_id TEXT,
    voice_name TEXT,
    text TEXT NOT NULL,
    chunk_length INTEGER,
    normalize INTEGER,
    latency TEXT,
    temperature REAL,
    top_p REAL,
    speed REAL,
    volume REAL,
    audio_filename TEXT NOT NULL,
    api_response_time_ms INTEGER,
    stream_duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    label TEXT
  )
`);

export interface FishAudioRecordingRow {
  id: string;
  model: string;
  reference_id: string | null;
  voice_name: string | null;
  text: string;
  chunk_length: number | null;
  normalize: number | null;
  latency: string | null;
  temperature: number | null;
  top_p: number | null;
  speed: number | null;
  volume: number | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO fishaudio_recordings (id, model, reference_id, voice_name, text,
    chunk_length, normalize, latency, temperature, top_p, speed, volume,
    audio_filename, api_response_time_ms, stream_duration_ms, label)
  VALUES (@id, @model, @reference_id, @voice_name, @text,
    @chunk_length, @normalize, @latency, @temperature, @top_p, @speed, @volume,
    @audio_filename, @api_response_time_ms, @stream_duration_ms, @label)
`);

const listStmt = db.prepare(
  'SELECT * FROM fishaudio_recordings ORDER BY created_at DESC'
);

const getStmt = db.prepare('SELECT * FROM fishaudio_recordings WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM fishaudio_recordings WHERE id = ?');

const updateLabelStmt = db.prepare(
  'UPDATE fishaudio_recordings SET label = @label WHERE id = @id'
);

export function insertFishAudioRecording(row: Omit<FishAudioRecordingRow, 'created_at'>): FishAudioRecordingRow {
  insertStmt.run(row);
  return getStmt.get(row.id) as FishAudioRecordingRow;
}

export function listFishAudioRecordings(): FishAudioRecordingRow[] {
  return listStmt.all() as FishAudioRecordingRow[];
}

export function getFishAudioRecording(id: string): FishAudioRecordingRow | undefined {
  return getStmt.get(id) as FishAudioRecordingRow | undefined;
}

export function deleteFishAudioRecording(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function updateFishAudioRecordingLabel(id: string, label: string): FishAudioRecordingRow | undefined {
  updateLabelStmt.run({ id, label });
  return getStmt.get(id) as FishAudioRecordingRow | undefined;
}
