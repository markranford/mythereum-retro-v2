import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { TelemetrySummary, BalanceEngineParams, CardTelemetryCounters } from '../types/balancer';
import { useHeroes } from './HeroesContext';

interface TelemetryContextType {
  summary: TelemetrySummary;
  engineParams: BalanceEngineParams;
  recordBattleOutcome: (battleId: string, victory: boolean, usedHeroOwnedIds: string[]) => void;
  updateEngineParams: (params: Partial<BalanceEngineParams>) => void;
  resetTelemetry: () => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

const STORAGE_KEY = 'retro-mythereum-telemetry-v1';

const DEFAULT_ENGINE_PARAMS: BalanceEngineParams = {
  targetWinrateMin: 0.45,
  targetWinrateMax: 0.55,
  adjustmentSensitivity: 0.5,
  minGamesThreshold: 10,
};

const DEFAULT_SUMMARY: TelemetrySummary = {
  totalBattles: 0,
  cardStats: {},
  lastUpdated: Date.now(),
};

/**
 * TelemetryProvider - PRIORITY 2: Context isolation with defensive guards.
 * 
 * Architectural Improvements:
 * ✅ useRef guard (isUpdatingRef) to prevent circular updates with BalancerContext
 * ✅ Debounced localStorage writes (300ms) to prevent excessive I/O
 * ✅ No direct writes to other contexts - emit-style pattern only
 * ✅ All methods memoized with useCallback for stable references
 */
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const { heroes } = useHeroes();
  
  // PRIORITY 2: Use ref to prevent circular updates
  const isUpdatingRef = useRef(false);
  
  // PRIORITY 3: Diagnostic logging
  const renderCountRef = useRef(0);
  if (import.meta.env.DEV) {
    renderCountRef.current++;
    if (renderCountRef.current % 20 === 0) {
      console.debug('[TelemetryContext] Render count:', renderCountRef.current);
    }
  }
  
  const [summary, setSummary] = useState<TelemetrySummary>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.summary || DEFAULT_SUMMARY;
      } catch {
        return DEFAULT_SUMMARY;
      }
    }
    return DEFAULT_SUMMARY;
  });

  const [engineParams, setEngineParams] = useState<BalanceEngineParams>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.engineParams || DEFAULT_ENGINE_PARAMS;
      } catch {
        return DEFAULT_ENGINE_PARAMS;
      }
    }
    return DEFAULT_ENGINE_PARAMS;
  });

  // Helper to get cardId from ownedHeroId
  const getCardIdByOwnedHeroId = useCallback((ownedHeroId: string): string | null => {
    const hero = heroes.find(h => h.instanceId === ownedHeroId);
    return hero?.cardId || null;
  }, [heroes]);

  // PRIORITY 2: Debounced localStorage writes (300ms) to prevent excessive writes
  useEffect(() => {
    if (isUpdatingRef.current) return;
    
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ summary, engineParams }));
      
      if (import.meta.env.DEV) {
        console.debug('[TelemetryContext] Data saved to localStorage');
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [summary, engineParams]);

  // PRIORITY 2: All methods memoized with useCallback for stable references
  const recordBattleOutcome = useCallback((battleId: string, victory: boolean, usedHeroOwnedIds: string[]) => {
    // PRIORITY 2: Prevent circular updates
    if (isUpdatingRef.current) {
      if (import.meta.env.DEV) {
        console.warn('[TelemetryContext] Skipping recordBattleOutcome - update in progress');
      }
      return;
    }
    
    isUpdatingRef.current = true;
    try {
      if (import.meta.env.DEV) {
        console.debug('[TelemetryContext] Recording battle outcome:', {
          battleId,
          victory,
          heroCount: usedHeroOwnedIds.length,
        });
      }

      setSummary(prev => {
        const newStats = { ...prev.cardStats };

        // Update stats for each card used in battle
        usedHeroOwnedIds.forEach(ownedId => {
          const cardId = getCardIdByOwnedHeroId(ownedId);
          if (!cardId) return;

          if (!newStats[cardId]) {
            newStats[cardId] = {
              cardId,
              gamesSeen: 0,
              gamesWon: 0,
              gamesLost: 0,
              totalDamageDealt: 0,
              totalDamageTaken: 0,
              timesPlayed: 0,
              timesDestroyed: 0,
            };
          }

          newStats[cardId].gamesSeen += 1;
          if (victory) {
            newStats[cardId].gamesWon += 1;
          } else {
            newStats[cardId].gamesLost += 1;
          }
        });

        return {
          totalBattles: prev.totalBattles + 1,
          cardStats: newStats,
          lastUpdated: Date.now(),
        };
      });
    } finally {
      // Reset flag after a short delay to allow state to settle
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  }, [getCardIdByOwnedHeroId]);

  const updateEngineParams = useCallback((params: Partial<BalanceEngineParams>) => {
    if (import.meta.env.DEV) {
      console.debug('[TelemetryContext] Updating engine params:', params);
    }
    setEngineParams(prev => ({ ...prev, ...params }));
  }, []);

  const resetTelemetry = useCallback(() => {
    if (import.meta.env.DEV) {
      console.debug('[TelemetryContext] Resetting telemetry data');
    }
    setSummary(DEFAULT_SUMMARY);
    setEngineParams(DEFAULT_ENGINE_PARAMS);
  }, []);

  return (
    <TelemetryContext.Provider
      value={{
        summary,
        engineParams,
        recordBattleOutcome,
        updateEngineParams,
        resetTelemetry,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within TelemetryProvider');
  }
  return context;
}
