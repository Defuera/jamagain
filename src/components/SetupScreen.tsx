'use client';

import { useState } from 'react';
import {
  Musician,
  SessionConfig,
  MUSICIAN_COLORS,
  DEFAULT_BPM,
  DEFAULT_BARS_PER_PHASE,
  MIN_MUSICIANS,
  MAX_MUSICIANS,
  MIN_BPM,
  MAX_BPM,
} from '@/lib/types';

const STORAGE_KEY = 'jam-session-config';

interface SavedConfig {
  musicianCount: number;
  names: string[];
  bpm: number;
  barsPerPhase: number;
  samplingMode: boolean;
}

function getDefaultNames(): string[] {
  return Array(MAX_MUSICIANS).fill('').map((_, i) => `Player ${i + 1}`);
}

function loadSavedConfig(): SavedConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveConfig(config: SavedConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

function clearSavedConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

interface SetupScreenProps {
  onStart: (config: SessionConfig) => void;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  // Load saved config with lazy initializers
  const [musicianCount, setMusicianCount] = useState(() => {
    const saved = loadSavedConfig();
    return saved?.musicianCount ?? 4;
  });
  const [names, setNames] = useState<string[]>(() => {
    const saved = loadSavedConfig();
    return saved?.names ?? getDefaultNames();
  });
  const [bpm, setBpm] = useState(() => {
    const saved = loadSavedConfig();
    return saved?.bpm ?? DEFAULT_BPM;
  });
  const [barsPerPhase, setBarsPerPhase] = useState(() => {
    const saved = loadSavedConfig();
    return saved?.barsPerPhase ?? DEFAULT_BARS_PER_PHASE;
  });
  const [samplingMode, setSamplingMode] = useState(() => {
    const saved = loadSavedConfig();
    return saved?.samplingMode ?? false;
  });

  const handleCountChange = (delta: number) => {
    const newCount = Math.max(MIN_MUSICIANS, Math.min(MAX_MUSICIANS, musicianCount + delta));
    setMusicianCount(newCount);
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  };

  const handleReset = () => {
    setMusicianCount(4);
    setNames(getDefaultNames());
    setBpm(DEFAULT_BPM);
    setBarsPerPhase(DEFAULT_BARS_PER_PHASE);
    setSamplingMode(false);
    clearSavedConfig();
  };

  const handleStart = () => {
    // Save config before starting
    saveConfig({ musicianCount, names, bpm, barsPerPhase, samplingMode });

    const musicians: Musician[] = Array.from({ length: musicianCount }, (_, i) => ({
      id: i + 1,
      name: names[i] || `Player ${i + 1}`,
      color: MUSICIAN_COLORS[i],
      state: 'inactive',
      isVirtual: false,
    }));

    onStart({
      musicians,
      bpm,
      barsPerPhase,
      samplingMode,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Jam Session</h1>
          <p className="text-gray-400 mt-2">Set up your jam session</p>
        </div>

        {/* Musician count */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-lg">Musicians</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleCountChange(-1)}
                disabled={musicianCount <= MIN_MUSICIANS}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-bold"
              >
                −
              </button>
              <span className="text-2xl font-bold w-8 text-center">{musicianCount}</span>
              <button
                onClick={() => handleCountChange(1)}
                disabled={musicianCount >= MAX_MUSICIANS}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Musician names */}
          <div className="space-y-2">
            {Array.from({ length: musicianCount }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: MUSICIAN_COLORS[i] }}
                />
                <input
                  type="text"
                  value={names[i]}
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <label className="text-lg">Tempo</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(Math.max(MIN_BPM, Math.min(MAX_BPM, Number(e.target.value))))}
                min={MIN_BPM}
                max={MAX_BPM}
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-blue-500"
              />
              <span className="text-gray-400">BPM</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-lg">Bars per phase</label>
            <div className="flex items-center gap-2">
              <select
                value={barsPerPhase}
                onChange={(e) => setBarsPerPhase(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {[2, 4, 8, 16].map((n) => (
                  <option key={n} value={n}>
                    {n} bars
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sampling Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-lg">Sampling Mode</label>
              <p className="text-sm text-gray-400">
                Record loops to create virtual players
              </p>
            </div>
            <button
              onClick={() => setSamplingMode(!samplingMode)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                samplingMode ? 'bg-purple-600' : 'bg-gray-600'
              }`}
              role="switch"
              aria-checked={samplingMode}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  samplingMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleStart}
            className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl text-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-2xl">▶</span>
            START JAM
          </button>

          <button
            onClick={handleReset}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
