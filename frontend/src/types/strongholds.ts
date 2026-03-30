// Domain Model for Strongholds Layer 1

export type ResourceType = 'gold' | 'stone' | 'lumber' | 'iron' | 'food' | 'mana';

export interface Resources {
  gold: number;
  stone: number;
  lumber: number;
  iron: number;
  food: number;
  mana: number;
}

export type ZoneType = 'keep' | 'citadel' | 'bailey' | 'wilds';

export interface BuildingTemplate {
  id: string;
  name: string;
  category: 'economy' | 'civic' | 'military' | 'alchemy';
  description: string;
  baseProduction?: Partial<Resources>;
  upgradeCost: Resources;
  upgradeTime: number; // hours
  allowedZones: ZoneType[];
}

export interface Building {
  templateId: string;
  level: number;
  upgrading: boolean;
  upgradeStartTime?: number;
  upgradeCompleteTime?: number;
}

export interface BuildingInstance extends Building {
  positionIndex: number;
}

export interface Alliance {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  bonuses: string[];
}

export interface ActivityLog {
  timestamp: number;
  type: 'trade' | 'raid' | 'upgrade' | 'alliance' | 'production';
  message: string;
}

export interface Stronghold {
  id: string;
  name: string;
  createdAt: number;
  lastTickTime: number;
  resources: Resources;
  buildings: Record<string, BuildingInstance>;
  population: number;
  allianceId: string | null;
  activityLog: ActivityLog[];
  assignedRaidDeckId?: string | null;
  assignedDefenceDeckId?: string | null;
  level?: number;
}

// Phase 10: Building definitions for production and upgrades
export interface BuildingDefinition {
  id: string;
  name: string;
  category: 'economy' | 'civic' | 'military' | 'alchemy';
  description: string;
  baseProduction?: Partial<Resources>;
  productionPerLevel?: Partial<Resources>;
  upgradeCost: Resources;
  upgradeTime: number; // hours
  allowedZones: ZoneType[];
  maxLevel: number;
}

// Phase 10: Stronghold state for production collection
export interface StrongholdState {
  lastProductionCollection: number;
  accumulatedProduction: Resources;
}
