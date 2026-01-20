'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMetronome } from './useMetronome';
import { SoloRecordingState, RECORDING_BARS } from '@/lib/types';

interface SoloSessionConfig {
  bpm: number;
}

interface RecordingCallbacks {
  onStartRecording: () => void;
  onStopRecording: () => Promise<void>;
}

export function useSoloSession(config: SoloSessionConfig, callbacks: RecordingCallbacks) {
  const bpmRef = useRef(config.bpm);
  useEffect(() => {
    bpmRef.current = config.bpm;
  }, [config.bpm]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [currentBar, setCurrentBar] = useState(1);
  const [recordingState, setRecordingState] = useState<SoloRecordingState>('idle');

  // Track bar at which recording flow started
  const recordingStartBarRef = useRef<number | null>(null);
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const onBeat = useCallback((beat: number, bar: number) => {
    setCurrentBeat(beat);
    setCurrentBar(bar);

    // Only process state transitions on beat 1 of a new bar
    if (beat !== 1) return;

    // Check if we're in a recording flow
    if (recordingStartBarRef.current !== null) {
      const barsIntoRecording = bar - recordingStartBarRef.current;

      // Bar 0: warmup
      // Bar 1: ready
      // Bar 2-3: recording (RECORDING_BARS = 2)
      if (barsIntoRecording === 0) {
        setRecordingState('warmup');
      } else if (barsIntoRecording === 1) {
        setRecordingState('ready');
      } else if (barsIntoRecording === 2) {
        setRecordingState('recording');
        callbacksRef.current.onStartRecording();
      } else if (barsIntoRecording === 2 + RECORDING_BARS) {
        // Recording complete
        setRecordingState('idle');
        recordingStartBarRef.current = null;
        callbacksRef.current.onStopRecording();
      }
    }
  }, []);

  // Mute metronome during recording
  const isRecording = recordingState === 'recording';
  const metronome = useMetronome({ bpm: config.bpm, muted: isRecording, onBeat });

  const start = useCallback(() => {
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentBeat(1);
    setCurrentBar(1);
    setRecordingState('idle');
    recordingStartBarRef.current = null;
    metronome.start();
  }, [metronome]);

  const stop = useCallback(() => {
    metronome.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentBeat(1);
    setCurrentBar(1);
    setRecordingState('idle');
    recordingStartBarRef.current = null;
  }, [metronome]);

  const pause = useCallback(() => {
    metronome.pause();
    setIsPaused(true);
    // Cancel any recording in progress
    if (recordingState !== 'idle') {
      setRecordingState('idle');
      recordingStartBarRef.current = null;
    }
  }, [metronome, recordingState]);

  const resume = useCallback(() => {
    metronome.resume();
    setIsPaused(false);
  }, [metronome]);

  const togglePlayPause = useCallback(() => {
    if (!isPlaying) {
      start();
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  }, [isPlaying, isPaused, start, pause, resume]);

  // Start recording flow - will begin at next bar (or current bar if immediate=true)
  const startRecordingFlow = useCallback((immediate: boolean = false) => {
    if (recordingState !== 'idle' || !isPlaying || isPaused) return;
    // Recording flow will start at current bar (immediate) or next bar
    recordingStartBarRef.current = immediate ? currentBar : currentBar + 1;
    setRecordingState('warmup');
  }, [recordingState, isPlaying, isPaused, currentBar]);

  // Cancel recording flow
  const cancelRecording = useCallback(() => {
    setRecordingState('idle');
    recordingStartBarRef.current = null;
  }, []);

  return {
    isPlaying,
    isPaused,
    currentBeat,
    currentBar,
    recordingState,
    start,
    stop,
    pause,
    resume,
    togglePlayPause,
    startRecordingFlow,
    cancelRecording,
    getNextBarStartTime: metronome.getNextBarStartTime,
    getSecondsPerBeat: metronome.getSecondsPerBeat,
    getAudioContext: metronome.getAudioContext,
  };
}
