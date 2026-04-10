'use client';
import { Users, Swords, Bell } from 'lucide-react';
import { Player } from '@/lib/types';
import { CLAN_COLORS, WORLD_COLORS } from '@/lib/types';

interface NavbarProps {
  player: Player | null;
  onSetupProfile: () => void;
  activeQueueCount: number;
}

export function Navbar({ player, onSetupProfile, activeQueueCount }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-poke-dark-border bg-poke-dark/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-poke-red rounded-lg flex items-center justify-center glow-red">
            <Swords className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-base leading-none">Poke</span>
            <span className="font-bold text-poke-red text-base leading-none ml-1">Party Finder</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          {activeQueueCount > 0 && (
            <div className="flex items-center gap-1.5 badge bg-poke-gold/10 text-poke-gold border-poke-gold/20 animate-pulse-slow">
              <div className="w-1.5 h-1.5 rounded-full bg-poke-gold" />
              In queue ({activeQueueCount})
            </div>
          )}

          {player ? (
            <button
              onClick={onSetupProfile}
              className="flex items-center gap-2.5 bg-poke-dark-card border border-poke-dark-border hover:border-poke-red/40 rounded-lg px-3 py-1.5 transition-colors group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white leading-none">{player.characterName}</p>
                <p className="text-xs text-gray-500 leading-none mt-0.5">Lv {player.level}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className={`badge ${WORLD_COLORS[player.world]}`}>{player.world}</span>
                {player.clan !== 'None' && (
                  <span className={`badge ${CLAN_COLORS[player.clan]}`}>{player.clan}</span>
                )}
              </div>
            </button>
          ) : (
            <button onClick={onSetupProfile} className="btn-primary text-sm">
              <Users className="w-4 h-4 inline mr-1.5" />
              Set Profile
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
