import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'tts-recordings.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS gemini_recordings (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    voice_name TEXT NOT NULL,
    voice_display_name TEXT,
    text TEXT NOT NULL,
    audio_filename TEXT NOT NULL,
    api_response_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    label TEXT
  )
`);

export interface GeminiRecordingRow {
  id: string;
  model: string;
  voice_name: string;
  voice_display_name: string | null;
  text: string;
  audio_filename: string;
  api_response_time_ms: number | null;
  created_at: string;
  label: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO gemini_recordings (id, model, voice_name, voice_display_name, text,
    audio_filename, api_response_time_ms, label)
  VALUES (@id, @model, @voice_name, @voice_display_name, @text,
    @audio_filename, @api_response_time_ms, @label)
`);

const listStmt = db.prepare(
  'SELECT * FROM gemini_recordings ORDER BY created_at DESC'
);

const getStmt = db.prepare('SELECT * FROM gemini_recordings WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM gemini_recordings WHERE id = ?');

const updateLabelStmt = db.prepare(
  'UPDATE gemini_recordings SET label = @label WHERE id = @id'
);

export function insertGeminiRecording(row: Omit<GeminiRecordingRow, 'created_at'>): GeminiRecordingRow {
  insertStmt.run(row);
  return getStmt.get(row.id) as GeminiRecordingRow;
}

export function listGeminiRecordings(): GeminiRecordingRow[] {
  return listStmt.all() as GeminiRecordingRow[];
}

export function getGeminiRecording(id: string): GeminiRecordingRow | undefined {
  return getStmt.get(id) as GeminiRecordingRow | undefined;
}

export function deleteGeminiRecording(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function updateGeminiRecordingLabel(id: string, label: string): GeminiRecordingRow | undefined {
  updateLabelStmt.run({ id, label });
  return getStmt.get(id) as GeminiRecordingRow | undefined;
}
