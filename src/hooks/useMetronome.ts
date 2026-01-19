'use client';

import { useCallback, useRef, useEffect } from 'react';
import { BEATS_PER_BAR } from '@/lib/types';
import { useAudioContext } from './useAudioContext';

interface MetronomeConfig {
  bpm: number;
  muted?: boolean;
  onBeat: (beat: number, bar: number) => void;
}

export function useMetronome({ bpm, muted = false, onBeat }: MetronomeConfig) {
  const { getAudioContext } = useAudioContext();
  const nextBeatTimeRef = useRef(0);
  const currentBeatRef = useRef(1);
  const currentBarRef = useRef(1);
  const timerIdRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  // Use refs to always have latest values in scheduler
  const bpmRef = useRef(bpm);
  const mutedRef = useRef(muted);
  const onBeatRef = useRef(onBeat);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    onBeatRef.current = onBeat;
  }, [onBeat]);

  // Play a clean click sound (like DAW metronomes)
  const playClick = useCallback((time: number, isAccent: boolean) => {
    const ctx = getAudioContext();
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Simple, clean sine pip
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = isAccent ? 880 : 660; // A5 for accent, E5 for regular
    osc.connect(gainNode);

    // Very short, punchy envelope
    const volume = isAccent ? 0.5 : 0.3;
    const duration = 0.03;

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration + 0.01);
  }, [getAudioContext]);

  // Schedule beats ahead of time for precision
  const scheduler = useCallback(() => {
    const ctx = getAudioContext();
    const secondsPerBeat = 60.0 / bpmRef.current;
    const scheduleAheadTime = 0.1; // Schedule 100ms ahead

    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const isAccent = currentBeatRef.current === 1;
      // Only play click if not muted
      if (!mutedRef.current) {
        playClick(nextBeatTimeRef.current, isAccent);
      }

      // Notify callback (always, even when muted - timing must continue)
      onBeatRef.current(currentBeatRef.current, currentBarRef.current);

      // Advance beat/bar counters
      currentBeatRef.current++;
      if (currentBeatRef.current > BEATS_PER_BAR) {
        currentBeatRef.current = 1;
        currentBarRef.current++;
      }

      nextBeatTimeRef.current += secondsPerBeat;
    }
  }, [playClick, getAudioContext]);

  const start = useCallback(() => {
    if (isPlayingRef.current) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    isPlayingRef.current = true;
    currentBeatRef.current = 1;
    currentBarRef.current = 1;
    nextBeatTimeRef.current = ctx.currentTime;

    // Run scheduler in a tight loop
    const tick = () => {
      if (!isPlayingRef.current) return;
      scheduler();
      timerIdRef.current = window.setTimeout(tick, 25) as unknown as number;
    };
    tick();
  }, [getAudioContext, scheduler]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (timerIdRef.current !== null) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    currentBeatRef.current = 1;
    currentBarRef.current = 1;
  }, []);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    if (timerIdRef.current !== null) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (isPlayingRef.current) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    isPlayingRef.current = true;
    nextBeatTimeRef.current = ctx.currentTime;

    const tick = () => {
      if (!isPlayingRef.current) return;
      scheduler();
      timerIdRef.current = window.setTimeout(tick, 25) as unknown as number;
    };
    tick();
  }, [getAudioContext, scheduler]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIdRef.current !== null) {
        clearTimeout(timerIdRef.current);
      }
      // Don't close shared audio context
    };
  }, []);

  // Get the time of the next bar start (beat 1)
  const getNextBarStartTime = useCallback(() => {
    const ctx = getAudioContext();
    const secondsPerBeat = 60.0 / bpmRef.current;
    const currentTime = ctx.currentTime;

    // Calculate beats until next bar
    let beatsUntilBar = BEATS_PER_BAR - currentBeatRef.current + 1;
    if (beatsUntilBar === BEATS_PER_BAR + 1) beatsUntilBar = 1; // We're at beat 1

    // Time of next bar = next scheduled beat + beats until bar start
    const timeUntilNextScheduledBeat = Math.max(0, nextBeatTimeRef.current - currentTime);
    const timeUntilBarStart = timeUntilNextScheduledBeat + (beatsUntilBar - 1) * secondsPerBeat;

    return currentTime + timeUntilBarStart;
  }, [getAudioContext]);

  // Get seconds per beat for loop duration calculation
  const getSecondsPerBeat = useCallback(() => {
    return 60.0 / bpmRef.current;
  }, []);

  return { start, stop, pause, resume, getNextBarStartTime, getSecondsPerBeat, getAudioContext };
}
