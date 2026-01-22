'use client';

import { SoloLoop, SoloRecordingState } from '@/lib/types';

interface SoloTimelineProps {
  loops: SoloLoop[];
  currentBeat: number;
  currentBar: number;
  recordingState: SoloRecordingState;
  isPlaying: boolean;
}

export function SoloTimeline({
  loops,
  currentBeat,
  currentBar,
  recordingState,
  isPlaying,
}: SoloTimelineProps) {
  // Show 8 beats (2 bars) in the timeline
  const totalBeats = 8;

  // Calculate playhead position within the visible window
  // Beat 1-4 in bar, we show current bar and next bar
  const playheadPosition = ((currentBeat - 1) / totalBeats) * 100;

  // Get active (playing) loops
  const activeLoops = loops.filter(loop => loop.isPlaying);

  // Calculate recording state positions
  // Recording flow: warmup (bar 1) -> ready (bar 2) -> recording (bars 3-4)
  const getRecordingSegments = () => {
    if (recordingState === 'idle') return [];

    const segments: { start: number; end: number; type: SoloRecordingState }[] = [];

    // Current beat position in the flow
    if (recordingState === 'warmup') {
      // Warmup is current bar, ready is next bar, recording is bar after
      segments.push({ start: 0, end: 4, type: 'warmup' });
      segments.push({ start: 4, end: 8, type: 'ready' });
    } else if (recordingState === 'ready') {
      // Ready is current bar, recording starts next bar
      segments.push({ start: 0, end: 4, type: 'ready' });
      segments.push({ start: 4, end: 8, type: 'recording' });
    } else if (recordingState === 'recording') {
      // Recording current bar
      segments.push({ start: 0, end: 8, type: 'recording' });
    }

    return segments;
  };

  const recordingSegments = getRecordingSegments();

  return (
    <div className="w-full px-4 py-2">
      <div className="relative h-16 bg-black/30 rounded-lg overflow-hidden backdrop-blur-sm">
        {/* Beat grid lines */}
        {Array.from({ length: totalBeats + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-gray-700"
            style={{ left: `${(i / totalBeats) * 100}%` }}
          />
        ))}

        {/* Bar separator (stronger line at beat 5) */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-500"
          style={{ left: '50%' }}
        />

        {/* Recording state segments */}
        {recordingSegments.map((segment, i) => (
          <div
            key={`rec-${i}`}
            className={`absolute top-0 bottom-0 ${
              segment.type === 'warmup'
                ? 'bg-gray-500/30'
                : segment.type === 'ready'
                ? 'bg-yellow-500/30'
                : 'bg-red-500/40'
            }`}
            style={{
              left: `${(segment.start / totalBeats) * 100}%`,
              width: `${((segment.end - segment.start) / totalBeats) * 100}%`,
            }}
          >
            {/* Recording state label */}
            <div className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${
              segment.type === 'warmup'
                ? 'text-gray-400'
                : segment.type === 'ready'
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}>
              {segment.type === 'warmup' && 'GET READY'}
              {segment.type === 'ready' && 'READY'}
              {segment.type === 'recording' && '● REC'}
            </div>
          </div>
        ))}

        {/* Loop tracks */}
        {activeLoops.length > 0 && recordingState === 'idle' && (
          <div className="absolute inset-0 flex flex-col justify-center gap-1 px-1">
            {activeLoops.slice(0, 4).map((loop) => (
              <div
                key={loop.id}
                className="h-2 rounded-full opacity-80"
                style={{ backgroundColor: loop.color }}
              />
            ))}
            {activeLoops.length > 4 && (
              <div className="text-xs text-gray-400 text-center">
                +{activeLoops.length - 4} more
              </div>
            )}
          </div>
        )}

        {/* Playhead */}
        {isPlaying && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-all duration-75"
            style={{ left: `${playheadPosition}%` }}
          >
            {/* Playhead glow */}
            <div className="absolute inset-0 w-2 -left-0.5 bg-white/30 blur-sm" />
          </div>
        )}

        {/* Bar labels */}
        <div className="absolute bottom-1 left-2 text-xs text-gray-500">
          Bar {currentBar}
        </div>
        <div className="absolute bottom-1 right-2 text-xs text-gray-500">
          Bar {currentBar + 1}
        </div>
      </div>
    </div>
  );
}
