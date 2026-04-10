'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, Crown } from 'lucide-react';
import { ChatMessage, Room } from '@/lib/types';

interface ChatProps {
  room: Room;
  messages: ChatMessage[];
  currentPlayerId: string;
  onSendMessage: (content: string) => void;
  onFocus?: () => void;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Chat({ room, messages, currentPlayerId, onSendMessage, onFocus }: ChatProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);


  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput('');
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Members sidebar */}
      <div className="border-b border-poke-dark-border p-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Members ({room.members.length}/{room.maxPlayers})
        </p>
        <div className="flex flex-col gap-1.5">
          {room.members.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                member.id === currentPlayerId ? 'bg-poke-red/10' : ''
              }`}
            >
              {member.id === room.leader.id && (
                <Crown className="w-3 h-3 text-poke-gold shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {member.characterName}
                  {member.id === currentPlayerId && (
                    <span className="text-poke-red ml-1">(you)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  Lv {member.level} · {member.world} · {member.clan}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col-reverse gap-2 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-600 text-sm">
            <p>No messages yet.</p>
            <p className="text-xs mt-1">Say hi to your party!</p>
          </div>
        ) : (
          [...messages].reverse().map((msg) => {
            const isMine = msg.playerId === currentPlayerId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                {!isMine && (
                  <span className="text-xs text-gray-500 mb-0.5 px-1">{msg.playerName}</span>
                )}
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-poke-red text-white rounded-tr-sm'
                      : 'bg-poke-dark-hover text-gray-100 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-gray-600 mt-0.5 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-poke-dark-border p-3 flex gap-2">
        <input
          ref={inputRef}
          className="input flex-1 text-sm"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={onFocus}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="btn-primary px-3 py-2"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
