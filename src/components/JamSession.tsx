'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { SessionConfig, Sample, MIN_BPM, MAX_BPM } from '@/lib/types';
import { useJamSession } from '@/hooks/useJamSession';
import { useAudioCues } from '@/hooks/useAudioCues';
import { useSampler } from '@/hooks/useSampler';
import { useVirtualPlayers } from '@/hooks/useVirtualPlayers';
import { JamCircle } from './JamCircle';

interface JamSessionProps {
  config: SessionConfig;
  onStop: () => void;
}

export function JamSession({ config: initialConfig, onStop }: JamSessionProps) {
  const [bpm, setBpm] = useState(initialConfig.bpm);
  const [barsPerPhase, setBarsPerPhase] = useState(initialConfig.barsPerPhase);
  const [audioCuesEnabled, setAudioCuesEnabled] = useState(true);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [recordedSamples, setRecordedSamples] = useState<Sample[]>([]);

  const config = useMemo(() => ({
    ...initialConfig,
    bpm,
    barsPerPhase,
  }), [initialConfig, bpm, barsPerPhase]);

  const realMusicianCount = initialConfig.musicians.length;
  const sampler = useSampler();
  const virtualPlayersHook = useVirtualPlayers(realMusicianCount);
  const { playGetReady, playStart } = useAudioCues();

  // Ref to store session timing functions (to avoid circular dependency)
  const sessionTimingRef = useRef<{
    getNextBarStartTime: () => number;
  } | null>(null);

  // Combine real musicians with virtual players
  const allMusicians = useMemo(() => {
    return [...initialConfig.musicians, ...virtualPlayersHook.virtualPlayers];
  }, [initialConfig.musicians, virtualPlayersHook.virtualPlayers]);

  // Sampling callbacks
  const samplingCallbacks = useMemo(() => ({
    onStartRecording: () => {
      if (config.samplingMode && micPermissionGranted) {
        sampler.startRecording();
      }
    },
    onStopRecording: async (musicianId: number) => {
      if (config.samplingMode) {
        const sample = await sampler.stopRecording(musicianId);
        if (sample) {
          setRecordedSamples(prev => [...prev, sample]);
          // Add virtual player after recording
          if (virtualPlayersHook.canAddMoreVirtualPlayers) {
            const vp = virtualPlayersHook.addVirtualPlayer(sample);
            if (vp) {
              // Schedule playback to start at next bar for sync
              const nextBarTime = sessionTimingRef.current?.getNextBarStartTime() ?? 0;
              sampler.playSample(sample, 0.5, true, nextBarTime);
            }
          }
        }
      }
    },
    onVirtualPlayerSolo: (musicianId: number) => {
      // Increase volume for soloing virtual player
      const vp = virtualPlayersHook.virtualPlayers.find(p => p.id === musicianId);
      if (vp?.sampleId) {
        sampler.setSampleVolume(vp.sampleId, 1.0);
      }
    },
    onVirtualPlayerPlay: (musicianId: number) => {
      // Normal volume for playing virtual player
      const vp = virtualPlayersHook.virtualPlayers.find(p => p.id === musicianId);
      if (vp?.sampleId) {
        sampler.setSampleVolume(vp.sampleId, 0.5);
      }
    },
  }), [config.samplingMode, micPermissionGranted, sampler, virtualPlayersHook]);

  const session = useJamSession(config, allMusicians, samplingCallbacks);

  // Update timing ref after session is created (in effect to avoid render-time ref access)
  useEffect(() => {
    sessionTimingRef.current = {
      getNextBarStartTime: session.getNextBarStartTime,
    };
  }, [session.getNextBarStartTime]);

  // Track previous states to detect transitions
  const prevStatesRef = useRef<Map<number, string>>(new Map());

  // Request mic permission when sampling mode is enabled
  useEffect(() => {
    if (config.samplingMode && !micPermissionGranted) {
      sampler.requestMicPermission().then(granted => {
        setMicPermissionGranted(granted);
      });
    }
  }, [config.samplingMode, micPermissionGranted, sampler]);

  // Check if any musician is currently recording - mute everything during recording
  const isAnyoneRecording = session.musicians.some(m => m.state === 'recording');

  // Mute/unmute sample playback during recording
  useEffect(() => {
    if (isAnyoneRecording) {
      sampler.muteAllSamples();
    } else {
      sampler.unmuteAllSamples();
    }
  }, [isAnyoneRecording, sampler]);

  // Stop sample playback when paused
  useEffect(() => {
    if (session.isPaused) {
      sampler.stopAllSamples();
    }
  }, [session.isPaused, sampler]);

  // Detect state transitions for audio cues
  useEffect(() => {
    if (!audioCuesEnabled || !session.isPlaying || session.isPaused) return;
    // Don't play audio cues while recording to keep the sample clean
    if (isAnyoneRecording) return;

    session.musicians.forEach((musician) => {
      const prevState = prevStatesRef.current.get(musician.id);
      const currentState = musician.state;

      if (prevState !== currentState) {
        if (currentState === 'starting') {
          playGetReady();
        } else if (currentState === 'preparingToRecord') {
          playGetReady(); // Warning that recording is coming
        } else if (currentState === 'soloing' && prevState === 'starting') {
          playStart();
        } else if (currentState === 'recording' && prevState === 'preparingToRecord') {
          // Don't play start cue when recording begins - we're now silent
        }
      }

      prevStatesRef.current.set(musician.id, currentState);
    });
  }, [session.musicians, session.isPlaying, session.isPaused, audioCuesEnabled, isAnyoneRecording, playGetReady, playStart]);

  const handleStop = () => {
    session.stop();
    sampler.stopAllSamples();
    sampler.clearSamples();
    virtualPlayersHook.clearVirtualPlayers();
    setRecordedSamples([]);
    onStop();
  };

  const handleRestart = () => {
    prevStatesRef.current.clear();
    session.stop();
    sampler.stopAllSamples();
    sampler.clearSamples();
    virtualPlayersHook.clearVirtualPlayers();
    setRecordedSamples([]);
    setTimeout(() => session.start(), 50);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 text-white overflow-hidden">
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
          <div className="text-blue-400 font-medium">{session.phaseInfo}</div>

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

          {/* Bars per phase control */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Bars</label>
            <button
              onClick={() => setBarsPerPhase(Math.max(1, barsPerPhase - 1))}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-sm"
            >
              −
            </button>
            <span className="text-sm w-8 text-center">{barsPerPhase}</span>
            <button
              onClick={() => setBarsPerPhase(Math.min(16, barsPerPhase + 1))}
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

            {config.samplingMode && (
              <span className="text-xs px-2 py-1 rounded bg-purple-600/50 text-purple-300">
                🎙 Sampling {recordedSamples.length}/{realMusicianCount}
              </span>
            )}
          </div>
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
