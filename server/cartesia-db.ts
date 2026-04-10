import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'tts-recordings.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS cartesia_recordings (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    voice_id TEXT NOT NULL,
    voice_name TEXT,
    text TEXT NOT NULL,
    language TEXT,
    speed REAL,
    volume REAL,
    emotion TEXT,
    audio_filename TEXT NOT NULL,
    api_response_time_ms INTEGER,
    stream_duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    label TEXT
  )
`);

export interface CartesiaRecordingRow {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  language: string | null;
  speed: number | null;
  volume: number | null;
  emotion: string | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO cartesia_recordings (id, model, voice_id, voice_name, text, language,
    speed, volume, emotion, audio_filename, api_response_time_ms, stream_duration_ms, label)
  VALUES (@id, @model, @voice_id, @voice_name, @text, @language,
    @speed, @volume, @emotion, @audio_filename, @api_response_time_ms, @stream_duration_ms, @label)
`);

const listStmt = db.prepare(
  'SELECT * FROM cartesia_recordings ORDER BY created_at DESC'
);

const getStmt = db.prepare('SELECT * FROM cartesia_recordings WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM cartesia_recordings WHERE id = ?');

const updateLabelStmt = db.prepare(
  'UPDATE cartesia_recordings SET label = @label WHERE id = @id'
);

export function insertCartesiaRecording(row: Omit<CartesiaRecordingRow, 'created_at'>): CartesiaRecordingRow {
  insertStmt.run(row);
  return getStmt.get(row.id) as CartesiaRecordingRow;
}

export function listCartesiaRecordings(): CartesiaRecordingRow[] {
  return listStmt.all() as CartesiaRecordingRow[];
}

export function getCartesiaRecording(id: string): CartesiaRecordingRow | undefined {
  return getStmt.get(id) as CartesiaRecordingRow | undefined;
}

export function deleteCartesiaRecording(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function updateCartesiaRecordingLabel(id: string, label: string): CartesiaRecordingRow | undefined {
  updateLabelStmt.run({ id, label });
  return getStmt.get(id) as CartesiaRecordingRow | undefined;
}
