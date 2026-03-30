// Phase 9: Soft Economy Type Definitions

export type ResourceType = 'gold' | 'stone' | 'lumber' | 'iron' | 'food' | 'mana';

export interface ResourceAmount {
  gold: number;
  stone: number;
  lumber: number;
  iron: number;
  food: number;
  mana: number;
}

export interface SoftWallet {
  accountId: string;
  mythex: number;
  resources: ResourceAmount;
  lastUpdated: number;
}

export interface EconomyTransaction {
  timestamp: number;
  type: 'earn' | 'spend';
  mythex?: number;
  resources?: Partial<ResourceAmount>;
  source: string;
}

// Phase 4: Market types
export type ListingStatus = 'active' | 'sold' | 'cancelled';

export interface HeroListing {
  id: string;
  heroInstanceId: string;
  price: number;
  seller: string;
  status: ListingStatus;
  listedAt: number;
  soldAt?: number;
}

export interface NpcHeroOffer {
  id: string;
  cardId: string;
  price: number;
  stock: number;
}
