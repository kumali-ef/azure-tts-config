import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'tts-recordings.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS inworld_recordings (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    voice_id TEXT NOT NULL,
    voice_name TEXT,
    text TEXT NOT NULL,
    temperature REAL,
    apply_text_normalization TEXT,
    audio_filename TEXT NOT NULL,
    api_response_time_ms INTEGER,
    stream_duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    label TEXT
  )
`);

export interface InworldRecordingRow {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  temperature: number | null;
  apply_text_normalization: string | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO inworld_recordings (id, model, voice_id, voice_name, text,
    temperature, apply_text_normalization,
    audio_filename, api_response_time_ms, stream_duration_ms, label)
  VALUES (@id, @model, @voice_id, @voice_name, @text,
    @temperature, @apply_text_normalization,
    @audio_filename, @api_response_time_ms, @stream_duration_ms, @label)
`);

const listStmt = db.prepare(
  'SELECT * FROM inworld_recordings ORDER BY created_at DESC'
);

const getStmt = db.prepare('SELECT * FROM inworld_recordings WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM inworld_recordings WHERE id = ?');

const updateLabelStmt = db.prepare(
  'UPDATE inworld_recordings SET label = @label WHERE id = @id'
);

export function insertInworldRecording(row: Omit<InworldRecordingRow, 'created_at'>): InworldRecordingRow {
  insertStmt.run(row);
  return getStmt.get(row.id) as InworldRecordingRow;
}

export function listInworldRecordings(): InworldRecordingRow[] {
  return listStmt.all() as InworldRecordingRow[];
}

export function getInworldRecording(id: string): InworldRecordingRow | undefined {
  return getStmt.get(id) as InworldRecordingRow | undefined;
}

export function deleteInworldRecording(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function updateInworldRecordingLabel(id: string, label: string): InworldRecordingRow | undefined {
  updateLabelStmt.run({ id, label });
  return getStmt.get(id) as InworldRecordingRow | undefined;
}
