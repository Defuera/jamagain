'use client';

import { useCallback, useRef, useEffect } from 'react';
import { BEATS_PER_BAR } from '@/lib/types';

interface MetronomeConfig {
  bpm: number;
  onBeat: (beat: number, bar: number) => void;
}

export function useMetronome({ bpm, onBeat }: MetronomeConfig) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextBeatTimeRef = useRef(0);
  const currentBeatRef = useRef(1);
  const currentBarRef = useRef(1);
  const timerIdRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Play a wooden click sound (like a real metronome)
  const playClick = useCallback((time: number, isAccent: boolean) => {
    const ctx = getAudioContext();

    // Main tone - sine wave with pitch drop for woody click
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1800 : 1500, time);
    osc.frequency.exponentialRampToValueAtTime(isAccent ? 400 : 350, time + 0.02);

    filter.type = 'bandpass';
    filter.frequency.value = isAccent ? 1200 : 1000;
    filter.Q.value = 2;

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(ctx.destination);

    // Sharp attack, quick decay
    oscGain.gain.setValueAtTime(0, time);
    oscGain.gain.linearRampToValueAtTime(isAccent ? 0.4 : 0.25, time + 0.002);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.start(time);
    osc.stop(time + 0.1);

    // Click transient - short noise burst for attack
    const bufferSize = ctx.sampleRate * 0.015;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const noise = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    noise.buffer = noiseBuffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = isAccent ? 2000 : 2500;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseGain.gain.setValueAtTime(isAccent ? 0.15 : 0.08, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    noise.start(time);
  }, [getAudioContext]);

  // Schedule beats ahead of time for precision
  const scheduler = useCallback(() => {
    const ctx = getAudioContext();
    const secondsPerBeat = 60.0 / bpm;
    const scheduleAheadTime = 0.1; // Schedule 100ms ahead

    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const isAccent = currentBeatRef.current === 1;
      playClick(nextBeatTimeRef.current, isAccent);

      // Notify callback
      onBeat(currentBeatRef.current, currentBarRef.current);

      // Advance beat/bar counters
      currentBeatRef.current++;
      if (currentBeatRef.current > BEATS_PER_BAR) {
        currentBeatRef.current = 1;
        currentBarRef.current++;
      }

      nextBeatTimeRef.current += secondsPerBeat;
    }
  }, [bpm, onBeat, playClick, getAudioContext]);

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
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { start, stop, pause, resume };
}
