'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { SessionConfig, Sample, MIN_BPM, MAX_BPM } from '@/lib/types';
import { useSoloSession } from '@/hooks/useSoloSession';
import { useSoloLoops } from '@/hooks/useSoloLoops';
import { useSampler } from '@/hooks/useSampler';
import { useAudioCues } from '@/hooks/useAudioCues';
import { JamCircle } from './JamCircle';
import { LoopPanel } from './LoopPanel';

interface SoloSessionProps {
  config: SessionConfig;
  onStop: () => void;
}

export function SoloSession({ config: initialConfig, onStop }: SoloSessionProps) {
  const [bpm, setBpm] = useState(initialConfig.bpm);
  const [audioCuesEnabled, setAudioCuesEnabled] = useState(true);

  const sampler = useSampler();
  const loopsHook = useSoloLoops();
  const { playGetReady } = useAudioCues();

  // Ref to track pending sample for loop creation
  const pendingSampleRef = useRef<Sample | null>(null);

  const recordingCallbacks = {
    onStartRecording: () => {
      sampler.startRecording();
    },
    onStopRecording: async () => {
      // Use musician id 0 for solo mode
      const sample = await sampler.stopRecording(0);
      if (sample) {
        pendingSampleRef.current = sample;
        // Add loop and start playing
        loopsHook.addLoop(sample);
        sampler.playSample(sample, 1.0, true);
        pendingSampleRef.current = null;
      }
    },
  };

  const session = useSoloSession({ bpm }, recordingCallbacks);

  // Request mic permission on mount
  useEffect(() => {
    sampler.requestMicPermission();
  }, [sampler]);

  // Auto-start first recording when session starts
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (session.isPlaying && !hasAutoStartedRef.current && loopsHook.loops.length === 0) {
      hasAutoStartedRef.current = true;
      // Start recording flow immediately (from bar 1)
      setTimeout(() => session.startRecordingFlow(true), 0);
    }
    if (!session.isPlaying) {
      hasAutoStartedRef.current = false;
    }
  }, [session.isPlaying, session, loopsHook.loops.length]);

  // Play audio cues for recording flow
  const prevRecordingStateRef = useRef(session.recordingState);
  useEffect(() => {
    if (!audioCuesEnabled || !session.isPlaying || session.isPaused) return;
    if (session.recordingState === 'recording') return; // Don't play cues during recording

    const prevState = prevRecordingStateRef.current;
    const currentState = session.recordingState;

    if (prevState !== currentState) {
      if (currentState === 'warmup') {
        playGetReady();
      } else if (currentState === 'ready') {
        playGetReady();
      }
    }

    prevRecordingStateRef.current = currentState;
  }, [session.recordingState, session.isPlaying, session.isPaused, audioCuesEnabled, playGetReady]);

  // Mute metronome during recording is handled by useSoloSession

  // Mute all loops during recording so mic doesn't pick them up
  useEffect(() => {
    if (session.recordingState === 'recording') {
      sampler.muteAllSamples();
    } else {
      sampler.unmuteAllSamples();
    }
  }, [session.recordingState, sampler]);

  // Stop all samples when paused
  useEffect(() => {
    if (session.isPaused) {
      sampler.stopAllSamples();
    }
  }, [session.isPaused, sampler]);

  // Handle loop toggle
  const handleToggleLoop = useCallback((loopId: string) => {
    const loop = loopsHook.getLoop(loopId);
    if (loop) {
      loopsHook.toggleLoop(loopId);
      sampler.toggleSampleMute(loop.sampleId);
    }
  }, [loopsHook, sampler]);

  // Handle add loop
  const handleAddLoop = useCallback(() => {
    session.startRecordingFlow();
  }, [session]);

  // Handle stop
  const handleStop = useCallback(() => {
    session.stop();
    sampler.stopAllSamples();
    sampler.clearSamples();
    loopsHook.clearLoops();
    onStop();
  }, [session, sampler, loopsHook, onStop]);

  // Handle restart
  const handleRestart = useCallback(() => {
    session.stop();
    sampler.stopAllSamples();
    sampler.clearSamples();
    loopsHook.clearLoops();
    setTimeout(() => session.start(), 50);
  }, [session, sampler, loopsHook]);

  // Get the single musician
  const musician = initialConfig.musicians[0];

  return (
    <div className="fixed inset-0 bg-gray-900 text-white overflow-hidden flex flex-col">
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
          <div className="text-purple-400 font-medium">Solo Mode</div>

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

          {/* Bottom controls */}
          <div className="flex items-center gap-2 flex-wrap">
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

            <span className="text-xs px-2 py-1 rounded bg-purple-600/50 text-purple-300">
              {loopsHook.loops.length} loops
            </span>
          </div>
        </div>
      </div>

      {/* Main circle area */}
      <div className="flex-1">
        <JamCircle
          musicians={[{ ...musician, state: 'playing' }]}
          currentBeat={session.currentBeat}
          currentBar={session.currentBar}
          isPlaying={session.isPlaying}
          isPaused={session.isPaused}
          onTogglePlayPause={session.togglePlayPause}
          soloRecordingState={session.recordingState}
        />
      </div>

      {/* Loop panel at bottom */}
      <div className="p-4">
        <LoopPanel
          loops={loopsHook.loops}
          recordingState={session.recordingState}
          onToggleLoop={handleToggleLoop}
          onAddLoop={handleAddLoop}
          disabled={!session.isPlaying || session.isPaused}
        />
      </div>
    </div>
  );
}
