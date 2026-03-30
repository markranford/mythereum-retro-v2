// Phase 6: Telemetry & Balancer Lab type definitions

export interface CardTelemetryCounters {
  cardId: string;
  gamesSeen: number;
  gamesWon: number;
  gamesLost: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  timesPlayed: number;
  timesDestroyed: number;
}

export interface TelemetrySummary {
  totalBattles: number;
  cardStats: Record<string, CardTelemetryCounters>;
  lastUpdated: number;
}

export interface BalanceEngineParams {
  targetWinrateMin: number; // e.g., 0.45
  targetWinrateMax: number; // e.g., 0.55
  adjustmentSensitivity: number; // e.g., 0.5 (how aggressive adjustments are)
  minGamesThreshold: number; // e.g., 10 (minimum games before suggesting changes)
}

export interface DynamicCardBalance {
  cardId: string;
  manaCostOverride: number;
  reason: string;
  appliedAt: number;
}

export interface BalanceRecommendation {
  cardId: string;
  cardName: string;
  currentMana: number;
  suggestedMana: number;
  currentWinrate: number;
  gamesSeen: number;
  reason: string;
  impact: 'buff' | 'nerf' | 'none';
}
