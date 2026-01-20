'use client';

import { SoloLoop, SoloRecordingState } from '@/lib/types';

interface LoopPanelProps {
  loops: SoloLoop[];
  recordingState: SoloRecordingState;
  onToggleLoop: (loopId: string) => void;
  onAddLoop: () => void;
  disabled?: boolean;
}

export function LoopPanel({
  loops,
  recordingState,
  onToggleLoop,
  onAddLoop,
  disabled = false,
}: LoopPanelProps) {
  const isRecordingFlow = recordingState !== 'idle';
  const canAddLoop = !disabled && !isRecordingFlow;

  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
      <div className="flex items-center gap-3 flex-wrap">
        {loops.map((loop, index) => (
          <button
            key={loop.id}
            onClick={() => onToggleLoop(loop.id)}
            className={`
              w-12 h-12 rounded-lg transition-all duration-200
              flex items-center justify-center text-white font-bold text-lg
              ${loop.isPlaying
                ? 'opacity-100 shadow-lg'
                : 'opacity-40 border-2 border-dashed'
              }
            `}
            style={{
              backgroundColor: loop.isPlaying ? loop.color : 'transparent',
              borderColor: loop.color,
            }}
            aria-label={`Loop ${index + 1}: ${loop.isPlaying ? 'Playing' : 'Muted'}`}
            title={`Loop ${index + 1}: Click to ${loop.isPlaying ? 'mute' : 'unmute'}`}
          >
            {index + 1}
          </button>
        ))}

        {/* Add Loop button */}
        <button
          onClick={onAddLoop}
          disabled={!canAddLoop}
          className={`
            w-12 h-12 rounded-lg border-2 border-dashed
            flex items-center justify-center text-2xl font-bold
            transition-all duration-200
            ${canAddLoop
              ? 'border-gray-400 text-gray-400 hover:border-white hover:text-white hover:bg-white/10'
              : 'border-gray-600 text-gray-600 cursor-not-allowed'
            }
            ${isRecordingFlow ? 'animate-pulse border-yellow-500 text-yellow-500' : ''}
          `}
          aria-label="Add new loop"
          title={isRecordingFlow ? 'Recording in progress...' : 'Add new loop'}
        >
          {isRecordingFlow ? '●' : '+'}
        </button>

        {/* Recording state indicator */}
        {isRecordingFlow && (
          <div className="ml-2 text-sm font-medium">
            {recordingState === 'warmup' && (
              <span className="text-gray-400">Get ready...</span>
            )}
            {recordingState === 'ready' && (
              <span className="text-yellow-400 animate-pulse">READY</span>
            )}
            {recordingState === 'recording' && (
              <span className="text-red-500 animate-pulse">● RECORDING</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
