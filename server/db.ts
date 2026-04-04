import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'tts-recordings.db');
const AUDIO_DIR = path.join(process.cwd(), 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Create recordings table
db.exec(`
  CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    voice_name TEXT NOT NULL,
    voice_display_name TEXT NOT NULL,
    language TEXT NOT NULL,
    text TEXT NOT NULL,
    rate TEXT NOT NULL DEFAULT 'medium',
    pitch TEXT NOT NULL DEFAULT 'medium',
    volume TEXT NOT NULL DEFAULT 'medium',
    emphasis TEXT,
    style TEXT,
    style_degree REAL,
    role TEXT,
    break_config TEXT,
    ssml TEXT NOT NULL,
    audio_filename TEXT NOT NULL,
    output_format TEXT NOT NULL DEFAULT 'audio-16khz-128kbitrate-mono-mp3',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    label TEXT
  )
`);

export interface RecordingRow {
  id: string;
  voice_name: string;
  voice_display_name: string;
  language: string;
  text: string;
  rate: string;
  pitch: string;
  volume: string;
  emphasis: string | null;
  style: string | null;
  style_degree: number | null;
  role: string | null;
  break_config: string | null;
  ssml: string;
  audio_filename: string;
  output_format: string;
  created_at: string;
  label: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO recordings (id, voice_name, voice_display_name, language, text, rate, pitch, volume,
    emphasis, style, style_degree, role, break_config, ssml, audio_filename, output_format, label)
  VALUES (@id, @voice_name, @voice_display_name, @language, @text, @rate, @pitch, @volume,
    @emphasis, @style, @style_degree, @role, @break_config, @ssml, @audio_filename, @output_format, @label)
`);

const listStmt = db.prepare(
  'SELECT * FROM recordings ORDER BY created_at DESC'
);

const getStmt = db.prepare('SELECT * FROM recordings WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM recordings WHERE id = ?');

const updateLabelStmt = db.prepare(
  'UPDATE recordings SET label = @label WHERE id = @id'
);

export function insertRecording(row: Omit<RecordingRow, 'created_at'>): RecordingRow {
  insertStmt.run(row);
  return getStmt.get(row.id) as RecordingRow;
}

export function listRecordings(): RecordingRow[] {
  return listStmt.all() as RecordingRow[];
}

export function getRecording(id: string): RecordingRow | undefined {
  return getStmt.get(id) as RecordingRow | undefined;
}

export function deleteRecording(id: string): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export function updateRecordingLabel(id: string, label: string): RecordingRow | undefined {
  updateLabelStmt.run({ id, label });
  return getStmt.get(id) as RecordingRow | undefined;
}

export { AUDIO_DIR };
export default db;
