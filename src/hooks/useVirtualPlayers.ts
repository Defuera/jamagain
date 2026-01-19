'use client';

import { useCallback, useState } from 'react';
import { Musician, Sample, MUSICIAN_COLORS, VIRTUAL_PLAYERS_COUNT } from '@/lib/types';

interface VirtualPlayer extends Musician {
  isVirtual: true;
  sampleId: string;
}

export function useVirtualPlayers(realMusicianCount: number) {
  const [virtualPlayers, setVirtualPlayers] = useState<VirtualPlayer[]>([]);

  const createVirtualPlayer = useCallback((
    sample: Sample,
    index: number
  ): VirtualPlayer => {
    // Virtual players get IDs starting after real musicians
    const virtualId = realMusicianCount + index + 1;
    // Use colors from the end of the palette to distinguish from real players
    const colorIndex = (MUSICIAN_COLORS.length - 1 - index) % MUSICIAN_COLORS.length;

    return {
      id: virtualId,
      name: `Loop ${index + 1}`,
      color: MUSICIAN_COLORS[colorIndex],
      state: 'inactive',
      isVirtual: true,
      sampleId: sample.id,
    };
  }, [realMusicianCount]);

  const addVirtualPlayer = useCallback((sample: Sample): VirtualPlayer | null => {
    if (virtualPlayers.length >= VIRTUAL_PLAYERS_COUNT) {
      return null;
    }

    const newVirtualPlayer = createVirtualPlayer(sample, virtualPlayers.length);
    setVirtualPlayers(prev => [...prev, newVirtualPlayer]);
    return newVirtualPlayer;
  }, [virtualPlayers.length, createVirtualPlayer]);

  const removeVirtualPlayer = useCallback((virtualPlayerId: number): void => {
    setVirtualPlayers(prev => prev.filter(vp => vp.id !== virtualPlayerId));
  }, []);

  const updateVirtualPlayerState = useCallback((
    virtualPlayerId: number,
    state: Musician['state']
  ): void => {
    setVirtualPlayers(prev =>
      prev.map(vp =>
        vp.id === virtualPlayerId ? { ...vp, state } : vp
      )
    );
  }, []);

  const updateAllVirtualPlayerStates = useCallback((
    updater: (vp: VirtualPlayer) => Musician['state']
  ): void => {
    setVirtualPlayers(prev =>
      prev.map(vp => ({ ...vp, state: updater(vp) }))
    );
  }, []);

  const clearVirtualPlayers = useCallback((): void => {
    setVirtualPlayers([]);
  }, []);

  const getVirtualPlayerBySampleId = useCallback((sampleId: string): VirtualPlayer | undefined => {
    return virtualPlayers.find(vp => vp.sampleId === sampleId);
  }, [virtualPlayers]);

  const canAddMoreVirtualPlayers = virtualPlayers.length < VIRTUAL_PLAYERS_COUNT;

  return {
    virtualPlayers,
    addVirtualPlayer,
    removeVirtualPlayer,
    updateVirtualPlayerState,
    updateAllVirtualPlayerStates,
    clearVirtualPlayers,
    getVirtualPlayerBySampleId,
    canAddMoreVirtualPlayers,
    setVirtualPlayers,
  };
}
