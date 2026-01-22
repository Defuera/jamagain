'use client';

import { useCallback } from 'react';
import { SoloLoop } from '@/lib/types';

const DB_NAME = 'jam-solo-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

export interface SavedSoloSession {
  id: string;
  name: string;
  bpm: number;
  musicianName: string;
  loops: SavedLoop[];
  savedAt: number;
}

interface SavedLoop {
  id: string;
  color: string;
  isPlaying: boolean;
  audioData: ArrayBuffer;
  sampleRate: number;
  numberOfChannels: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function audioBufferToArrayBuffer(audioBuffer: AudioBuffer): Promise<ArrayBuffer> {
  // Interleave channels into a single ArrayBuffer
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const result = new Float32Array(length * numberOfChannels);

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      result[i * numberOfChannels + channel] = channelData[i];
    }
  }

  return result.buffer;
}

async function arrayBufferToAudioBuffer(
  arrayBuffer: ArrayBuffer,
  sampleRate: number,
  numberOfChannels: number,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const float32Array = new Float32Array(arrayBuffer);
  const length = float32Array.length / numberOfChannels;
  const audioBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      channelData[i] = float32Array[i * numberOfChannels + channel];
    }
  }

  return audioBuffer;
}

export function useSoloStorage() {
  const saveSession = useCallback(async (
    bpm: number,
    musicianName: string,
    loops: SoloLoop[],
    getSampleBuffer: (sampleId: string) => AudioBuffer | undefined
  ): Promise<string> => {
    const db = await openDB();

    const savedLoops: SavedLoop[] = [];
    for (const loop of loops) {
      const audioBuffer = getSampleBuffer(loop.sampleId);
      if (audioBuffer) {
        const audioData = await audioBufferToArrayBuffer(audioBuffer);
        savedLoops.push({
          id: loop.id,
          color: loop.color,
          isPlaying: loop.isPlaying,
          audioData,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
        });
      }
    }

    const session: SavedSoloSession = {
      id: `solo-${Date.now()}`,
      name: `${musicianName}'s Session`,
      bpm,
      musicianName,
      loops: savedLoops,
      savedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(session.id);
    });
  }, []);

  const loadSession = useCallback(async (
    sessionId: string,
    audioContext: AudioContext
  ): Promise<{ session: SavedSoloSession; audioBuffers: Map<string, AudioBuffer> } | null> => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const session = request.result as SavedSoloSession | undefined;
        if (!session) {
          resolve(null);
          return;
        }

        const audioBuffers = new Map<string, AudioBuffer>();
        for (const loop of session.loops) {
          const audioBuffer = await arrayBufferToAudioBuffer(
            loop.audioData,
            loop.sampleRate,
            loop.numberOfChannels,
            audioContext
          );
          audioBuffers.set(loop.id, audioBuffer);
        }

        resolve({ session, audioBuffers });
      };
    });
  }, []);

  const getAllSessions = useCallback(async (): Promise<SavedSoloSession[]> => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const sessions = request.result as SavedSoloSession[];
        // Sort by most recently saved first
        sessions.sort((a, b) => b.savedAt - a.savedAt);
        resolve(sessions);
      };
    });
  }, []);

  const getLatestSession = useCallback(async (): Promise<SavedSoloSession | null> => {
    const sessions = await getAllSessions();
    if (sessions.length === 0) return null;
    return sessions[0];
  }, [getAllSessions]);

  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }, []);

  const hasSavedSession = useCallback(async (): Promise<boolean> => {
    const session = await getLatestSession();
    return session !== null;
  }, [getLatestSession]);

  return {
    saveSession,
    loadSession,
    getAllSessions,
    getLatestSession,
    deleteSession,
    hasSavedSession,
  };
}
