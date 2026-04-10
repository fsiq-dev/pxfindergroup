'use client';
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Quest, World, Clan, WORLDS, CLANS } from '@/lib/types';

interface CreateRoomModalProps {
  quest: Quest;
  playerLevel: number;
  onConfirm: (questId: string, filters: { minLevel: number; world?: World; clan?: Clan }) => void;
  onClose: () => void;
}

export function CreateRoomModal({ quest, playerLevel, onConfirm, onClose }: CreateRoomModalProps) {
  const [minLevel, setMinLevel] = useState(quest.minLevel);
  const [world, setWorld] = useState<World | ''>('');
  const [clan, setClan] = useState<Clan | ''>('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(quest.id, {
      minLevel,
      world: world || undefined,
      clan: clan || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-pxg-dark-card border border-pxg-dark-border rounded-2xl p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-pxg-red" />
            <h2 className="text-lg font-bold text-white">Create Room</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-5">
          Creating a room for <span className="text-white font-medium">{quest.name}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Minimum Level <span className="text-gray-600">(quest requires {quest.minLevel}+)</span>
            </label>
            <input
              type="number"
              className="input"
              min={quest.minLevel}
              max={9999}
              value={minLevel}
              onChange={(e) => setMinLevel(parseInt(e.target.value) || quest.minLevel)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              World Filter <span className="text-gray-600">(optional — any world if unset)</span>
            </label>
            <select
              className="select"
              value={world}
              onChange={(e) => setWorld(e.target.value as World | '')}
            >
              <option value="">Any World</option>
              {WORLDS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Clan Filter <span className="text-gray-600">(optional)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['', ...CLANS] as (Clan | '')[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClan(c)}
                  className={`px-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                    clan === c
                      ? 'bg-pxg-red border-pxg-red text-white'
                      : 'border-pxg-dark-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {c || 'Any'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
