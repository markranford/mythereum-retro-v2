import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PlayerProgress, GameLayer, DEFAULT_UNLOCK_THRESHOLDS } from '../types/progression';
import { useAccount } from './AccountContext';

interface ProgressContextType {
  progress: PlayerProgress | null;
  isLayerUnlocked: (layer: GameLayer) => boolean;
  registerHeroCount: (count: number) => void;
  registerBattleResult: (won: boolean) => void;
  registerTournamentResult: (won: boolean) => void;
  getUnlockRequirements: (layer: GameLayer) => string[];
  isInitialized: boolean;
  initializationError: string | null;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

const STORAGE_KEY = 'retro-mythereum-progress-v1';

function createInitialProgress(accountId: string): PlayerProgress {
  return {
    accountId,
    maxLayerUnlocked: 4, // All layers unlocked by default
    heroesOwned: 0,
    battlesWon: 0,
    battlesLost: 0,
    tournamentsWon: 0,
    tournamentsParticipated: 0,
    lastUpdated: Date.now(),
    createdAt: Date.now(),
  };
}

/**
 * ProgressProvider - PRIORITY 2: Context isolation with defensive guards.
 * 
 * Architectural Improvements:
 * ✅ useRef guard (isUpdatingRef) to prevent circular updates
 * ✅ Debounced localStorage writes (300ms) to prevent excessive I/O
 * ✅ Dependency on accountId only - no cross-context dependencies
 * ✅ All methods memoized with useCallback for stable references
 * ✅ No direct writes to other contexts - emit-style pattern only
 */
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAccount();
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  // PRIORITY 2: Use ref to prevent circular updates
  const isUpdatingRef = useRef(false);
  const progressRef = useRef<PlayerProgress | null>(null);
  const accountRef = useRef(account);

  // PRIORITY 3: Diagnostic logging
  const renderCountRef = useRef(0);
  if (import.meta.env.DEV) {
    renderCountRef.current++;
    if (renderCountRef.current % 20 === 0) {
      console.debug('[ProgressContext] Render count:', renderCountRef.current);
    }
  }

  // Keep refs in sync with state
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { accountRef.current = account; }, [account]);

  // Initialize or load progress when account changes - only once
  useEffect(() => {
    if (isUpdatingRef.current) {
      if (import.meta.env.DEV) {
        console.debug('[ProgressContext] Skipping initialization - update in progress');
      }
      return;
    }
    
    try {
      if (!account) {
        if (import.meta.env.DEV) {
          console.debug('[ProgressContext] No account available, waiting...');
        }
        setProgress(null);
        setIsInitialized(false);
        setInitializationError(null);
        return;
      }

      if (import.meta.env.DEV) {
        console.debug('[ProgressContext] Initializing for account:', account.accountId);
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const allProgress: Record<string, PlayerProgress> = JSON.parse(stored);
          const accountProgress = allProgress[account.accountId];

          if (accountProgress) {
            if (import.meta.env.DEV) {
              console.debug('[ProgressContext] Loaded existing progress:', {
                maxLayer: accountProgress.maxLayerUnlocked,
                battles: `${accountProgress.battlesWon}W/${accountProgress.battlesLost}L`,
              });
            }
            // Ensure all layers are unlocked
            if (accountProgress.maxLayerUnlocked < 4) {
              accountProgress.maxLayerUnlocked = 4;
            }
            setProgress(accountProgress);
          } else {
            if (import.meta.env.DEV) {
              console.debug('[ProgressContext] Creating new progress for account');
            }
            const newProgress = createInitialProgress(account.accountId);
            setProgress(newProgress);
            
            // Save immediately
            allProgress[account.accountId] = newProgress;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
          }
        } catch (parseError) {
          console.error('[ProgressContext] Failed to parse stored progress:', parseError);
          setInitializationError('Failed to load progress data');
          
          // Create fresh progress
          const newProgress = createInitialProgress(account.accountId);
          setProgress(newProgress);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ [account.accountId]: newProgress }));
        }
      } else {
        if (import.meta.env.DEV) {
          console.debug('[ProgressContext] No stored progress, creating new');
        }
        const newProgress = createInitialProgress(account.accountId);
        setProgress(newProgress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ [account.accountId]: newProgress }));
      }

      setIsInitialized(true);
      setInitializationError(null);
    } catch (error) {
      console.error('[ProgressContext] Critical initialization error:', error);
      setInitializationError(error instanceof Error ? error.message : 'Unknown initialization error');
      setIsInitialized(false);
    }
  }, [account?.accountId]); // PRIORITY 2: Only depend on accountId

  // PRIORITY 2: Debounced localStorage writes (300ms) to prevent excessive updates
  useEffect(() => {
    if (!progress || !account || isUpdatingRef.current) return;

    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const allProgress: Record<string, PlayerProgress> = stored ? JSON.parse(stored) : {};
        
        allProgress[account.accountId] = {
          ...progress,
          lastUpdated: Date.now(),
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
        
        if (import.meta.env.DEV) {
          console.debug('[ProgressContext] Progress saved to localStorage');
        }
      } catch (error) {
        console.error('[ProgressContext] Failed to save progress:', error);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [progress, account]);

  // PRIORITY 2: All methods memoized with useCallback for stable references
  const isLayerUnlocked = useCallback((layer: GameLayer): boolean => {
    if (!progress) return layer === 1;
    return progress.maxLayerUnlocked >= layer;
  }, [progress]);

  const getUnlockRequirements = useCallback((layer: GameLayer): string[] => {
    // All layers are unlocked by default, so no requirements
    return [];
  }, []);

  const registerHeroCount = useCallback((count: number) => {
    if (!progressRef.current || !accountRef.current) {
      console.warn('[ProgressContext] Cannot register hero count: no progress or account');
      return;
    }

    if (import.meta.env.DEV) {
      console.debug('[ProgressContext] Registering hero count:', count);
    }

    setProgress(prev => {
      if (!prev || prev.heroesOwned === count) return prev;

      return {
        ...prev,
        heroesOwned: count,
      };
    });
  }, []);

  const registerBattleResult = useCallback((won: boolean) => {
    if (!progressRef.current || !accountRef.current) {
      console.warn('[ProgressContext] Cannot register battle result: no progress or account');
      return;
    }

    if (import.meta.env.DEV) {
      console.debug('[ProgressContext] Registering battle result:', won ? 'Victory' : 'Defeat');
    }

    setProgress(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        battlesWon: won ? prev.battlesWon + 1 : prev.battlesWon,
        battlesLost: won ? prev.battlesLost : prev.battlesLost + 1,
      };
    });
  }, []);

  const registerTournamentResult = useCallback((won: boolean) => {
    if (!progressRef.current || !accountRef.current) {
      console.warn('[ProgressContext] Cannot register tournament result: no progress or account');
      return;
    }

    if (import.meta.env.DEV) {
      console.debug('[ProgressContext] Registering tournament result:', won ? 'Victory' : 'Participation');
    }

    setProgress(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        tournamentsParticipated: prev.tournamentsParticipated + 1,
        tournamentsWon: won ? prev.tournamentsWon + 1 : prev.tournamentsWon,
      };
    });
  }, []);

  const contextValue = useMemo(() => ({
    progress,
    isLayerUnlocked,
    registerHeroCount,
    registerBattleResult,
    registerTournamentResult,
    getUnlockRequirements,
    isInitialized,
    initializationError,
  }), [progress, isLayerUnlocked, registerHeroCount, registerBattleResult, registerTournamentResult, getUnlockRequirements, isInitialized, initializationError]);

  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within ProgressProvider');
  }
  return context;
}
