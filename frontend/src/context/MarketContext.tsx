import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HeroListing, NpcHeroOffer, ListingStatus } from '../types/economy';
import { useHeroes } from './HeroesContext';
import { useEconomy } from './EconomyContext';
import { CARD_LIBRARY } from '../lib/mockData';
import { useGameConfig } from './GameConfigContext';

interface MarketContextType {
  listings: HeroListing[];
  npcOffers: NpcHeroOffer[];
  buyFromNpc: (offerId: string) => boolean;
  listHeroForSale: (heroInstanceId: string, price: number) => boolean;
  buyListing: (listingId: string) => boolean;
  cancelListing: (listingId: string) => boolean;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

const STORAGE_KEY = 'retro-mythereum-market-v1';

// Static NPC offers
const NPC_OFFERS: NpcHeroOffer[] = [
  { id: 'npc-1', cardId: 'warrior-001', price: 50, stock: 999 },
  { id: 'npc-2', cardId: 'mage-001', price: 60, stock: 999 },
  { id: 'npc-3', cardId: 'rogue-001', price: 55, stock: 999 },
  { id: 'npc-4', cardId: 'cleric-001', price: 45, stock: 999 },
  { id: 'npc-5', cardId: 'ranger-001', price: 58, stock: 999 },
  { id: 'npc-6', cardId: 'warrior-002', price: 120, stock: 50 },
  { id: 'npc-7', cardId: 'mage-002', price: 150, stock: 30 },
];

interface MarketState {
  listings: HeroListing[];
  nextListingId: number;
}

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const { heroes, addHero, removeCard } = useHeroes();
  const { spendMythex, earnMythex, canAffordMythex } = useEconomy();
  const { market: marketCfg } = useGameConfig();
  const marketCfgRef = useRef(marketCfg);
  useEffect(() => { marketCfgRef.current = marketCfg; }, [marketCfg]);

  const heroesRef = useRef(heroes);
  useEffect(() => { heroesRef.current = heroes; }, [heroes]);
  const stateRef = useRef<MarketState>(null as any);

  const [state, setState] = useState<MarketState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      listings: [],
      nextListingId: 1,
    };
  });

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = state; }, [state]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Buy from NPC
  const buyFromNpc = useCallback((offerId: string): boolean => {
    const offer = marketCfgRef.current.npcOffers.find(o => o.id === offerId);
    if (!offer) {
      console.error('[MarketContext] Offer not found:', offerId);
      return false;
    }

    if (!canAffordMythex(offer.price)) {
      console.warn('[MarketContext] Insufficient Mythex for purchase');
      return false;
    }

    const success = spendMythex(offer.price, `NPC Market: ${offer.cardId}`);
    if (!success) {
      console.error('[MarketContext] Failed to spend Mythex');
      return false;
    }

    addHero(offer.cardId, 'market');
    console.log('[MarketContext] Successfully purchased hero from NPC:', offer.cardId);
    return true;
  }, [canAffordMythex, spendMythex, addHero]);

  // List hero for sale
  const listHeroForSale = useCallback((heroInstanceId: string, price: number): boolean => {
    const hero = heroesRef.current.find(h => h.instanceId === heroInstanceId);
    if (!hero || hero.marketLocked) {
      console.warn('[MarketContext] Hero not found or already locked:', heroInstanceId);
      return false;
    }

    setState(prev => {
      const newListing: HeroListing = {
        id: `listing-${prev.nextListingId}`,
        heroInstanceId,
        price,
        seller: 'local-player',
        status: 'active',
        listedAt: Date.now(),
      };
      console.log('[MarketContext] Hero listed for sale:', newListing);
      return {
        ...prev,
        listings: [...prev.listings, newListing],
        nextListingId: prev.nextListingId + 1,
      };
    });

    return true;
  }, []);

  // Buy listing
  const buyListing = useCallback((listingId: string): boolean => {
    const listing = stateRef.current.listings.find(l => l.id === listingId && l.status === 'active');
    if (!listing) {
      console.error('[MarketContext] Listing not found or not active:', listingId);
      return false;
    }

    if (!canAffordMythex(listing.price)) {
      console.warn('[MarketContext] Insufficient Mythex for purchase');
      return false;
    }

    const hero = heroesRef.current.find(h => h.instanceId === listing.heroInstanceId);
    if (!hero) {
      console.error('[MarketContext] Hero not found:', listing.heroInstanceId);
      return false;
    }

    const success = spendMythex(listing.price, `Player Market: ${hero.name}`);
    if (!success) {
      console.error('[MarketContext] Failed to spend Mythex');
      return false;
    }

    // Add hero to buyer's collection
    addHero(hero.cardId, 'market');

    // Remove hero from seller (in this local version, we just remove it)
    removeCard(listing.heroInstanceId);

    // Update listing status
    setState(prev => ({
      ...prev,
      listings: prev.listings.map(l =>
        l.id === listingId
          ? { ...l, status: 'sold' as ListingStatus, soldAt: Date.now() }
          : l
      ),
    }));

    console.log('[MarketContext] Successfully purchased hero from listing:', listingId);
    return true;
  }, [canAffordMythex, spendMythex, addHero, removeCard]);

  // Cancel listing
  const cancelListing = useCallback((listingId: string): boolean => {
    const listing = stateRef.current.listings.find(l => l.id === listingId && l.status === 'active');
    if (!listing) {
      console.error('[MarketContext] Listing not found or not active:', listingId);
      return false;
    }

    setState(prev => ({
      ...prev,
      listings: prev.listings.map(l =>
        l.id === listingId
          ? { ...l, status: 'cancelled' as ListingStatus }
          : l
      ),
    }));

    console.log('[MarketContext] Listing cancelled:', listingId);
    return true;
  }, []);

  const contextValue = useMemo(() => ({
    listings: state.listings,
    npcOffers: marketCfg.npcOffers,
    buyFromNpc,
    listHeroForSale,
    buyListing,
    cancelListing,
  }), [state.listings, marketCfg.npcOffers, buyFromNpc, listHeroForSale, buyListing, cancelListing]);

  return (
    <MarketContext.Provider value={contextValue}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within MarketProvider');
  }
  return context;
}
