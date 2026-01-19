'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useMetronome } from './useMetronome';
import {
  Musician,
  MusicianState,
  SessionConfig,
  BEATS_PER_BAR,
  RECORDING_BARS,
} from '@/lib/types';

interface SessionState {
  isPlaying: boolean;
  isPaused: boolean;
  currentBeat: number;
  currentBar: number;
  currentPhase: number;
  musicianStates: Map<number, MusicianState>;
}

interface SamplingCallbacks {
  onStartRecording?: (musicianId: number) => void;
  onStopRecording?: (musicianId: number) => void;
  onVirtualPlayerSolo?: (musicianId: number) => void;
  onVirtualPlayerPlay?: (musicianId: number) => void;
}

export function useJamSession(
  config: SessionConfig,
  allMusicians: Musician[],
  samplingCallbacks?: SamplingCallbacks
) {
  const { bpm, samplingMode } = config;
  const realMusicians = config.musicians.filter(m => !m.isVirtual);
  const realMusicianCount = realMusicians.length;
  const totalMusicians = allMusicians.length;

  // Use ref for barsPerPhase so changes take effect immediately
  const barsPerPhaseRef = useRef(config.barsPerPhase);
  useEffect(() => {
    barsPerPhaseRef.current = config.barsPerPhase;
  }, [config.barsPerPhase]);

  // Track which musicians are currently recording
  const recordingMusicianRef = useRef<number | null>(null);

  // State now tracks musician states in a Map for easy merging
  const [state, setState] = useState<SessionState>(() => {
    const initialStates = new Map<number, MusicianState>();
    allMusicians.forEach(m => initialStates.set(m.id, 'inactive'));
    return {
      isPlaying: false,
      isPaused: false,
      currentBeat: 1,
      currentBar: 1,
      currentPhase: 1,
      musicianStates: initialStates,
    };
  });

  // Derive full musicians array by combining allMusicians with current states
  const musicians = useMemo(() => {
    return allMusicians.map(m => ({
      ...m,
      state: state.musicianStates.get(m.id) ?? 'inactive',
    }));
  }, [allMusicians, state.musicianStates]);

  // Calculate musician states based on current phase
  const calculateMusicianStates = useCallback(
    (bar: number, beat: number): Map<number, MusicianState> => {
      const barsPerPhase = barsPerPhaseRef.current;
      const beatsPerPhase = barsPerPhase * BEATS_PER_BAR;
      const totalBeats = (bar - 1) * BEATS_PER_BAR + beat;
      const currentPhase = Math.floor((totalBeats - 1) / beatsPerPhase) + 1;
      const beatsIntoPhase = ((totalBeats - 1) % beatsPerPhase) + 1;
      const barInPhase = Math.ceil(beatsIntoPhase / BEATS_PER_BAR);
      const isLastBarOfPhase = beatsIntoPhase > (barsPerPhase - 1) * BEATS_PER_BAR;

      // For sampling mode: recording starts at this bar within the phase
      const recordingStartBar = barsPerPhase - RECORDING_BARS + 1;
      // preparingToRecord is the bar before recording starts
      const prepareBar = recordingStartBar - 1;

      const newStates = new Map<number, MusicianState>();

      allMusicians.forEach((musician) => {
        const isVirtual = musician.isVirtual;
        let newState: MusicianState;

        if (isVirtual) {
          const virtualIndex = allMusicians.filter(m => !m.isVirtual).length;
          const virtualNumber = allMusicians.indexOf(musician) - virtualIndex + 1;
          const virtualEntryPhase = realMusicianCount + virtualNumber;

          if (currentPhase < virtualEntryPhase) {
            newState = currentPhase === virtualEntryPhase - 1 && isLastBarOfPhase
              ? 'starting' : 'inactive';
          } else if (currentPhase === virtualEntryPhase) {
            newState = 'playing';
          } else {
            const soloRotationPhase = currentPhase - totalMusicians;
            const soloistIndex = (soloRotationPhase - 1) % totalMusicians;
            const myIndex = allMusicians.indexOf(musician);

            if (myIndex === soloistIndex) {
              newState = 'soloing';
            } else {
              const nextSoloistIndex = soloRotationPhase % totalMusicians;
              newState = myIndex === nextSoloistIndex && isLastBarOfPhase
                ? 'starting' : 'playing';
            }
          }
        } else {
          const realIndex = realMusicians.findIndex(m => m.id === musician.id);
          const musicianNumber = realIndex + 1;

          if (currentPhase < musicianNumber) {
            newState = currentPhase === musicianNumber - 1 && isLastBarOfPhase
              ? 'starting' : 'inactive';
          } else if (currentPhase <= realMusicianCount) {
            if (currentPhase === musicianNumber) {
              // This musician's entry phase
              if (samplingMode) {
                // Sampling mode: warm-up -> prepare -> record -> play
                if (barInPhase < prepareBar) {
                  newState = 'playing'; // Warm-up
                } else if (barInPhase === prepareBar) {
                  newState = 'preparingToRecord'; // Warning: recording next bar
                } else if (barInPhase >= recordingStartBar) {
                  newState = 'recording'; // Recording for RECORDING_BARS
                } else {
                  newState = 'playing';
                }
              } else {
                newState = 'soloing';
              }
            } else {
              newState = 'playing';
            }
          } else if (samplingMode && currentPhase <= totalMusicians) {
            newState = 'playing';
          } else {
            const rotationStartPhase = samplingMode ? totalMusicians : realMusicianCount;
            const soloRotationPhase = currentPhase - rotationStartPhase;
            const soloistIndex = (soloRotationPhase - 1) % totalMusicians;
            const myIndex = allMusicians.indexOf(musician);

            if (myIndex === soloistIndex) {
              newState = 'soloing';
            } else {
              const nextSoloistIndex = soloRotationPhase % totalMusicians;
              newState = myIndex === nextSoloistIndex && isLastBarOfPhase
                ? 'starting' : 'playing';
            }
          }
        }

        newStates.set(musician.id, newState);
      });

      return newStates;
    },
    [allMusicians, realMusicians, realMusicianCount, totalMusicians, samplingMode]
  );

  // Handle beat from metronome
  const onBeat = useCallback(
    (beat: number, bar: number) => {
      const beatsPerPhase = barsPerPhaseRef.current * BEATS_PER_BAR;
      const totalBeats = (bar - 1) * BEATS_PER_BAR + beat;
      const currentPhase = Math.floor((totalBeats - 1) / beatsPerPhase) + 1;

      const newStates = calculateMusicianStates(bar, beat);

      // Handle recording state transitions for sampling mode
      if (samplingMode && samplingCallbacks) {
        allMusicians.forEach((musician) => {
          const prevState = state.musicianStates.get(musician.id);
          const newState = newStates.get(musician.id);

          if (newState === 'recording' && prevState !== 'recording') {
            recordingMusicianRef.current = musician.id;
            samplingCallbacks.onStartRecording?.(musician.id);
          }
          if (prevState === 'recording' && newState !== 'recording') {
            samplingCallbacks.onStopRecording?.(musician.id);
            recordingMusicianRef.current = null;
          }
          if (musician.isVirtual) {
            if (newState === 'soloing' && prevState !== 'soloing') {
              samplingCallbacks.onVirtualPlayerSolo?.(musician.id);
            }
            if (newState === 'playing' && prevState !== 'playing') {
              samplingCallbacks.onVirtualPlayerPlay?.(musician.id);
            }
          }
        });
      }

      setState((prev) => ({
        ...prev,
        currentBeat: beat,
        currentBar: bar,
        currentPhase,
        musicianStates: newStates,
      }));
    },
    [calculateMusicianStates, samplingMode, samplingCallbacks, allMusicians, state.musicianStates]
  );

  // Check if any musician is currently recording - mute metronome during recording
  const isRecording = useMemo(() => {
    for (const musicianState of state.musicianStates.values()) {
      if (musicianState === 'recording') return true;
    }
    return false;
  }, [state.musicianStates]);

  const metronome = useMetronome({ bpm, muted: isRecording, onBeat });

  const start = useCallback(() => {
    const initialStates = new Map<number, MusicianState>();
    const realOnly = allMusicians.filter(m => !m.isVirtual);

    // In sampling mode, first musician starts in "playing" (warm-up) mode
    // Recording will start later based on bar position
    realOnly.forEach((m, index) => {
      initialStates.set(m.id, index === 0
        ? (samplingMode ? 'playing' : 'soloing')
        : 'inactive'
      );
    });

    // Don't start recording immediately - it will be triggered by state transitions

    setState({
      isPlaying: true,
      isPaused: false,
      currentBeat: 1,
      currentBar: 1,
      currentPhase: 1,
      musicianStates: initialStates,
    });
    metronome.start();
  }, [allMusicians, samplingMode, metronome]);

  const stop = useCallback(() => {
    metronome.stop();
    if (recordingMusicianRef.current && samplingCallbacks?.onStopRecording) {
      samplingCallbacks.onStopRecording(recordingMusicianRef.current);
      recordingMusicianRef.current = null;
    }
    const inactiveStates = new Map<number, MusicianState>();
    allMusicians.forEach(m => inactiveStates.set(m.id, 'inactive'));
    setState({
      isPlaying: false,
      isPaused: false,
      currentBeat: 1,
      currentBar: 1,
      currentPhase: 1,
      musicianStates: inactiveStates,
    });
  }, [allMusicians, samplingCallbacks, metronome]);

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
    if (samplingMode) {
      if (currentPhase <= realMusicianCount) {
        return `Recording ${currentPhase}/${realMusicianCount}`;
      }
      if (currentPhase <= totalMusicians) {
        const virtualPhase = currentPhase - realMusicianCount;
        const virtualCount = totalMusicians - realMusicianCount;
        return `Adding Loop ${virtualPhase}/${virtualCount}`;
      }
      const soloRound = Math.floor((currentPhase - totalMusicians - 1) / totalMusicians) + 1;
      return `Solo Round ${soloRound}`;
    }
    if (currentPhase <= totalMusicians) {
      return `Entry Phase ${currentPhase}/${totalMusicians}`;
    }
    const soloRound = Math.floor((currentPhase - totalMusicians - 1) / totalMusicians) + 1;
    return `Solo Round ${soloRound}`;
  }, [currentPhase, totalMusicians, realMusicianCount, samplingMode]);

  return {
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    currentBeat: state.currentBeat,
    currentBar: state.currentBar,
    currentPhase: state.currentPhase,
    musicians,
    phaseInfo,
    start,
    stop,
    pause,
    resume,
    togglePlayPause,
    // Expose metronome timing for sample sync
    getNextBarStartTime: metronome.getNextBarStartTime,
    getSecondsPerBeat: metronome.getSecondsPerBeat,
    getAudioContext: metronome.getAudioContext,
  };
}
