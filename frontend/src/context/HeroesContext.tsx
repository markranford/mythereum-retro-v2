import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { OwnedHeroCard, Deck, DeckWithPower, DeckRole, HeroSource } from '../types/heroes';
import { CARD_LIBRARY } from '../lib/mockData';
import { useAccount } from './AccountContext';

interface HeroesContextType {
  heroes: OwnedHeroCard[];
  decks: Deck[];
  decksWithPower: DeckWithPower[];
  activeDeckId: string | null;
  setActiveDeckId: (id: string | null) => void;
  createDeck: (name: string, role?: DeckRole) => string;
  deleteDeck: (id: string) => void;
  renameDeck: (id: string, newName: string) => void;
  updateDeck: (deckId: string, name: string, cardInstanceIds: string[]) => void;
  addCardToDeck: (deckId: string, cardInstanceId: string) => void;
  removeCardFromDeck: (deckId: string, cardInstanceId: string) => void;
  awardXpToHeroes: (instanceIds: string[], xpAmount: number) => void;
  recruitRandomHero: () => void;
  addHero: (cardId: string, source: HeroSource) => void;
  removeCard: (instanceId: string) => void;
  getDuplicatesByCardId: (cardId: string) => OwnedHeroCard[];
  canForge: (targetInstanceId: string, sacrificeIds: string[]) => boolean;
  forgeHeroes: (targetInstanceId: string, sacrificeIds: string[]) => void;
  getDeckPower: (deckId: string) => number;
  ensureStarterCollection: () => void;
}

const HeroesContext = createContext<HeroesContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'retro-mythereum-heroes-';
const DECKS_KEY_PREFIX = 'retro-mythereum-decks-';
const ACTIVE_DECK_KEY_PREFIX = 'retro-mythereum-active-deck-';

// Generate initial starter heroes with expanded collection
function generateStarterHeroes(): OwnedHeroCard[] {
  // Give player 12 starter heroes (2 from each class, plus 2 extra)
  const starterCardIds = [
    'warrior-001', 'warrior-002',
    'mage-001', 'mage-002',
    'rogue-001', 'rogue-002',
    'cleric-001', 'cleric-002',
    'ranger-001', 'ranger-002',
    'warrior-003', 'mage-003', // Extra powerful cards
  ];

  return starterCardIds.map((cardId, index) => {
    const cardData = CARD_LIBRARY.find(c => c.id === cardId);
    if (!cardData) {
      throw new Error(`Card ${cardId} not found in library`);
    }

    return {
      instanceId: `hero-${Date.now()}-${index}`,
      cardId: cardData.id,
      name: cardData.name,
      power: cardData.power,
      cardType: cardData.cardType,
      level: 1,
      xp: 0,
      edition: cardData.edition || 'Genesis',
      rarity: cardData.rarity || 'Common',
      class: cardData.class || 'Warrior',
      tags: cardData.tags || [],
      source: 'starter',
      acquiredAt: Date.now(),
    };
  });
}

/**
 * PRIORITY 2: HeroesProvider with context isolation improvements.
 * 
 * Architectural Improvements:
 * ✅ Debounced localStorage writes (300ms) to prevent excessive updates
 * ✅ All methods memoized with useCallback for stable references
 * ✅ Computed decksWithPower memoized with useMemo
 * ✅ No circular dependencies with other contexts
 */
export function HeroesProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAccount();
  const accountId = account?.accountId || 'guest';

  const [heroes, setHeroes] = useState<OwnedHeroCard[]>(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${accountId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return generateStarterHeroes();
      }
    }
    return generateStarterHeroes();
  });

  const [decks, setDecks] = useState<Deck[]>(() => {
    const stored = localStorage.getItem(`${DECKS_KEY_PREFIX}${accountId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [activeDeckId, setActiveDeckId] = useState<string | null>(() => {
    const stored = localStorage.getItem(`${ACTIVE_DECK_KEY_PREFIX}${accountId}`);
    return stored || null;
  });

  // PRIORITY 2: Debounced localStorage writes to prevent excessive updates
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${accountId}`, JSON.stringify(heroes));
    }, 300);
    
    return () => clearTimeout(timer);
  }, [heroes, accountId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`${DECKS_KEY_PREFIX}${accountId}`, JSON.stringify(decks));
    }, 300);
    
    return () => clearTimeout(timer);
  }, [decks, accountId]);

  useEffect(() => {
    if (activeDeckId) {
      localStorage.setItem(`${ACTIVE_DECK_KEY_PREFIX}${accountId}`, activeDeckId);
    } else {
      localStorage.removeItem(`${ACTIVE_DECK_KEY_PREFIX}${accountId}`);
    }
  }, [activeDeckId, accountId]);

  // PRIORITY 2: Memoized computed decksWithPower to prevent re-computation
  const decksWithPower: DeckWithPower[] = useMemo(() => {
    return decks.map(deck => {
      const deckHeroes = heroes.filter(h => deck.cardInstanceIds.includes(h.instanceId));
      const totalPower = deckHeroes.reduce((sum, h) => sum + h.power, 0);
      const totalAttack = deckHeroes.reduce((sum, h) => {
        const cardData = CARD_LIBRARY.find(c => c.id === h.cardId);
        return sum + (cardData?.attack || 0);
      }, 0);
      const totalDefense = deckHeroes.reduce((sum, h) => {
        const cardData = CARD_LIBRARY.find(c => c.id === h.cardId);
        return sum + (cardData?.defense || 0);
      }, 0);
      const totalMagick = deckHeroes.reduce((sum, h) => {
        const cardData = CARD_LIBRARY.find(c => c.id === h.cardId);
        return sum + (cardData?.manaRequirement?.magick || 0);
      }, 0);

      return {
        ...deck,
        cardCount: deck.cardInstanceIds.length,
        totalPower,
        totalAttack,
        totalDefense,
        totalMagick,
      };
    });
  }, [decks, heroes]);

  // PRIORITY 1: All methods memoized with useCallback for stable references
  const createDeck = useCallback((name: string, role: DeckRole = 'general'): string => {
    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      name,
      cardInstanceIds: [],
      role,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setDecks(prev => [...prev, newDeck]);
    return newDeck.id;
  }, []);

  const deleteDeck = useCallback((id: string) => {
    setDecks(prev => prev.filter(d => d.id !== id));
    if (activeDeckId === id) {
      setActiveDeckId(null);
    }
  }, [activeDeckId]);

  const renameDeck = useCallback((id: string, newName: string) => {
    setDecks(prev => prev.map(d => (d.id === id ? { ...d, name: newName, updatedAt: Date.now() } : d)));
  }, []);

  const updateDeck = useCallback((deckId: string, name: string, cardInstanceIds: string[]) => {
    setDecks(prev =>
      prev.map(d => (d.id === deckId ? { ...d, name, cardInstanceIds, updatedAt: Date.now() } : d))
    );
  }, []);

  const addCardToDeck = useCallback((deckId: string, cardInstanceId: string) => {
    setDecks(prev =>
      prev.map(d => {
        if (d.id === deckId && !d.cardInstanceIds.includes(cardInstanceId)) {
          return { ...d, cardInstanceIds: [...d.cardInstanceIds, cardInstanceId], updatedAt: Date.now() };
        }
        return d;
      })
    );
  }, []);

  const removeCardFromDeck = useCallback((deckId: string, cardInstanceId: string) => {
    setDecks(prev =>
      prev.map(d => {
        if (d.id === deckId) {
          return { ...d, cardInstanceIds: d.cardInstanceIds.filter(id => id !== cardInstanceId), updatedAt: Date.now() };
        }
        return d;
      })
    );
  }, []);

  const awardXpToHeroes = useCallback((instanceIds: string[], xpAmount: number) => {
    setHeroes(prev =>
      prev.map(hero => {
        if (instanceIds.includes(hero.instanceId)) {
          const newXp = hero.xp + xpAmount;
          const newLevel = Math.min(50, Math.floor(1 + newXp / 100));
          return { ...hero, xp: newXp, level: newLevel };
        }
        return hero;
      })
    );
  }, []);

  const recruitRandomHero = useCallback(() => {
    const randomCard = CARD_LIBRARY[Math.floor(Math.random() * CARD_LIBRARY.length)];
    
    const newHero: OwnedHeroCard = {
      instanceId: `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cardId: randomCard.id,
      name: randomCard.name,
      power: randomCard.power,
      cardType: randomCard.cardType,
      level: 1,
      xp: 0,
      edition: randomCard.edition || 'Genesis',
      rarity: randomCard.rarity || 'Common',
      class: randomCard.class || 'Warrior',
      tags: randomCard.tags || [],
      source: 'recruited',
      acquiredAt: Date.now(),
    };

    setHeroes(prev => [...prev, newHero]);
  }, []);

  const addHero = useCallback((cardId: string, source: HeroSource) => {
    const cardData = CARD_LIBRARY.find(c => c.id === cardId);
    if (!cardData) {
      console.error('[HeroesContext] Card not found:', cardId);
      return;
    }

    const newHero: OwnedHeroCard = {
      instanceId: `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cardId: cardData.id,
      name: cardData.name,
      power: cardData.power,
      cardType: cardData.cardType,
      level: 1,
      xp: 0,
      edition: cardData.edition || 'Genesis',
      rarity: cardData.rarity || 'Common',
      class: cardData.class || 'Warrior',
      tags: cardData.tags || [],
      source,
      acquiredAt: Date.now(),
    };

    setHeroes(prev => [...prev, newHero]);
  }, []);

  const removeCard = useCallback((instanceId: string) => {
    setHeroes(prev => prev.filter(h => h.instanceId !== instanceId));
    
    setDecks(prev =>
      prev.map(d => ({
        ...d,
        cardInstanceIds: d.cardInstanceIds.filter(id => id !== instanceId),
        updatedAt: Date.now(),
      }))
    );
  }, []);

  const getDuplicatesByCardId = useCallback((cardId: string): OwnedHeroCard[] => {
    return heroes.filter(h => h.cardId === cardId);
  }, [heroes]);

  const canForge = useCallback((targetInstanceId: string, sacrificeIds: string[]): boolean => {
    const target = heroes.find(h => h.instanceId === targetInstanceId);
    if (!target || target.marketLocked) return false;
    
    if (sacrificeIds.length === 0) return false;
    
    return sacrificeIds.every(id => {
      const sacrifice = heroes.find(h => h.instanceId === id);
      return sacrifice && !sacrifice.marketLocked && sacrifice.cardId === target.cardId;
    });
  }, [heroes]);

  const forgeHeroes = useCallback((targetInstanceId: string, sacrificeIds: string[]) => {
    if (!canForge(targetInstanceId, sacrificeIds)) {
      console.error('[HeroesContext] Cannot forge heroes');
      return;
    }

    setHeroes(prev => {
      const target = prev.find(h => h.instanceId === targetInstanceId);
      if (!target) return prev;

      const newForgeTier = Math.min(3, (target.forgeTier || 0) + 1);
      const newXp = target.xp + 150;
      const newLevel = Math.min(50, Math.floor(1 + newXp / 100));
      const newNftEligible = newForgeTier >= 2 && newLevel >= 5;

      return prev
        .filter(h => !sacrificeIds.includes(h.instanceId))
        .map(h =>
          h.instanceId === targetInstanceId
            ? {
                ...h,
                xp: newXp,
                level: newLevel,
                forgeTier: newForgeTier,
                nftEligible: newNftEligible,
                lastForgedAt: Date.now(),
              }
            : h
        );
    });

    setDecks(prev =>
      prev.map(d => ({
        ...d,
        cardInstanceIds: d.cardInstanceIds.filter(id => !sacrificeIds.includes(id)),
        updatedAt: Date.now(),
      }))
    );
  }, [canForge]);

  const getDeckPower = useCallback((deckId: string): number => {
    const deck = decksWithPower.find(d => d.id === deckId);
    return deck?.totalPower || 0;
  }, [decksWithPower]);

  const ensureStarterCollection = useCallback(() => {
    // No-op - kept for compatibility
  }, []);

  const contextValue = useMemo(() => ({
    heroes,
    decks,
    decksWithPower,
    activeDeckId,
    setActiveDeckId,
    createDeck,
    deleteDeck,
    renameDeck,
    updateDeck,
    addCardToDeck,
    removeCardFromDeck,
    awardXpToHeroes,
    recruitRandomHero,
    addHero,
    removeCard,
    getDuplicatesByCardId,
    canForge,
    forgeHeroes,
    getDeckPower,
    ensureStarterCollection,
  }), [heroes, decks, decksWithPower, activeDeckId, setActiveDeckId, createDeck, deleteDeck, renameDeck, updateDeck, addCardToDeck, removeCardFromDeck, awardXpToHeroes, recruitRandomHero, addHero, removeCard, getDuplicatesByCardId, canForge, forgeHeroes, getDeckPower, ensureStarterCollection]);

  return (
    <HeroesContext.Provider value={contextValue}>
      {children}
    </HeroesContext.Provider>
  );
}

export function useHeroes() {
  const context = useContext(HeroesContext);
  if (!context) {
    throw new Error('useHeroes must be used within HeroesProvider');
  }
  return context;
}
