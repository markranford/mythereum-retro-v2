// Core card data interface with optional progression fields and battle-related fields
export interface CardData {
  id: string;
  name: string;
  power: number;
  cardType: string;
  description?: string;
  level?: number;
  xp?: number;
  edition?: string;
  rarity?: string;
  class?: string;
  tags?: string[];
  // Battle-related fields
  attack?: number;
  defense?: number;
  cost?: number;
  manaRequirement?: MagickCost;
}

export interface MagickCost {
  mana: number;
  magick?: number;
}

export type TimerOption = 'none' | 'fast' | 'normal' | 'slow';
