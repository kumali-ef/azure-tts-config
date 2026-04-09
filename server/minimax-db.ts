import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'tts-recordings.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS minimax_recordings (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    voice_id TEXT NOT NULL,
    voice_name TEXT,
    text TEXT NOT NULL,
    speed REAL NOT NULL DEFAULT 1.0,
    vol REAL NOT NULL DEFAULT 1.0,
    pitch INTEGER NOT NULL DEFAULT 0,
    emotion TEXT,
    language_boost TEXT,
    voice_modify_timbre REAL,
    voice_modify_intensity REAL,
    voice_modify_sound_effect TEXT,
    audio_filename TEXT NOT NULL,
    api_response_time_ms INTEGER,
    stream_duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    label TEXT
  )
`);

export interface MiniMaxRecordingRow {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  speed: number;
  vol: number;
  pitch: number;
  emotion: string | null;
  language_boost: string | null;
  voice_modify_timbre: number | null;
  voice_modify_intensity: number | null;
  voice_modify_sound_effect: string | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO minimax_recordings (id, model, voice_id, voice_name, text, speed, vol, pitch,
    emotion, language_boost, voice_modify_timbre, voice_modify_intensity, voice_modify_sound_effect,
    audio_filename, api_response_time_ms, stream_duration_ms, label)
  VALUES (@id, @model, @voice_id, @voice_name, @text, @speed, @vol, @pitch,
    @emotion, @language_boost, @voice_modify_timbre, @voice_modify_intensity, @voice_modify_sound_effect,
    @audio_filename, @api_response_time_ms, @stream_duration_ms, @label)
`);

const listStmt = db.prepare(
  'SELECT * FROM minimax_recordings ORDER BY created_at DESC'
);

const getStmt = db.prepare('SELECT * FROM minimax_recordings WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM minimax_recordings WHERE id = ?');

const updateLabelStmt = db.prepare(
  'UPDATE minimax_recordings SET label = @label WHERE id = @id'
);

export function insertMiniMaxRecording(row: Omit<MiniMaxRecordingRow, 'created_at'>): MiniMaxRecordingRow {
  insertStmt.run(row);
  return getStmt.get(row.id) as MiniMaxRecordingRow;
}

export function listMiniMaxRecordings(): MiniMaxRecordingRow[] {
  return listStmt.all() as MiniMaxRecordingRow[];
}

export function getMiniMaxRecording(id: string): MiniMaxRecordingRow | undefined {
  return getStmt.get(id) as MiniMaxRecordingRow | undefined;
}

export function deleteMiniMaxRecording(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function updateMiniMaxRecordingLabel(id: string, label: string): MiniMaxRecordingRow | undefined {
  updateLabelStmt.run({ id, label });
  return getStmt.get(id) as MiniMaxRecordingRow | undefined;
}
