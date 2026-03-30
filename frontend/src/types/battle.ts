import { CardData, MagickGeneration, CardAbility } from './game';

/**
 * BattleCard — a card instance in battle with full combat stats.
 *
 * Original Mythereum semantics:
 * - `attack`: Offensive power when this card is the Leader
 * - `defense`: Defensive structure / durability when this card is the Leader
 * - `currentDefense`: Remaining HP (decreases as leader takes damage)
 * - `magickGeneration`: Magick % generated per round in 3 colors
 * - `ability`: Activated ability costing Magick
 * - `hpModifier`: Bonus/penalty to player HP pool
 */
export interface BattleCard extends CardData {
  instanceId: string | number;
  attack: number;
  defense: number;
  currentDefense: number;
  cost: number;
  hp?: number;
  isExhausted: boolean;
  /** Magick generation rates for this card */
  magickGeneration?: MagickGeneration;
  /** Activated ability */
  ability?: CardAbility;
  /** HP modifier for player health pool */
  hpModifier?: number;
  /** Temporary attack boost from abilities (resets each turn) */
  tempAttackBoost?: number;
  /** Temporary defense boost from abilities */
  tempDefenseBoost?: number;
  /** Whether this card is hidden (infinite defense this turn) */
  isHidden?: boolean;
  /** Whether this card has annihilate active (infinite attack this turn) */
  hasAnnihilate?: boolean;
  /** Whether this card is stunned (can't attack next turn) */
  isStunned?: boolean;
}

/**
 * MagickPool — tracks accumulated magick in 3 colors for one player.
 * Values are integers (percentages accumulate, 100% = 1 usable point).
 */
export interface MagickPool {
  white: number;   // Usable white magick points
  black: number;   // Usable black magick points
  grey: number;    // Usable grey magick points
  /** Fractional accumulator (0-99) for each color — rolls over to points at 100 */
  whiteAccum: number;
  blackAccum: number;
  greyAccum: number;
}

/**
 * BattleDeck — original Mythereum deck with Leader + Hand system.
 *
 * - `leader`: The active card on the battlefield (takes/deals damage)
 * - `hand`: Cards waiting to be swapped in as leader
 * - `graveyard`: Destroyed cards
 * - `playerHp`: Player's health pool (excess leader damage hits this)
 * - `magick`: Accumulated magick pool in 3 colors
 */
export interface BattleDeck {
  /** All cards in this deck (for reference/totals) */
  cards: BattleCard[];
  /** Total combined power */
  totalPower: number;
  /** Player/owner name */
  ownerName: string;
  /** Active leader card on the battlefield */
  leader: BattleCard | null;
  /** Cards in hand (can swap one in as leader each turn) */
  hand: BattleCard[];
  /** Destroyed cards */
  graveyard: BattleCard[];
  /** Player health pool — game over when this reaches 0 */
  playerHp: number;
  /** Maximum player HP (for display) */
  maxPlayerHp: number;
  /** Magick pool for ability activation */
  magick: MagickPool;
}

/** A single combat strike event for UI display */
export interface CombatEvent {
  attackerName: string;
  attackerInstanceId: string | number;
  defenderName: string;
  defenderInstanceId: string | number;
  damage: number;
  defenderDestroyed: boolean;
  /** Excess damage that hit the player HP pool */
  excessDamage?: number;
  /** Which side attacked: 1 = player deck1, 2 = AI deck2 */
  side: 1 | 2;
  /** Ability that was activated this event */
  abilityUsed?: string;
}

/**
 * Battle — complete state of an ongoing original Mythereum battle.
 *
 * Turn flow:
 * 1. Magick generation phase (both sides accumulate)
 * 2. Ability activation phase (player can activate leader's ability)
 * 3. Swap phase (player can swap leader from hand)
 * 4. Combat phase (leaders attack each other simultaneously)
 * 5. Cleanup (check for leader death → excess dmg to player HP, check victory)
 */
export interface Battle {
  deck1: BattleDeck;
  deck2: BattleDeck;
  turn: number;
  phase: 'setup' | 'swap' | 'combat' | 'resolution' | 'complete';
  winner: number | null;
  lastEvent?: {
    attacker: string;
    defender: string;
    damage: number;
    defenderDestroyed: boolean;
    excessDamage?: number;
  };
  roundEvents?: CombatEvent[];
  log: Array<{ message: string; category: 'upkeep' | 'action' | 'combat' | 'system' | 'magick' | 'ability' }>;
}

export type BattleState = Battle;

// Legacy types (kept for backward compatibility)
export interface BattlePlayerState {
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  manaLevel: number;
  magick: {
    red: number;
    blue: number;
    green: number;
    black: number;
  };
  leader: BattleCard | null;
  hand: BattleCard[];
  reserve: BattleCard[];
  battlefield: BattleCard[];
  timeDistortion: boolean;
}

export type BattlePhase = 'draw' | 'upkeep' | 'main' | 'combat' | 'end' | 'victory' | 'defeat';
