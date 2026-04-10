'use client';
import { useState } from 'react';
import { X, User } from 'lucide-react';
import { PlayerProfile } from '@/hooks/usePlayer';
import { World, Clan, WORLDS, CLANS } from '@/lib/types';

interface PlayerSetupProps {
  initialProfile: PlayerProfile | null;
  onSave: (profile: PlayerProfile) => void;
  onClose: () => void;
}

export function PlayerSetup({ initialProfile, onSave, onClose }: PlayerSetupProps) {
  const [form, setForm] = useState<PlayerProfile>(
    initialProfile ?? {
      characterName: '',
      world: 'Gold',
      level: 100,
      clan: 'None',
    }
  );

  const valid = form.characterName.trim().length >= 2 && form.level >= 1 && form.level <= 9999;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onSave({ ...form, characterName: form.characterName.trim() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-poke-dark-card border border-poke-dark-border rounded-2xl p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-poke-red" />
            <h2 className="text-lg font-bold text-white">
              {initialProfile ? 'Edit Profile' : 'Set Up Your Profile'}
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Character Name
            </label>
            <input
              className="input"
              placeholder="Your in-game character name"
              value={form.characterName}
              onChange={(e) => setForm((p) => ({ ...p, characterName: e.target.value }))}
              maxLength={32}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Level
              </label>
              <input
                type="number"
                className="input"
                min={1}
                max={9999}
                value={form.level}
                onChange={(e) => setForm((p) => ({ ...p, level: parseInt(e.target.value) || 1 }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                World
              </label>
              <select
                className="select"
                value={form.world}
                onChange={(e) => setForm((p) => ({ ...p, world: e.target.value as World }))}
              >
                {WORLDS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Clan
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CLANS.map((clan) => (
                <button
                  key={clan}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, clan: clan as Clan }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.clan === clan
                      ? 'bg-poke-red border-poke-red text-white'
                      : 'border-poke-dark-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {clan}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={!valid} className="btn-primary flex-1">
              {initialProfile ? 'Save Changes' : 'Start Playing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
