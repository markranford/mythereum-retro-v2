import { useEffect, useRef } from 'react';
import { ScrollArea } from '../ui/scroll-area';

interface BattleLogProps {
  messages: Array<{ message: string; category: 'upkeep' | 'action' | 'combat' | 'system' }>;
}

/**
 * BattleLog - Pure presentational component with no hooks except for scroll management.
 * No state, no effects that trigger state changes, just displays messages.
 */
export default function BattleLog({ messages }: BattleLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only effect: auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'system':
        return 'text-amber-300'; // Gold for system messages
      case 'combat':
        return 'text-red-400'; // Crimson for combat
      case 'action':
        return 'text-blue-400'; // Blue for magick/actions
      case 'upkeep':
        return 'text-gray-400'; // Grey for upkeep
      default:
        return 'text-amber-100';
    }
  };

  return (
    <div 
      className="bg-gradient-to-b from-amber-950/90 to-amber-900/80 border-2 border-amber-600/50 rounded-lg p-4 h-64"
      style={{
        backgroundImage: 'url(/assets/generated/button-texture.dim_200x50.png)',
        backgroundSize: 'cover',
        backgroundBlendMode: 'overlay',
      }}
    >
      <h3 className="text-amber-300 font-bold text-lg mb-3 border-b border-amber-600/40 pb-2">Battle Chronicle</h3>
      <ScrollArea className="h-48">
        <div ref={scrollRef} className="space-y-1 pr-4">
          {messages.map((entry, index) => (
            <div
              key={index}
              className={`text-sm font-medium leading-relaxed ${getCategoryColor(entry.category)}`}
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
            >
              {entry.message}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-amber-400/60 text-sm italic">The battle begins...</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
