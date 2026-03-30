import { CardData } from './game';

/**
 * BattleCard represents a card instance in battle with combat stats.
 * 
 * Core Semantics:
 * - `attack`: Offensive power - damage dealt when this card attacks
 * - `defense`: Defensive structure - both damage mitigation and hit points
 * - `hp`: Current hit points (typically equals currentDefense for simplicity)
 * - `currentDefense`: Remaining structural integrity (decreases as card takes damage)
 * 
 * When a card's currentDefense reaches 0, it is destroyed and removed from battle.
 * The `id` field can be either string or number for maximum flexibility.
 */
export interface BattleCard extends CardData {
  /** Unique instance identifier for this card in battle (string or number) */
  instanceId: string | number;
  
  /** Attack power - damage dealt when this card attacks */
  attack: number;
  
  /** Defense value - base structural integrity and damage mitigation */
  defense: number;
  
  /** Current defense remaining (decreases as card takes damage, card destroyed at 0) */
  currentDefense: number;
  
  /** Mana cost to play this card */
  cost: number;
  
  /** Current hit points for this card instance (typically equals currentDefense) */
  hp?: number;
  
  /** Whether this card has been used this turn and cannot act again */
  isExhausted: boolean;
}

/**
 * BattleDeck represents a player's deck in battle.
 * 
 * The `cards` array contains live combatants currently on the battlefield.
 * Cards with currentDefense <= 0 are considered destroyed and should be filtered out.
 * 
 * Future v0.8+ mechanics will add:
 * - `leader`: Designated leader card with special abilities
 * - `reserve`: Cards waiting to enter battle
 * - `hand`: Cards available to play this turn
 */
export interface BattleDeck {
  /** Array of cards currently in this deck/battlefield (live combatants only) */
  cards: BattleCard[];
  
  /** Total combined power of all cards (sum of attack + defense) */
  totalPower: number;
  
  /** Player/owner name for this deck */
  ownerName: string;
  
  // Future fields for v0.8+ mechanics:
  // leader?: BattleCard;
  // reserve?: BattleCard[];
  // hand?: BattleCard[];
}

/**
 * Battle represents the complete state of an ongoing battle.
 * 
 * This is the single source of truth for battle state. All mutations must
 * create deep copies to maintain React immutability guarantees.
 * 
 * Battle Flow:
 * 1. setup: Initial deck preparation
 * 2. combat: Active fighting phase (cards attack/defend)
 * 3. resolution: Determine winner after combat
 * 4. complete: Battle finished, winner declared
 * 
 * Victory Conditions:
 * - All cards in opponent's deck have currentDefense <= 0
 * - Winner is set to 1 (deck1) or 2 (deck2)
 */
export interface Battle {
  /** Player 1's deck and state */
  deck1: BattleDeck;
  
  /** Player 2's deck and state */
  deck2: BattleDeck;
  
  /** Current turn number (starts at 1, increments each round) */
  turn: number;
  
  /** Current battle phase */
  phase: 'setup' | 'combat' | 'resolution' | 'complete';
  
  /** Winner deck index (1 or 2) if battle is complete, null otherwise */
  winner: number | null;
  
  /** Last combat event that occurred (for UI display and animation) */
  lastEvent?: {
    attacker: string;
    defender: string;
    damage: number;
    defenderDestroyed: boolean;
  };
  
  /** Battle log messages for display (chronological order) */
  log: Array<{ message: string; category: 'upkeep' | 'action' | 'combat' | 'system' }>;
}

/**
 * BattleState is an alias for Battle, used for consistency across the codebase.
 * Represents the complete immutable state of a battle at any point in time.
 * 
 * All battle state updates must use deep copies via deepCloneBattle() to prevent
 * React state corruption and ensure predictable, pure functional updates.
 */
export type BattleState = Battle;

// Legacy v0.8 types (kept for backward compatibility, not used in current stateless system)
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
