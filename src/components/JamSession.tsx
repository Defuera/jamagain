'use client';

import { useState, useEffect, useRef } from 'react';
import { SessionConfig, MIN_BPM, MAX_BPM } from '@/lib/types';
import { useJamSession } from '@/hooks/useJamSession';
import { useAudioCues } from '@/hooks/useAudioCues';
import { JamCircle } from './JamCircle';

interface JamSessionProps {
  config: SessionConfig;
  onStop: () => void;
}

export function JamSession({ config: initialConfig, onStop }: JamSessionProps) {
  const [bpm, setBpm] = useState(initialConfig.bpm);
  const [barsPerPhase, setBarsPerPhase] = useState(initialConfig.barsPerPhase);
  const [audioCuesEnabled, setAudioCuesEnabled] = useState(true);

  const config = { ...initialConfig, bpm, barsPerPhase };
  const session = useJamSession(config);
  const { playGetReady, playStart } = useAudioCues();

  // Track previous states to detect transitions
  const prevStatesRef = useRef<Map<number, string>>(new Map());

  // Detect state transitions for audio cues
  useEffect(() => {
    if (!audioCuesEnabled || !session.isPlaying || session.isPaused) return;

    session.musicians.forEach((musician) => {
      const prevState = prevStatesRef.current.get(musician.id);
      const currentState = musician.state;

      if (prevState !== currentState) {
        if (currentState === 'starting') {
          playGetReady();
        } else if (currentState === 'soloing' && prevState === 'starting') {
          playStart();
        }
      }

      prevStatesRef.current.set(musician.id, currentState);
    });
  }, [session.musicians, session.isPlaying, session.isPaused, audioCuesEnabled, playGetReady, playStart]);

  const handleStop = () => {
    session.stop();
    onStop();
  };

  const handleRestart = () => {
    prevStatesRef.current.clear();
    session.stop();
    setTimeout(() => session.start(), 50);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 text-white overflow-hidden">
      {/* Info overlay - top left corner */}
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-3 flex items-start gap-3">
        <button
          onClick={handleStop}
          className="text-gray-400 hover:text-white transition-colors mt-1"
          aria-label="Back to setup"
        >
          ✕
        </button>
        <div className="space-y-2">
          <div className="text-blue-400 font-medium">{session.phaseInfo}</div>

          {/* BPM control */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">BPM</label>
            <button
              onClick={() => setBpm(Math.max(MIN_BPM, bpm - 5))}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-sm"
            >
              −
            </button>
            <span className="text-sm w-8 text-center">{bpm}</span>
            <button
              onClick={() => setBpm(Math.min(MAX_BPM, bpm + 5))}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-sm"
            >
              +
            </button>
          </div>

          {/* Bars per phase control */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Bars</label>
            <button
              onClick={() => setBarsPerPhase(Math.max(1, barsPerPhase - 1))}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-sm"
            >
              −
            </button>
            <span className="text-sm w-8 text-center">{barsPerPhase}</span>
            <button
              onClick={() => setBarsPerPhase(Math.min(16, barsPerPhase + 1))}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-sm"
            >
              +
            </button>
          </div>

          {/* Bottom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioCuesEnabled(!audioCuesEnabled)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                audioCuesEnabled
                  ? 'bg-green-600/50 text-green-300'
                  : 'bg-gray-600/50 text-gray-400'
              }`}
            >
              {audioCuesEnabled ? '🔔 Cues' : '🔕 Cues'}
            </button>

            <button
              onClick={handleRestart}
              className="text-xs px-2 py-1 rounded bg-blue-600/50 text-blue-300 hover:bg-blue-600/70 transition-colors"
            >
              ↺ Restart
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen circle */}
      <JamCircle
        musicians={session.musicians}
        currentBeat={session.currentBeat}
        currentBar={session.currentBar}
        isPlaying={session.isPlaying}
        isPaused={session.isPaused}
        onTogglePlayPause={session.togglePlayPause}
      />
    </div>
  );
}
