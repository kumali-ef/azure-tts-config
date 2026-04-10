import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'tts-recordings.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS qwen3_recordings (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    voice TEXT NOT NULL,
    voice_display_name TEXT,
    text TEXT NOT NULL,
    language_type TEXT NOT NULL DEFAULT 'Auto',
    instructions TEXT,
    optimize_instructions INTEGER,
    audio_filename TEXT NOT NULL,
    api_response_time_ms INTEGER,
    stream_duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    label TEXT
  )
`);

export interface Qwen3RecordingRow {
  id: string;
  model: string;
  voice: string;
  voice_display_name: string | null;
  text: string;
  language_type: string;
  instructions: string | null;
  optimize_instructions: number | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO qwen3_recordings (id, model, voice, voice_display_name, text, language_type,
    instructions, optimize_instructions, audio_filename, api_response_time_ms, stream_duration_ms, label)
  VALUES (@id, @model, @voice, @voice_display_name, @text, @language_type,
    @instructions, @optimize_instructions, @audio_filename, @api_response_time_ms, @stream_duration_ms, @label)
`);

const listStmt = db.prepare(
  'SELECT * FROM qwen3_recordings ORDER BY created_at DESC'
);

const getStmt = db.prepare('SELECT * FROM qwen3_recordings WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM qwen3_recordings WHERE id = ?');

const updateLabelStmt = db.prepare(
  'UPDATE qwen3_recordings SET label = @label WHERE id = @id'
);

export function insertQwen3Recording(row: Omit<Qwen3RecordingRow, 'created_at'>): Qwen3RecordingRow {
  insertStmt.run(row);
  return getStmt.get(row.id) as Qwen3RecordingRow;
}

export function listQwen3Recordings(): Qwen3RecordingRow[] {
  return listStmt.all() as Qwen3RecordingRow[];
}

export function getQwen3Recording(id: string): Qwen3RecordingRow | undefined {
  return getStmt.get(id) as Qwen3RecordingRow | undefined;
}

export function deleteQwen3Recording(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function updateQwen3RecordingLabel(id: string, label: string): Qwen3RecordingRow | undefined {
  updateLabelStmt.run({ id, label });
  return getStmt.get(id) as Qwen3RecordingRow | undefined;
}
