// Tournament types for Phase 5

export type TournamentStatus = 'upcoming' | 'registration' | 'active' | 'completed';

export type TournamentFormat = 'single-elimination' | 'double-elimination' | 'round-robin';

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
