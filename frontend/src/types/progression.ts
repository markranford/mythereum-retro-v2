// Phase 8: Player Progression & Layer Unlocks

export type GameLayer = 1 | 2 | 3 | 4;

export interface PlayerProgress {
  accountId: string;
  maxLayerUnlocked: GameLayer;
  heroesOwned: number;
  battlesWon: number;
  battlesLost: number;
  tournamentsWon: number;
  tournamentsParticipated: number;
  lastUpdated: number;
  createdAt: number;
}

export interface LayerUnlockThresholds {
  layer2: {
    heroesRequired: number;
  };
  layer3: {
    heroesRequired: number;
    battlesWonRequired: number;
  };
  layer4: {
    heroesRequired: number;
    battlesWonRequired: number;
    tournamentsWonRequired: number;
  };
}

export const DEFAULT_UNLOCK_THRESHOLDS: LayerUnlockThresholds = {
  layer2: {
    heroesRequired: 0, // Unlocked by default
  },
  layer3: {
    heroesRequired: 0, // Unlocked by default
    battlesWonRequired: 0, // Unlocked by default
  },
  layer4: {
    heroesRequired: 0, // Unlocked by default
    battlesWonRequired: 0, // Unlocked by default
    tournamentsWonRequired: 0, // Unlocked by default
  },
};
