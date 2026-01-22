'use client';

import { useState, useCallback } from 'react';
import { SoloLoop, Sample, MUSICIAN_COLORS } from '@/lib/types';

export function useSoloLoops() {
  const [loops, setLoops] = useState<SoloLoop[]>([]);

  const addLoop = useCallback((sample: Sample): SoloLoop => {
    const colorIndex = loops.length % MUSICIAN_COLORS.length;
    const newLoop: SoloLoop = {
      id: `loop-${Date.now()}`,
      color: MUSICIAN_COLORS[colorIndex],
      sampleId: sample.id,
      isPlaying: true,
    };
    setLoops(prev => [...prev, newLoop]);
    return newLoop;
  }, [loops.length]);

  const addLoopWithId = useCallback((id: string, color: string, sampleId: string, isPlaying: boolean): SoloLoop => {
    const newLoop: SoloLoop = { id, color, sampleId, isPlaying };
    setLoops(prev => [...prev, newLoop]);
    return newLoop;
  }, []);

  const toggleLoop = useCallback((loopId: string) => {
    setLoops(prev => prev.map(loop =>
      loop.id === loopId
        ? { ...loop, isPlaying: !loop.isPlaying }
        : loop
    ));
  }, []);

  const removeLoop = useCallback((loopId: string) => {
    setLoops(prev => prev.filter(loop => loop.id !== loopId));
  }, []);

  const clearLoops = useCallback(() => {
    setLoops([]);
  }, []);

  const getLoop = useCallback((loopId: string): SoloLoop | undefined => {
    return loops.find(loop => loop.id === loopId);
  }, [loops]);

  const getLoopBySampleId = useCallback((sampleId: string): SoloLoop | undefined => {
    return loops.find(loop => loop.sampleId === sampleId);
  }, [loops]);

  return {
    loops,
    addLoop,
    addLoopWithId,
    toggleLoop,
    removeLoop,
    clearLoops,
    getLoop,
    getLoopBySampleId,
  };
}
