'use client';
import { useState, useCallback, useEffect } from 'react';
import { Player, World, Clan } from '@/lib/types';

const PROFILE_KEY = 'poke_player_profile';
const SESSION_KEY = 'poke_player_session';

export interface PlayerProfile {
  characterName: string;
  world: World;
  level: number;
  clan: Clan;
}

export function usePlayer() {
  const [profile, setProfileState] = useState<PlayerProfile | null>(null);
  const [player, setPlayerState] = useState<Player | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem(PROFILE_KEY);
      if (storedProfile) {
        setProfileState(JSON.parse(storedProfile) as PlayerProfile);
      }
      const storedPlayer = localStorage.getItem(SESSION_KEY);
      if (storedPlayer) {
        setPlayerState(JSON.parse(storedPlayer) as Player);
      }
    } catch {
      // ignore
    }
  }, []);

  const setPlayer = useCallback((p: Player) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(p));
    setPlayerState(p);
  }, []);

  const saveProfile = useCallback((p: PlayerProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfileState(p);
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(SESSION_KEY);
    setProfileState(null);
    setPlayerState(null);
  }, []);

  return { profile, player, setPlayer, saveProfile, clearProfile };
}
