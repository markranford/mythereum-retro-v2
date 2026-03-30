/**
 * Default Game Configuration
 *
 * Single source of truth for every game constant.
 * Values match the original hardcoded values exactly — zero behavioral change on deploy.
 * The admin dashboard "Reset to Defaults" copies from this object.
 */

import { GameConfig } from '../types/gameConfig';

export const DEFAULT_GAME_CONFIG: GameConfig = {
  // --- Combat (Original Mythereum Leader System) ---
  combat: {
    damageMitigationDivisor: 2,   // defense / 2 = 50% mitigation
    minimumDamage: 1,             // guaranteed minimum per attack
    basePlayerHp: 200,            // base HP before deck power adjustment
    deckPowerHpDivisor: 0.3,      // higher deck power = lower player HP (0.3 = 30% penalty)
    minimumPlayerHp: 40,          // floor for player HP
    maxRounds: 30,                // max rounds before tiebreaker
  },

  // --- Magick System ---
  magick: {
    generationMultiplier: 1.0,
    handCardsGenerateMagick: true,
    startingWhite: 0,
    startingBlack: 0,
    startingGrey: 0,
  },

  // --- Class Abilities ---
  classAbilities: {
    warriorFortifyReduction: 1,      // -1 damage from all incoming attacks
    mageArcaneSurgeBonusDivisor: 1,  // defense / (2+1) = 33% mitigation instead of 50%
    rogueCriticalStrikeChance: 0.25, // 25% chance to crit
    rogueCriticalStrikeMultiplier: 2, // 2x damage on crit
    healerRejuvenationAmount: 1,     // heal 1 HP to most-damaged ally per round
    rangerPrecisionShotBonus: 2,     // +2 flat bonus attack damage
  },

  // --- Battle Rewards ---
  battleRewards: {
    victoryXp: 50,
    defeatXp: 10,
    victoryMythex: 50,
    defeatMythex: 10,
    victoryResources: 25,         // each of gold/stone/lumber/iron/food
    defeatResources: 5,
  },

  // --- Hero Progression ---
  heroProgression: {
    xpPerLevel: 100,              // level = 1 + floor(xp / 100)
    maxLevel: 50,
    forgeXpBonus: 150,
    maxForgeTier: 3,
    nftEligibleForgeTier: 2,
    nftEligibleLevel: 5,
  },

  // --- Economy Starting Balances ---
  economyStarting: {
    startingMythex: 1000,
    startingGold: 200,
    startingStone: 200,
    startingLumber: 200,
    startingIron: 200,
    startingFood: 200,
    startingMana: 0,
  },

  // --- Stronghold Production ---
  strongholdProduction: {
    tickIntervalMs: 30000,        // 30 seconds
    goldMineBase: 10,             // per hour per level
    stoneQuarryBase: 10,
    lumberYardBase: 10,
    ironMineBase: 10,
    farmsteadBase: 15,
    alchemistLabBase: 5,
  },

  // --- Market NPC Offers ---
  market: {
    npcOffers: [
      { id: 'npc-1', cardId: 'warrior-001', price: 50, stock: 999 },
      { id: 'npc-2', cardId: 'mage-001', price: 60, stock: 999 },
      { id: 'npc-3', cardId: 'rogue-001', price: 55, stock: 999 },
      { id: 'npc-4', cardId: 'cleric-001', price: 45, stock: 999 },
      { id: 'npc-5', cardId: 'ranger-001', price: 58, stock: 999 },
      { id: 'npc-6', cardId: 'warrior-002', price: 120, stock: 50 },
      { id: 'npc-7', cardId: 'mage-002', price: 150, stock: 30 },
    ],
  },

  // --- NPC Raids ---
  raids: {
    targets: [
      {
        id: 'banditCamp',
        name: 'Bandit Camp',
        difficulty: 'easy',
        rewards: { gold: 50, food: 30 },
        description: 'A small group of bandits hoarding stolen goods',
        threatLevel: 10,
      },
      {
        id: 'orcOutpost',
        name: 'Orc Outpost',
        difficulty: 'medium',
        rewards: { gold: 100, iron: 50, stone: 50 },
        description: 'A fortified orc position with valuable resources',
        threatLevel: 25,
      },
      {
        id: 'dragonLair',
        name: 'Dragon Lair',
        difficulty: 'hard',
        rewards: { gold: 300, iron: 100, stone: 100, lumber: 100 },
        description: 'A legendary dragon guards immense treasure',
        threatLevel: 50,
      },
    ],
  },

  // --- Tournament Defaults ---
  tournamentDefaults: {
    presets: [
      {
        name: 'Novice Arena',
        format: 'single-elimination',
        maxParticipants: 8,
        entryFee: 50,
        startDelayHours: 24,
        rewards: {
          first:  { mythex: 500,  resources: { gold: 100, stone: 100, lumber: 100, iron: 100, food: 100, mana: 0 } },
          second: { mythex: 300,  resources: { gold: 60,  stone: 60,  lumber: 60,  iron: 60,  food: 60,  mana: 0 } },
          third:  { mythex: 150,  resources: { gold: 30,  stone: 30,  lumber: 30,  iron: 30,  food: 30,  mana: 0 } },
        },
      },
      {
        name: "Champion's Challenge",
        format: 'single-elimination',
        maxParticipants: 16,
        entryFee: 100,
        startDelayHours: 48,
        rewards: {
          first:  { mythex: 1000, resources: { gold: 200, stone: 200, lumber: 200, iron: 200, food: 200, mana: 50 } },
          second: { mythex: 600,  resources: { gold: 120, stone: 120, lumber: 120, iron: 120, food: 120, mana: 25 } },
          third:  { mythex: 300,  resources: { gold: 60,  stone: 60,  lumber: 60,  iron: 60,  food: 60,  mana: 10 } },
        },
      },
    ],
  },

  // --- Progression Layer Unlocks ---
  progressionLayers: {
    layer2: { heroesRequired: 0 },
    layer3: { heroesRequired: 0, battlesWonRequired: 0 },
    layer4: { heroesRequired: 0, battlesWonRequired: 0, tournamentsWonRequired: 0 },
  },

  // --- Card Stat Overrides (empty by default — admin adds per-card tweaks) ---
  cardOverrides: {},
};
