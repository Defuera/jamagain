'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { SessionConfig, Sample, MIN_BPM, MAX_BPM } from '@/lib/types';
import { useSoloSession } from '@/hooks/useSoloSession';
import { useSoloLoops } from '@/hooks/useSoloLoops';
import { useSampler } from '@/hooks/useSampler';
import { useAudioCues } from '@/hooks/useAudioCues';
import { useSoloStorage } from '@/hooks/useSoloStorage';
import { JamCircle } from './JamCircle';
import { LoopPanel } from './LoopPanel';
import { SoloTimeline } from './SoloTimeline';

interface SoloSessionProps {
  config: SessionConfig;
  onStop: () => void;
}

export function SoloSession({ config: initialConfig, onStop }: SoloSessionProps) {
  const musician = initialConfig.musicians[0];
  const [bpm, setBpm] = useState(initialConfig.bpm);
  const [audioCuesEnabled, setAudioCuesEnabled] = useState(true);

  const sampler = useSampler();
  const loopsHook = useSoloLoops();
  const { playGetReady } = useAudioCues();
  const storage = useSoloStorage();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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

  // Load saved session if requested
  const hasLoadedSavedRef = useRef(false);
  useEffect(() => {
    if (!initialConfig.savedSessionId || hasLoadedSavedRef.current) return;
    hasLoadedSavedRef.current = true;

    const loadSaved = async () => {
      const audioContext = session.getAudioContext();
      const loaded = await storage.loadSession(initialConfig.savedSessionId!, audioContext);
      if (!loaded) return;

      // Restore loops and samples
      for (const savedLoop of loaded.session.loops) {
        const audioBuffer = loaded.audioBuffers.get(savedLoop.id);
        if (audioBuffer) {
          // Add sample to sampler
          const sample = sampler.addSampleFromBuffer(audioBuffer, 0);
          // Add loop with the correct sample ID
          loopsHook.addLoopWithId(savedLoop.id, savedLoop.color, sample.id, savedLoop.isPlaying);
        }
      }

      // Update BPM to match saved session
      setBpm(loaded.session.bpm);
    };

    loadSaved();
  }, [initialConfig.savedSessionId, storage, session, sampler, loopsHook]);

  // Auto-start first recording when session starts (unless loading saved session)
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    // Don't auto-start if loading a saved session
    if (initialConfig.savedSessionId) return;
    if (session.isPlaying && !hasAutoStartedRef.current && loopsHook.loops.length === 0) {
      hasAutoStartedRef.current = true;
      // Start recording flow immediately (from bar 1)
      setTimeout(() => session.startRecordingFlow(true), 0);
    }
    if (!session.isPlaying) {
      hasAutoStartedRef.current = false;
    }
  }, [session.isPlaying, session, loopsHook.loops.length, initialConfig.savedSessionId]);

  // Start playing loaded loops when session starts
  const hasStartedPlaybackRef = useRef(false);
  useEffect(() => {
    if (!initialConfig.savedSessionId) return;
    if (!session.isPlaying || hasStartedPlaybackRef.current) return;
    if (loopsHook.loops.length === 0) return;

    hasStartedPlaybackRef.current = true;
    // Start playing all loops that should be playing
    for (const loop of loopsHook.loops) {
      const sample = sampler.samples.find(s => s.id === loop.sampleId);
      if (sample && loop.isPlaying) {
        sampler.playSample(sample, 1.0, true);
      }
    }
  }, [session.isPlaying, loopsHook.loops, sampler, initialConfig.savedSessionId]);

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

  // Handle save
  const handleSave = useCallback(async () => {
    if (loopsHook.loops.length === 0) return;
    setSaveStatus('saving');
    try {
      await storage.saveSession(
        bpm,
        musician.name,
        loopsHook.loops,
        sampler.getSampleBuffer
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save session:', error);
      setSaveStatus('idle');
    }
  }, [bpm, loopsHook.loops, sampler, storage, musician.name]);

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

      {/* Save button - top right corner */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleSave}
          disabled={loopsHook.loops.length === 0 || saveStatus === 'saving'}
          className={`px-4 py-2 rounded-lg font-medium transition-colors backdrop-blur-sm ${
            saveStatus === 'saved'
              ? 'bg-green-600/70 text-green-100'
              : saveStatus === 'saving'
              ? 'bg-yellow-600/70 text-yellow-100'
              : loopsHook.loops.length === 0
              ? 'bg-gray-600/30 text-gray-500 cursor-not-allowed'
              : 'bg-orange-600/70 text-orange-100 hover:bg-orange-600/90'
          }`}
        >
          {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : '💾 Save'}
        </button>
      </div>

      {/* Timeline track */}
      <div className="pt-16">
        <SoloTimeline
          loops={loopsHook.loops}
          currentBeat={session.currentBeat}
          currentBar={session.currentBar}
          recordingState={session.recordingState}
          isPlaying={session.isPlaying}
        />
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
