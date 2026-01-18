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
    <div className="fixed inset-0 bg-gray-900 text-white overflow-hidden">
      {/* Info overlay - top left corner */}
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-3">
        <button
          onClick={handleStop}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Back to setup"
        >
          ✕
        </button>
        <div>
          <div className="text-sm text-gray-300">
            {config.bpm} BPM • {config.barsPerPhase} bars/phase
          </div>
          <div className="text-blue-400 font-medium">{session.phaseInfo}</div>
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
