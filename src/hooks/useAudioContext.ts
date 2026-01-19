'use client';

import { useCallback } from 'react';

// Shared audio context singleton
let sharedAudioContext: AudioContext | null = null;

export function useAudioContext() {
  const getAudioContext = useCallback(() => {
    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContext();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }
    return sharedAudioContext;
  }, []);

  const getCurrentTime = useCallback(() => {
    return sharedAudioContext?.currentTime ?? 0;
  }, []);

  return { getAudioContext, getCurrentTime };
}
