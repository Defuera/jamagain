// Musician states during a jam session
export type MusicianState = 'inactive' | 'starting' | 'playing' | 'soloing';

export interface Musician {
  id: number;
  name: string;
  color: string;
  state: MusicianState;
}

export interface SessionConfig {
  musicians: Musician[];
  bpm: number;
  barsPerPhase: number;
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
export const MIN_MUSICIANS = 2;
export const MAX_MUSICIANS = 8;
export const MIN_BPM = 60;
export const MAX_BPM = 200;
