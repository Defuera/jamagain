'use client';

import { SessionConfig } from '@/lib/types';
import { useJamSession } from '@/hooks/useJamSession';
import { JamCircle } from './JamCircle';

interface JamSessionProps {
  config: SessionConfig;
  onStop: () => void;
}

export function JamSession({ config, onStop }: JamSessionProps) {
  const session = useJamSession(config);

  const handleStop = () => {
    session.stop();
    onStop();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      {/* Header info */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Jam Session</h1>
        <p className="text-gray-400 mt-1">
          {config.bpm} BPM • {config.barsPerPhase} bars per phase
        </p>
        <p className="text-blue-400 mt-1">{session.phaseInfo}</p>
      </div>

      {/* Main circle visualization */}
      <JamCircle
        musicians={session.musicians}
        currentBeat={session.currentBeat}
        currentBar={session.currentBar}
        isPlaying={session.isPlaying}
        isPaused={session.isPaused}
        onTogglePlayPause={session.togglePlayPause}
      />

      {/* Controls */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={session.togglePlayPause}
          className={`px-8 py-3 rounded-xl text-lg font-bold transition-colors ${
            session.isPlaying && !session.isPaused
              ? 'bg-yellow-600 hover:bg-yellow-500'
              : 'bg-green-600 hover:bg-green-500'
          }`}
        >
          {session.isPlaying && !session.isPaused ? '⏸ PAUSE' : '▶ PLAY'}
        </button>
        <button
          onClick={handleStop}
          className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-lg font-bold transition-colors"
        >
          ⏹ STOP
        </button>
      </div>

      {/* Status info */}
      <div className="mt-6 text-gray-400 text-sm">
        {session.isPlaying ? (
          session.isPaused ? (
            <span>Paused at bar {session.currentBar}</span>
          ) : (
            <span>
              Beat {session.currentBeat} of bar {session.currentBar}
            </span>
          )
        ) : (
          <span>Press PLAY to start the jam</span>
        )}
      </div>
    </div>
  );
}
