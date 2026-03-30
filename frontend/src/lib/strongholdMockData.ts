import { BuildingTemplate, Alliance, Resources } from '../types/strongholds';

export interface NPCRaidTarget {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  rewards: Partial<Resources>;
  description: string;
  threatLevel?: number;
}

export const BUILDING_TEMPLATES: Record<string, BuildingTemplate> = {
  goldMine: {
    id: 'goldMine',
    name: 'Gold Mine',
    category: 'economy',
    description: 'Produces gold over time',
    baseProduction: { gold: 10 },
    upgradeCost: { gold: 100, stone: 50, lumber: 50, iron: 0, food: 0, mana: 0 },
    upgradeTime: 1,
    allowedZones: ['bailey', 'wilds'],
  },
  stoneQuarry: {
    id: 'stoneQuarry',
    name: 'Stone Quarry',
    category: 'economy',
    description: 'Produces stone over time',
    baseProduction: { stone: 10 },
    upgradeCost: { gold: 80, stone: 0, lumber: 60, iron: 0, food: 0, mana: 0 },
    upgradeTime: 1,
    allowedZones: ['bailey', 'wilds'],
  },
  lumberYard: {
    id: 'lumberYard',
    name: 'Lumber Yard',
    category: 'economy',
    description: 'Produces lumber over time',
    baseProduction: { lumber: 10 },
    upgradeCost: { gold: 80, stone: 60, lumber: 0, iron: 0, food: 0, mana: 0 },
    upgradeTime: 1,
    allowedZones: ['bailey', 'wilds'],
  },
  ironMine: {
    id: 'ironMine',
    name: 'Iron Mine',
    category: 'economy',
    description: 'Produces iron over time',
    baseProduction: { iron: 10 },
    upgradeCost: { gold: 120, stone: 80, lumber: 80, iron: 0, food: 0, mana: 0 },
    upgradeTime: 1.5,
    allowedZones: ['bailey', 'wilds'],
  },
  farmstead: {
    id: 'farmstead',
    name: 'Farmstead',
    category: 'economy',
    description: 'Produces food over time',
    baseProduction: { food: 15 },
    upgradeCost: { gold: 60, stone: 40, lumber: 80, iron: 0, food: 0, mana: 0 },
    upgradeTime: 1,
    allowedZones: ['bailey', 'wilds'],
  },
  alchemistLab: {
    id: 'alchemistLab',
    name: 'AlchemistLab',
    category: 'alchemy',
    description: 'Distills raw resources into Mana and research',
    baseProduction: { mana: 5 },
    upgradeCost: { gold: 150, stone: 100, lumber: 100, iron: 50, food: 0, mana: 0 },
    upgradeTime: 2,
    allowedZones: ['citadel', 'bailey'],
  },
  watchtower: {
    id: 'watchtower',
    name: 'Watchtower',
    category: 'civic',
    description: 'Provides early warning of attacks',
    upgradeCost: { gold: 150, stone: 100, lumber: 100, iron: 50, food: 0, mana: 0 },
    upgradeTime: 2,
    allowedZones: ['citadel', 'bailey'],
  },
  barracks: {
    id: 'barracks',
    name: 'Barracks',
    category: 'military',
    description: 'Trains military units',
    upgradeCost: { gold: 200, stone: 150, lumber: 150, iron: 100, food: 50, mana: 0 },
    upgradeTime: 2,
    allowedZones: ['citadel', 'bailey'],
  },
  townHall: {
    id: 'townHall',
    name: 'Town Hall',
    category: 'civic',
    description: 'Central hub of your stronghold',
    upgradeCost: { gold: 300, stone: 200, lumber: 200, iron: 100, food: 100, mana: 0 },
    upgradeTime: 3,
    allowedZones: ['keep', 'citadel'],
  },
};

export const DEFAULT_ALLIANCES: Alliance[] = [
  {
    id: 'ironLegion',
    name: 'Iron Legion',
    description: 'Warriors united in strength and honor',
    memberCount: 42,
    bonuses: ['+10% Iron Production', '+5% Military Training Speed'],
  },
  {
    id: 'goldenMerchants',
    name: 'Golden Merchants',
    description: 'Masters of trade and commerce',
    memberCount: 38,
    bonuses: ['+15% Gold Production', '+10% Trade Efficiency'],
  },
  {
    id: 'forestGuardians',
    name: 'Forest Guardians',
    description: 'Protectors of nature and resources',
    memberCount: 35,
    bonuses: ['+10% Lumber Production', '+10% Food Production'],
  },
];

export const NPC_RAID_TARGETS: NPCRaidTarget[] = [
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
];

export function createStarterStronghold(name: string): import('../types/strongholds').Stronghold {
  const now = Date.now();
  
  return {
    id: `stronghold-${now}`,
    name,
    createdAt: now,
    lastTickTime: now,
    resources: {
      gold: 200,
      stone: 200,
      lumber: 200,
      iron: 200,
      food: 200,
      mana: 50,
    },
    buildings: {
      goldMine: { templateId: 'goldMine', level: 1, upgrading: false, positionIndex: 19 },
      stoneQuarry: { templateId: 'stoneQuarry', level: 1, upgrading: false, positionIndex: 20 },
      lumberYard: { templateId: 'lumberYard', level: 1, upgrading: false, positionIndex: 21 },
      ironMine: { templateId: 'ironMine', level: 1, upgrading: false, positionIndex: 22 },
      farmstead: { templateId: 'farmstead', level: 1, upgrading: false, positionIndex: 23 },
      watchtower: { templateId: 'watchtower', level: 1, upgrading: false, positionIndex: 1 },
      townHall: { templateId: 'townHall', level: 1, upgrading: false, positionIndex: 0 },
    },
    population: 10,
    allianceId: null,
    activityLog: [
      {
        timestamp: now,
        type: 'production',
        message: 'Stronghold established! Welcome, Warlord!',
      },
    ],
  };
}
