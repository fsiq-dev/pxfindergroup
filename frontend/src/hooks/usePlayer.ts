'use client';
import { useState, useCallback, useEffect } from 'react';
import { Player, World, Clan } from '@/lib/types';

const STORAGE_KEY = 'pxg_player_profile';

export interface PlayerProfile {
  characterName: string;
  world: World;
  level: number;
  clan: Clan;
}

export function usePlayer() {
  const [profile, setProfileState] = useState<PlayerProfile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProfileState(JSON.parse(stored) as PlayerProfile);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveProfile = useCallback((p: PlayerProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setProfileState(p);
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfileState(null);
    setPlayer(null);
  }, []);

  return { profile, player, setPlayer, saveProfile, clearProfile };
}
