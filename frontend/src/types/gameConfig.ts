/**
 * Game Configuration Types
 *
 * Defines the shape of all admin-tunable game constants.
 * Every numeric balance value, reward amount, cost, and threshold
 * is defined here so it can be managed from a single admin dashboard.
 */

import { ResourceAmount } from './economy';

// === Combat ===

export interface CombatConfig {
  /** Divisor for defender's defense stat in damage calc. Higher = less mitigation. Default: 2 (50%) */
  damageMitigationDivisor: number;
  /** Minimum damage per attack, even against high defense. Default: 1 */
  minimumDamage: number;
}

// === Battle Rewards ===

export interface BattleRewardsConfig {
  victoryXp: number;
  defeatXp: number;
  victoryMythex: number;
  defeatMythex: number;
  /** Per-resource amount (applied to gold, stone, lumber, iron, food) */
  victoryResources: number;
  defeatResources: number;
}

// === Hero Progression ===

export interface HeroProgressionConfig {
  /** XP needed per level. Formula: level = 1 + floor(xp / xpPerLevel) */
  xpPerLevel: number;
  maxLevel: number;
  /** XP bonus granted to target card when forging */
  forgeXpBonus: number;
  maxForgeTier: number;
  /** Forge tier required for NFT eligibility */
  nftEligibleForgeTier: number;
  /** Level required for NFT eligibility */
  nftEligibleLevel: number;
}

// === Economy Starting Balances ===

export interface EconomyStartingConfig {
  startingMythex: number;
  startingGold: number;
  startingStone: number;
  startingLumber: number;
  startingIron: number;
  startingFood: number;
  startingMana: number;
}

// === Stronghold Production ===

export interface StrongholdProductionConfig {
  /** Tick interval in milliseconds for production checks */
  tickIntervalMs: number;
  /** Base production rates per building type per hour per level */
  goldMineBase: number;
  stoneQuarryBase: number;
  lumberYardBase: number;
  ironMineBase: number;
  farmsteadBase: number;
  alchemistLabBase: number;
}

// === Market ===

export interface NpcMarketOffer {
  id: string;
  cardId: string;
  price: number;
  stock: number;
}

export interface MarketConfig {
  npcOffers: NpcMarketOffer[];
}

// === NPC Raids ===

export interface NpcRaidConfig {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  rewards: Partial<ResourceAmount>;
  description: string;
  threatLevel: number;
}

export interface RaidsConfig {
  targets: NpcRaidConfig[];
}

// === Tournament Defaults ===

export interface TournamentRewardTier {
  mythex: number;
  resources: ResourceAmount;
}

export interface TournamentPreset {
  name: string;
  format: 'single-elimination';
  maxParticipants: number;
  entryFee: number;
  /** Hours from creation until start */
  startDelayHours: number;
  rewards: {
    first: TournamentRewardTier;
    second: TournamentRewardTier;
    third: TournamentRewardTier;
  };
}

export interface TournamentDefaultsConfig {
  presets: TournamentPreset[];
}

// === Progression Layers ===

export interface ProgressionLayersConfig {
  layer2: { heroesRequired: number };
  layer3: { heroesRequired: number; battlesWonRequired: number };
  layer4: { heroesRequired: number; battlesWonRequired: number; tournamentsWonRequired: number };
}

// === Card Overrides ===

export interface CardOverride {
  attack?: number;
  defense?: number;
  cost?: number;
  power?: number;
}

// === Top-Level Config ===

export interface GameConfig {
  combat: CombatConfig;
  battleRewards: BattleRewardsConfig;
  heroProgression: HeroProgressionConfig;
  economyStarting: EconomyStartingConfig;
  strongholdProduction: StrongholdProductionConfig;
  market: MarketConfig;
  raids: RaidsConfig;
  tournamentDefaults: TournamentDefaultsConfig;
  progressionLayers: ProgressionLayersConfig;
  cardOverrides: Record<string, CardOverride>;
}
