'use client';

import { useState, useCallback, useMemo } from 'react';
import { useMetronome } from './useMetronome';
import {
  Musician,
  MusicianState,
  SessionConfig,
  BEATS_PER_BAR,
} from '@/lib/types';

interface JamSessionState {
  isPlaying: boolean;
  isPaused: boolean;
  currentBeat: number;
  currentBar: number;
  currentPhase: number;
  musicians: Musician[];
}

export function useJamSession(config: SessionConfig) {
  const { bpm, barsPerPhase } = config;
  const totalMusicians = config.musicians.length;

  const [state, setState] = useState<JamSessionState>({
    isPlaying: false,
    isPaused: false,
    currentBeat: 1,
    currentBar: 1,
    currentPhase: 1,
    musicians: config.musicians.map((m) => ({ ...m, state: 'inactive' as MusicianState })),
  });

  // Calculate musician states based on current phase
  const calculateMusicianStates = useCallback(
    (bar: number, beat: number): Musician[] => {
      const beatsPerPhase = barsPerPhase * BEATS_PER_BAR;
      const totalBeats = (bar - 1) * BEATS_PER_BAR + beat;
      const currentPhase = Math.floor((totalBeats - 1) / beatsPerPhase) + 1;

      // Calculate if we're in the last bar of a phase (warning for next musician)
      const beatsIntoPhase = ((totalBeats - 1) % beatsPerPhase) + 1;
      const isLastBarOfPhase = beatsIntoPhase > (barsPerPhase - 1) * BEATS_PER_BAR;

      return config.musicians.map((musician, index) => {
        const musicianNumber = index + 1;
        let newState: MusicianState;

        if (currentPhase < musicianNumber) {
          // Not yet joined
          if (currentPhase === musicianNumber - 1 && isLastBarOfPhase) {
            // About to join next phase
            newState = 'starting';
          } else {
            newState = 'inactive';
          }
        } else if (currentPhase <= totalMusicians) {
          // Entry phase - the musician whose phase it is gets to solo
          if (currentPhase === musicianNumber) {
            newState = 'soloing';
          } else {
            newState = 'playing';
          }
        } else {
          // Solo rotation phase (everyone has joined)
          const soloRotationPhase = currentPhase - totalMusicians;
          const soloistIndex = (soloRotationPhase - 1) % totalMusicians;

          if (index === soloistIndex) {
            newState = 'soloing';
          } else {
            // Check if this musician is about to solo
            const nextSoloistIndex = soloRotationPhase % totalMusicians;
            if (index === nextSoloistIndex && isLastBarOfPhase) {
              newState = 'starting'; // About to solo
            } else {
              newState = 'playing';
            }
          }
        }

        return { ...musician, state: newState };
      });
    },
    [config.musicians, barsPerPhase, totalMusicians]
  );

  // Handle beat from metronome
  const onBeat = useCallback(
    (beat: number, bar: number) => {
      const beatsPerPhase = barsPerPhase * BEATS_PER_BAR;
      const totalBeats = (bar - 1) * BEATS_PER_BAR + beat;
      const currentPhase = Math.floor((totalBeats - 1) / beatsPerPhase) + 1;

      const updatedMusicians = calculateMusicianStates(bar, beat);

      setState((prev) => ({
        ...prev,
        currentBeat: beat,
        currentBar: bar,
        currentPhase,
        musicians: updatedMusicians,
      }));
    },
    [barsPerPhase, calculateMusicianStates]
  );

  const metronome = useMetronome({ bpm, onBeat });

  const start = useCallback(() => {
    // Reset musicians to initial state with first one soloing
    const initialMusicians = config.musicians.map((m, index) => ({
      ...m,
      state: (index === 0 ? 'soloing' : 'inactive') as MusicianState,
    }));

    setState({
      isPlaying: true,
      isPaused: false,
      currentBeat: 1,
      currentBar: 1,
      currentPhase: 1,
      musicians: initialMusicians,
    });
    metronome.start();
  }, [config.musicians, metronome]);

  const stop = useCallback(() => {
    metronome.stop();
    setState({
      isPlaying: false,
      isPaused: false,
      currentBeat: 1,
      currentBar: 1,
      currentPhase: 1,
      musicians: config.musicians.map((m) => ({ ...m, state: 'inactive' as MusicianState })),
    });
  }, [config.musicians, metronome]);

  const pause = useCallback(() => {
    metronome.pause();
    setState((prev) => ({ ...prev, isPaused: true }));
  }, [metronome]);

  const resume = useCallback(() => {
    metronome.resume();
    setState((prev) => ({ ...prev, isPaused: false }));
  }, [metronome]);

  const togglePlayPause = useCallback(() => {
    if (!state.isPlaying) {
      start();
    } else if (state.isPaused) {
      resume();
    } else {
      pause();
    }
  }, [state.isPlaying, state.isPaused, start, pause, resume]);

  // Calculate phase info for display
  const { currentPhase } = state;
  const phaseInfo = useMemo(() => {
    if (currentPhase <= totalMusicians) {
      return `Entry Phase ${currentPhase}/${totalMusicians}`;
    }
    const soloRound = Math.floor((currentPhase - totalMusicians - 1) / totalMusicians) + 1;
    return `Solo Round ${soloRound}`;
  }, [currentPhase, totalMusicians]);

  return {
    ...state,
    phaseInfo,
    start,
    stop,
    pause,
    resume,
    togglePlayPause,
  };
}
