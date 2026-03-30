// Core card data interface with original Mythereum combat fields
// Supports: Leader system, Magick generation, Activated abilities, Editions

/** Three magick colors from original Mythereum */
export type MagickColor = 'white' | 'black' | 'grey';

/** Magick cost to activate an ability — each color has a required amount */
export interface MagickCost {
  white?: number;
  black?: number;
  grey?: number;
}

/** Magick generation rates — percentage (0-100) generated per round per color */
export interface MagickGeneration {
  white: number;
  black: number;
  grey: number;
}

/** Card ability that can be activated by spending Magick */
export interface CardAbility {
  name: string;
  description: string;
  cost: MagickCost;
  /** Effect type determines what happens when activated */
  effect: AbilityEffect;
}

/** Possible ability effects */
export type AbilityEffect =
  | { type: 'attack_boost'; amount: number }      // +ATK for this turn
  | { type: 'defense_boost'; amount: number }      // +DEF for this turn
  | { type: 'hp_boost'; amount: number }           // +HP bonus (heal leader)
  | { type: 'hide' }                               // Infinite defense this turn (can't be damaged)
  | { type: 'annihilate' }                         // Infinite attack this turn (one-shot kill leader)
  | { type: 'drain'; amount: number }              // Damage enemy + heal self
  | { type: 'stun' }                               // Enemy leader can't attack next turn
  | { type: 'superior_wit'; attack: number; hp: number } // +ATK and +HP
  | { type: 'shield'; amount: number }             // Reduce incoming damage by amount
  | { type: 'piercing'; amount: number }           // Ignore amount of enemy defense
  | { type: 'rally'; amount: number }              // Boost all hand cards ATK by amount
  | { type: 'lifesteal'; percent: number }         // Heal player HP for % of damage dealt
  | { type: 'magick_drain'; color: MagickColor; amount: number } // Steal enemy magick;

/** Card edition with visual theming */
export type CardEdition = 'Genesis' | 'Awakening' | 'Survivor';

export interface CardData {
  id: string;
  name: string;
  power: number;
  cardType: string;
  description?: string;
  level?: number;
  xp?: number;
  edition?: CardEdition | string;
  rarity?: string;
  class?: string;
  tags?: string[];
  // Battle stats
  attack?: number;
  defense?: number;
  cost?: number;
  // Original Mythereum fields
  /** Magick generated per round when this card is on the field (leader or hand) */
  magickGeneration?: MagickGeneration;
  /** Activated ability — costs Magick to use */
  ability?: CardAbility;
  /** HP bonus/penalty applied to player's health pool (from original card layout) */
  hpModifier?: number;
  /** Legacy mana requirement (kept for backward compat) */
  manaRequirement?: { mana: number; magick?: number };
}

export type TimerOption = 'none' | 'fast' | 'normal' | 'slow';
