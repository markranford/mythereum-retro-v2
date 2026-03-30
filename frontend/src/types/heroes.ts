// Hero and Deck types for Phase 2 with Phase 4 forge and market extensions, Phase 10 recruitment

export type HeroSource = 'starter' | 'market' | 'forge' | 'reward' | 'drop' | 'recruited';

export type DeckRole = 'raid' | 'defence' | 'tournament' | 'general';

export interface OwnedHeroCard {
  instanceId: string;
  cardId: string;
  name: string;
  power: number;
  cardType: string;
  level: number;
  xp: number;
  edition: string;
  rarity: string;
  class: string;
  tags: string[];
  source: HeroSource;
  acquiredAt: number;
  // Phase 4 forge and market fields
  forgeTier?: number;
  nftEligible?: boolean;
  lastForgedAt?: number;
  marketLocked?: boolean;
}

export interface Deck {
  id: string;
  name: string;
  cardInstanceIds: string[];
  role: DeckRole;
  createdAt: number;
  updatedAt: number;
}

export interface DeckWithPower extends Deck {
  totalPower: number;
  cardCount: number;
  heroIds?: string[];
}
