// Musician states during a jam session
// preparingToRecord = warning that recording starts next bar
export type MusicianState = 'inactive' | 'starting' | 'preparingToRecord' | 'recording' | 'playing' | 'soloing';

export interface Musician {
  id: number;
  name: string;
  color: string;
  state: MusicianState;
  isVirtual: boolean;
  sampleId?: string; // For virtual players - references the sample they play
}

export interface Sample {
  id: string;
  sourceMusician: number; // Which real player this came from
  audioBuffer: AudioBuffer;
  createdAt: number;
}

export interface SoloLoop {
  id: string;
  color: string;
  sampleId: string;
  isPlaying: boolean;
}

export type SoloRecordingState = 'idle' | 'warmup' | 'ready' | 'recording';

export interface SessionConfig {
  musicians: Musician[];
  bpm: number;
  barsPerPhase: number;
  samplingMode: boolean;
}

export interface SessionState {
  isPlaying: boolean;
  currentBeat: number; // 1-4 within current bar
  currentBar: number; // overall bar count
  currentPhase: number; // which phase we're in
  musicians: Musician[];
}

// Color palette for up to 8 musicians
export const MUSICIAN_COLORS = [
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#EAB308', // Yellow
  '#EF4444', // Red
];

export const DEFAULT_BPM = 120;
export const DEFAULT_BARS_PER_PHASE = 4;
export const BEATS_PER_BAR = 4;
export const MIN_MUSICIANS = 1;
export const MAX_MUSICIANS = 8;
export const MIN_BPM = 60;
export const MAX_BPM = 200;
export const VIRTUAL_PLAYERS_COUNT = 2;
export const RECORDING_BARS = 2; // How many bars to record in sampling mode
export const PLAY_PHASES_BETWEEN_RECORDS = 4; // Phases of play before next re-recording
