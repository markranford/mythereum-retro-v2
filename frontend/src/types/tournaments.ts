// Tournament types with Autobot strategy system

export type TournamentStatus = 'upcoming' | 'registration' | 'active' | 'completed';

export type TournamentFormat = 'single-elimination' | 'double-elimination' | 'round-robin';

/**
 * Autobot targeting strategies — determines how a participant's deck
 * picks attackers and targets during automated tournament combat.
 */
export type AutobotStrategy =
  | 'random'           // Random attacker, random target (default)
  | 'focus-weakest'    // Target the enemy card with lowest current HP
  | 'focus-strongest'  // Target the enemy card with highest attack (remove threats)
  | 'spread-damage'    // Target the enemy card with highest current HP (even out damage)
  | 'protect-healer';  // Use highest-attack friendly card, target highest-attack enemy

export const STRATEGY_LABELS: Record<AutobotStrategy, { name: string; description: string }> = {
  'random':          { name: 'Random',          description: 'Random attacker and target each round' },
  'focus-weakest':   { name: 'Focus Weakest',   description: 'Always target the enemy with lowest HP' },
  'focus-strongest': { name: 'Focus Strongest',  description: 'Prioritize eliminating the biggest threat' },
  'spread-damage':   { name: 'Spread Damage',   description: 'Distribute damage evenly across enemies' },
  'protect-healer':  { name: 'Protect & Strike', description: 'Lead with strongest attacker, target enemy threats' },
};

export interface TournamentConfig {
  name: string;
  description?: string;
  format: TournamentFormat;
  maxParticipants: number;
  entryFee: number;
  startTime: number;
  endTime?: number;
}

export interface TournamentParticipant {
  id: string;
  name: string;
  deckId: string;
  deckPower: number;
  isAI: boolean;
  eliminated?: boolean;
  /** Autobot strategy used for automated combat */
  strategy: AutobotStrategy;
  /** Card IDs in the participant's deck (for AI: built from library) */
  deckCardIds?: string[];
}

export interface TournamentMatch {
  id: string;
  round: number;
  participant1Id: string;
  participant2Id: string;
  winnerId?: string;
  participant1Score?: number;
  participant2Score?: number;
  completed: boolean;
  /** Number of combat rounds the match took */
  roundCount?: number;
  /** Summary of key events from the match */
  combatSummary?: string[];
}

export interface TournamentRewards {
  first: { mythex: number; resources?: { gold: number; stone: number; lumber: number; iron: number; food: number; mana: number } };
  second: { mythex: number; resources?: { gold: number; stone: number; lumber: number; iron: number; food: number; mana: number } };
  third: { mythex: number; resources?: { gold: number; stone: number; lumber: number; iron: number; food: number; mana: number } };
}

export interface Tournament {
  id: string;
  name: string;
  config: TournamentConfig;
  status: TournamentStatus;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  currentRound: number;
  rewards?: TournamentRewards;
  championId?: string;
  createdAt: number;
  updatedAt?: number;
}
