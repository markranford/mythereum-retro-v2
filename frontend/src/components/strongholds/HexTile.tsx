import React from 'react';
import { Building, BuildingTemplate, ZoneType } from '../../types/strongholds';
import { Castle, Coins, Mountain, Trees, Pickaxe, Wheat, Eye, Swords, Sparkles } from 'lucide-react';

interface HexTileProps {
  positionIndex: number;
  zone: ZoneType;
  building?: Building & { templateId: string };
  template?: BuildingTemplate;
  isSelected?: boolean;
  isMoveTarget?: boolean;
  isEmpty?: boolean;
  onClick?: () => void;
  x: number;
  y: number;
}

const BUILDING_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  goldMine: Coins,
  stoneQuarry: Mountain,
  lumberYard: Trees,
  ironMine: Pickaxe,
  farmstead: Wheat,
  watchtower: Eye,
  barracks: Swords,
  townHall: Castle,
  alchemistLab: Sparkles,
};

export default function HexTile({
  positionIndex,
  zone,
  building,
  template,
  isSelected,
  isMoveTarget,
  isEmpty,
  onClick,
  x,
  y,
}: HexTileProps) {
  const Icon = template ? BUILDING_ICONS[template.id] || Castle : Castle;

  return (
    <div
      onClick={onClick}
      className={`
        absolute cursor-pointer transition-all duration-300
        ${isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'}
        ${isMoveTarget ? 'animate-glow' : ''}
      `}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className={`
          relative w-24 h-24 flex flex-col items-center justify-center
          transition-all duration-300
          ${isEmpty ? 'bg-transparent border-2 border-retro-goldGlow/20' : 'bg-transparent border-2 border-retro-goldGlow/50'}
          ${isSelected ? '!border-retro-moltenGold shadow-golden-glow-lg' : ''}
          ${isMoveTarget ? 'border-retro-moltenGold shadow-golden-glow-lg animate-pulse' : ''}
          ${!isEmpty && !isSelected && !isMoveTarget ? 'hover:border-retro-goldGlow hover:shadow-golden-glow' : ''}
        `}
        style={{
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
          filter: isEmpty ? 'none' : 'drop-shadow(0 0 6px rgba(255, 200, 50, 0.4))',
        }}
      >
        {/* Hover inner glow effect */}
        {!isEmpty && (
          <div 
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
              boxShadow: 'inset 0 0 12px #ffd700',
            }}
          />
        )}

        {!isEmpty && template && (
          <>
            <Icon className="w-7 h-7 text-retro-goldGlow mb-1 animate-shimmer" />
            <div className="text-[9px] text-amber-200/95 text-center font-bold leading-tight px-1 drop-shadow-md">
              {template.name.split(' ')[0]}
            </div>
            {building && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-retro-moltenGold border-2 border-retro-shadow flex items-center justify-center shadow-md">
                <span className="text-[11px] font-bold text-retro-shadow">{building.level}</span>
              </div>
            )}
            {building?.upgrading && (
              <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-blue-500 border-2 border-retro-shadow animate-pulse shadow-md" />
            )}
          </>
        )}
        {isEmpty && (
          <div className="text-retro-goldGlow/20 text-xs font-semibold">Empty</div>
        )}
      </div>
    </div>
  );
}

