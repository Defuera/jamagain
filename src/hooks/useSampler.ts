'use client';

import { useCallback, useRef, useState } from 'react';
import { Sample } from '@/lib/types';

interface ActivePlayback {
  sourceNode: AudioBufferSourceNode;
  gainNode: GainNode;
  originalVolume: number;
}

export function useSampler() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const activePlaybacksRef = useRef<Map<string, ActivePlayback>>(new Map());
  const isMutedRef = useRef(false);

  const [samples, setSamples] = useState<Sample[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setHasMicPermission(true);
      return true;
    } catch {
      setHasMicPermission(false);
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    if (!mediaStreamRef.current) {
      const granted = await requestMicPermission();
      if (!granted) return;
    }

    getAudioContext(); // Ensure audio context is initialized
    recordedChunksRef.current = [];

    const mediaRecorder = new MediaRecorder(mediaStreamRef.current!, {
      mimeType: 'audio/webm',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100); // Collect data every 100ms
    setIsRecording(true);
  }, [getAudioContext, requestMicPermission]);

  const stopRecording = useCallback(async (sourceMusician: number): Promise<Sample | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        const ctx = getAudioContext();
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

          const sample: Sample = {
            id: `sample-${sourceMusician}-${Date.now()}`,
            sourceMusician,
            audioBuffer,
            createdAt: Date.now(),
          };

          setSamples(prev => [...prev, sample]);
          resolve(sample);
        } catch {
          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, [getAudioContext]);

  const playSample = useCallback((
    sample: Sample,
    volume: number = 1.0,
    loop: boolean = true
  ): string => {
    const ctx = getAudioContext();

    // Stop any existing playback of this sample
    const existing = activePlaybacksRef.current.get(sample.id);
    if (existing) {
      existing.sourceNode.stop();
      existing.sourceNode.disconnect();
      existing.gainNode.disconnect();
    }

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = sample.audioBuffer;
    sourceNode.loop = loop;

    const gainNode = ctx.createGain();
    // If currently muted, set volume to 0 but track original
    gainNode.gain.value = isMutedRef.current ? 0 : volume;

    sourceNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    sourceNode.start();

    activePlaybacksRef.current.set(sample.id, { sourceNode, gainNode, originalVolume: volume });

    sourceNode.onended = () => {
      activePlaybacksRef.current.delete(sample.id);
    };

    return sample.id;
  }, [getAudioContext]);

  const stopSample = useCallback((sampleId: string): void => {
    const playback = activePlaybacksRef.current.get(sampleId);
    if (playback) {
      playback.sourceNode.stop();
      playback.sourceNode.disconnect();
      playback.gainNode.disconnect();
      activePlaybacksRef.current.delete(sampleId);
    }
  }, []);

  const setSampleVolume = useCallback((sampleId: string, volume: number): void => {
    const playback = activePlaybacksRef.current.get(sampleId);
    if (playback) {
      playback.originalVolume = volume;
      // Only apply if not muted
      if (!isMutedRef.current) {
        playback.gainNode.gain.setValueAtTime(volume, audioContextRef.current?.currentTime || 0);
      }
    }
  }, []);

  const muteAllSamples = useCallback((): void => {
    isMutedRef.current = true;
    const currentTime = audioContextRef.current?.currentTime || 0;
    activePlaybacksRef.current.forEach((playback) => {
      playback.gainNode.gain.setValueAtTime(0, currentTime);
    });
  }, []);

  const unmuteAllSamples = useCallback((): void => {
    isMutedRef.current = false;
    const currentTime = audioContextRef.current?.currentTime || 0;
    activePlaybacksRef.current.forEach((playback) => {
      playback.gainNode.gain.setValueAtTime(playback.originalVolume, currentTime);
    });
  }, []);

  const stopAllSamples = useCallback((): void => {
    activePlaybacksRef.current.forEach((playback) => {
      playback.sourceNode.stop();
      playback.sourceNode.disconnect();
      playback.gainNode.disconnect();
    });
    activePlaybacksRef.current.clear();
  }, []);

  const clearSamples = useCallback((): void => {
    stopAllSamples();
    setSamples([]);
  }, [stopAllSamples]);

  const getSampleForMusician = useCallback((musicianId: number): Sample | undefined => {
    return samples.find(s => s.sourceMusician === musicianId);
  }, [samples]);

  return {
    requestMicPermission,
    startRecording,
    stopRecording,
    playSample,
    stopSample,
    setSampleVolume,
    muteAllSamples,
    unmuteAllSamples,
    stopAllSamples,
    clearSamples,
    getSampleForMusician,
    samples,
    isRecording,
    hasMicPermission,
  };
}
