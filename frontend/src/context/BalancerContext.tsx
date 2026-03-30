import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { DynamicCardBalance, BalanceRecommendation } from '../types/balancer';
import { useTelemetry } from './TelemetryContext';
import { computeBalanceRecommendations, getCurrentManaForCard } from '../lib/balancerEngine';

interface BalancerContextType {
  balances: DynamicCardBalance[];
  recommendations: BalanceRecommendation[];
  getManaForCard: (cardId: string) => number;
  recomputeRecommendations: () => void;
  applyRecommendation: (cardId: string) => void;
  applyAllRecommendations: () => void;
  resetBalances: () => void;
  BALANCER_IMMUTABLE: boolean;
}

const BalancerContext = createContext<BalancerContextType | undefined>(undefined);

const STORAGE_KEY = 'retro-mythereum-balancer-v1';
const BALANCER_IMMUTABLE = false; // Set to true to prevent balance changes

/**
 * BalancerProvider - PRIORITY 2: Context isolation with defensive guards.
 * 
 * Architectural Improvements:
 * ✅ useRef guard (isUpdatingRef) to prevent circular updates with TelemetryContext
 * ✅ Debounced recommendation recomputation (500ms) to prevent excessive calculations
 * ✅ No direct writes to other contexts - emit-style pattern only
 * ✅ All methods memoized with useCallback for stable references
 */
export function BalancerProvider({ children }: { children: React.ReactNode }) {
  const { summary, engineParams } = useTelemetry();

  const [balances, setBalances] = useState<DynamicCardBalance[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [recommendations, setRecommendations] = useState<BalanceRecommendation[]>([]);
  
  // PRIORITY 2: Use ref to track if we're currently updating to prevent circular updates
  const isUpdatingRef = useRef(false);

  // PRIORITY 3: Diagnostic logging
  const renderCountRef = useRef(0);
  if (import.meta.env.DEV) {
    renderCountRef.current++;
    if (renderCountRef.current % 20 === 0) {
      console.debug('[BalancerContext] Render count:', renderCountRef.current);
    }
  }

  // Save to localStorage whenever balances change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
  }, [balances]);

  // PRIORITY 2: All methods memoized with useCallback for stable references
  const getManaForCard = useCallback((cardId: string): number => {
    return getCurrentManaForCard(cardId, balances);
  }, [balances]);

  const recomputeRecommendations = useCallback(() => {
    // PRIORITY 2: Prevent circular updates
    if (isUpdatingRef.current) {
      if (import.meta.env.DEV) {
        console.debug('[BalancerContext] Skipping recompute - update in progress');
      }
      return;
    }
    
    isUpdatingRef.current = true;
    try {
      if (import.meta.env.DEV) {
        console.debug('[BalancerContext] Recomputing recommendations');
      }
      
      const newRecommendations = computeBalanceRecommendations(summary, engineParams, balances);
      setRecommendations(newRecommendations);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [summary, engineParams, balances]);

  const applyRecommendation = useCallback((cardId: string) => {
    if (BALANCER_IMMUTABLE) return;

    const recommendation = recommendations.find(r => r.cardId === cardId);
    if (!recommendation || recommendation.suggestedMana === recommendation.currentMana) return;

    if (import.meta.env.DEV) {
      console.debug('[BalancerContext] Applying recommendation for:', cardId);
    }

    setBalances(prev => {
      const existing = prev.find(b => b.cardId === cardId);
      const newBalance: DynamicCardBalance = {
        cardId,
        manaCostOverride: recommendation.suggestedMana,
        reason: recommendation.reason,
        appliedAt: Date.now(),
      };

      if (existing) {
        return prev.map(b => b.cardId === cardId ? newBalance : b);
      } else {
        return [...prev, newBalance];
      }
    });
  }, [recommendations]);

  const applyAllRecommendations = useCallback(() => {
    if (BALANCER_IMMUTABLE) return;

    if (import.meta.env.DEV) {
      console.debug('[BalancerContext] Applying all recommendations');
    }

    const newBalances: DynamicCardBalance[] = recommendations
      .filter(r => r.suggestedMana !== r.currentMana)
      .map(r => ({
        cardId: r.cardId,
        manaCostOverride: r.suggestedMana,
        reason: r.reason,
        appliedAt: Date.now(),
      }));

    setBalances(prev => {
      const merged = [...prev];
      newBalances.forEach(newBalance => {
        const index = merged.findIndex(b => b.cardId === newBalance.cardId);
        if (index >= 0) {
          merged[index] = newBalance;
        } else {
          merged.push(newBalance);
        }
      });
      return merged;
    });
  }, [recommendations]);

  const resetBalances = useCallback(() => {
    if (BALANCER_IMMUTABLE) return;
    
    if (import.meta.env.DEV) {
      console.debug('[BalancerContext] Resetting all balances');
    }
    
    setBalances([]);
    setRecommendations([]);
  }, []);

  // PRIORITY 2: Debounced auto-recompute (500ms) to prevent excessive recalculations
  useEffect(() => {
    const timer = setTimeout(() => {
      recomputeRecommendations();
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [summary.totalBattles, summary.lastUpdated, engineParams]); // Only depend on specific fields

  return (
    <BalancerContext.Provider
      value={{
        balances,
        recommendations,
        getManaForCard,
        recomputeRecommendations,
        applyRecommendation,
        applyAllRecommendations,
        resetBalances,
        BALANCER_IMMUTABLE,
      }}
    >
      {children}
    </BalancerContext.Provider>
  );
}

export function useBalancer() {
  const context = useContext(BalancerContext);
  if (!context) {
    throw new Error('useBalancer must be used within BalancerProvider');
  }
  return context;
}
