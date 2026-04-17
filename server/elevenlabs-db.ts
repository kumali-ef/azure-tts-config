import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'tts-recordings.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS elevenlabs_recordings (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    voice_id TEXT NOT NULL,
    voice_name TEXT,
    text TEXT NOT NULL,
    language_code TEXT,
    stability REAL,
    similarity_boost REAL,
    style REAL,
    use_speaker_boost INTEGER,
    speed REAL,
    audio_filename TEXT NOT NULL,
    api_response_time_ms INTEGER,
    stream_duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    label TEXT
  )
`);

export interface ElevenLabsRecordingRow {
  id: string;
  model: string;
  voice_id: string;
  voice_name: string | null;
  text: string;
  language_code: string | null;
  stability: number | null;
  similarity_boost: number | null;
  style: number | null;
  use_speaker_boost: number | null;
  speed: number | null;
  audio_filename: string;
  api_response_time_ms: number | null;
  stream_duration_ms: number | null;
  created_at: string;
  label: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO elevenlabs_recordings (id, model, voice_id, voice_name, text, language_code,
    stability, similarity_boost, style, use_speaker_boost, speed,
    audio_filename, api_response_time_ms, stream_duration_ms, label)
  VALUES (@id, @model, @voice_id, @voice_name, @text, @language_code,
    @stability, @similarity_boost, @style, @use_speaker_boost, @speed,
    @audio_filename, @api_response_time_ms, @stream_duration_ms, @label)
`);

const listStmt = db.prepare(
  'SELECT * FROM elevenlabs_recordings ORDER BY created_at DESC'
);

const getStmt = db.prepare('SELECT * FROM elevenlabs_recordings WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM elevenlabs_recordings WHERE id = ?');

const updateLabelStmt = db.prepare(
  'UPDATE elevenlabs_recordings SET label = @label WHERE id = @id'
);

export function insertElevenLabsRecording(row: Omit<ElevenLabsRecordingRow, 'created_at'>): ElevenLabsRecordingRow {
  insertStmt.run(row);
  return getStmt.get(row.id) as ElevenLabsRecordingRow;
}

export function listElevenLabsRecordings(): ElevenLabsRecordingRow[] {
  return listStmt.all() as ElevenLabsRecordingRow[];
}

export function getElevenLabsRecording(id: string): ElevenLabsRecordingRow | undefined {
  return getStmt.get(id) as ElevenLabsRecordingRow | undefined;
}

export function deleteElevenLabsRecording(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function updateElevenLabsRecordingLabel(id: string, label: string): ElevenLabsRecordingRow | undefined {
  updateLabelStmt.run({ id, label });
  return getStmt.get(id) as ElevenLabsRecordingRow | undefined;
}
