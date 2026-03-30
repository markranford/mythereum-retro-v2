import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { GameConfig, CardOverride } from '../types/gameConfig';
import { DEFAULT_GAME_CONFIG } from '../config/gameConfigDefaults';
import { CARD_LIBRARY } from '../lib/mockData';
import { CardData } from '../types/game';

// --- Types ---

interface GameConfigContextType {
  config: GameConfig;
  /** Get a card's data with any admin overrides merged in */
  getCardWithOverrides: (cardId: string) => CardData | undefined;
}

interface GameConfigAdminContextType {
  /** Partially update one config category */
  updateCategory: <K extends keyof GameConfig>(category: K, values: Partial<GameConfig[K]>) => void;
  /** Reset one category to defaults */
  resetCategory: (category: keyof GameConfig) => void;
  /** Reset entire config to defaults */
  resetAll: () => void;
  /** Set a per-card stat override */
  setCardOverride: (cardId: string, override: CardOverride) => void;
  /** Remove a per-card override */
  clearCardOverride: (cardId: string) => void;
  /** Profile management */
  activeProfileName: string;
  profileNames: string[];
  saveProfile: (name: string) => void;
  loadProfile: (name: string) => void;
  deleteProfile: (name: string) => void;
  renameProfile: (oldName: string, newName: string) => void;
}

const GameConfigContext = createContext<GameConfigContextType | undefined>(undefined);
const GameConfigAdminContext = createContext<GameConfigAdminContextType | undefined>(undefined);

const STORAGE_KEY = 'retro-mythereum-gameconfig-v1';
const PROFILES_KEY = 'retro-mythereum-gameconfig-profiles-v1';
const ACTIVE_PROFILE_KEY = 'retro-mythereum-gameconfig-active-profile-v1';

// --- Deep merge: stored values over defaults (handles new keys added in code) ---

function deepMergeConfig(defaults: GameConfig, stored: Partial<GameConfig>): GameConfig {
  const result = { ...defaults };

  for (const key of Object.keys(defaults) as (keyof GameConfig)[]) {
    if (key === 'cardOverrides') {
      // Card overrides: merge at per-card level
      result.cardOverrides = { ...defaults.cardOverrides, ...(stored.cardOverrides || {}) };
    } else if (stored[key] !== undefined && typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
      // Object categories: spread defaults then stored
      (result as any)[key] = { ...defaults[key], ...(stored[key] as any) };
    } else if (stored[key] !== undefined) {
      // Primitives and arrays: stored replaces default
      (result as any)[key] = stored[key];
    }
  }

  return result;
}

// --- Provider ---

export function GameConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GameConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return deepMergeConfig(DEFAULT_GAME_CONFIG, parsed);
      }
    } catch (e) {
      console.error('[GameConfig] Failed to load stored config:', e);
    }
    return { ...DEFAULT_GAME_CONFIG };
  });

  // --- Profile state ---
  const [activeProfileName, setActiveProfileName] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || 'Default';
  });

  const [profiles, setProfiles] = useState<Record<string, GameConfig>>(() => {
    try {
      const stored = localStorage.getItem(PROFILES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  // Debounced localStorage write (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileName);
    }, 300);
    return () => clearTimeout(timer);
  }, [config, activeProfileName]);

  // Save profiles when they change
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    }, 300);
    return () => clearTimeout(timer);
  }, [profiles]);

  // --- Read helpers ---

  const getCardWithOverrides = useCallback((cardId: string): CardData | undefined => {
    const base = CARD_LIBRARY.find(c => c.id === cardId);
    if (!base) return undefined;
    const overrides = config.cardOverrides[cardId];
    if (!overrides) return base;
    return {
      ...base,
      attack: overrides.attack ?? base.attack,
      defense: overrides.defense ?? base.defense,
      cost: overrides.cost ?? base.cost,
      power: overrides.power ?? base.power,
    };
  }, [config.cardOverrides]);

  // --- Admin mutators (stable callbacks) ---

  const updateCategory = useCallback(<K extends keyof GameConfig>(category: K, values: Partial<GameConfig[K]>) => {
    setConfig(prev => {
      const prevCategory = prev[category];
      if (typeof prevCategory === 'object' && !Array.isArray(prevCategory)) {
        return { ...prev, [category]: { ...prevCategory, ...values } };
      }
      return { ...prev, [category]: values as GameConfig[K] };
    });
  }, []);

  const resetCategory = useCallback((category: keyof GameConfig) => {
    setConfig(prev => ({ ...prev, [category]: DEFAULT_GAME_CONFIG[category] }));
  }, []);

  const resetAll = useCallback(() => {
    setConfig({ ...DEFAULT_GAME_CONFIG, cardOverrides: {} });
  }, []);

  const setCardOverride = useCallback((cardId: string, override: CardOverride) => {
    setConfig(prev => ({
      ...prev,
      cardOverrides: { ...prev.cardOverrides, [cardId]: { ...(prev.cardOverrides[cardId] || {}), ...override } },
    }));
  }, []);

  const clearCardOverride = useCallback((cardId: string) => {
    setConfig(prev => {
      const { [cardId]: _, ...rest } = prev.cardOverrides;
      return { ...prev, cardOverrides: rest };
    });
  }, []);

  // --- Profile management ---

  const profileNames = useMemo(() => Object.keys(profiles).sort(), [profiles]);

  const saveProfile = useCallback((name: string) => {
    setProfiles(prev => ({ ...prev, [name]: JSON.parse(JSON.stringify(config)) }));
    setActiveProfileName(name);
  }, [config]);

  const loadProfile = useCallback((name: string) => {
    setProfiles(prev => {
      const profile = prev[name];
      if (profile) {
        setConfig(deepMergeConfig(DEFAULT_GAME_CONFIG, profile));
        setActiveProfileName(name);
      }
      return prev;
    });
  }, []);

  const deleteProfile = useCallback((name: string) => {
    setProfiles(prev => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
    setActiveProfileName(prev => prev === name ? 'Default' : prev);
  }, []);

  const renameProfile = useCallback((oldName: string, newName: string) => {
    setProfiles(prev => {
      const { [oldName]: profileData, ...rest } = prev;
      if (!profileData) return prev;
      return { ...rest, [newName]: profileData };
    });
    setActiveProfileName(prev => prev === oldName ? newName : prev);
  }, []);

  // --- Context values (memoized) ---

  const configValue = useMemo(() => ({
    config,
    getCardWithOverrides,
  }), [config, getCardWithOverrides]);

  const adminValue = useMemo(() => ({
    updateCategory,
    resetCategory,
    resetAll,
    setCardOverride,
    clearCardOverride,
    activeProfileName,
    profileNames,
    saveProfile,
    loadProfile,
    deleteProfile,
    renameProfile,
  }), [updateCategory, resetCategory, resetAll, setCardOverride, clearCardOverride, activeProfileName, profileNames, saveProfile, loadProfile, deleteProfile, renameProfile]);

  return (
    <GameConfigContext.Provider value={configValue}>
      <GameConfigAdminContext.Provider value={adminValue}>
        {children}
      </GameConfigAdminContext.Provider>
    </GameConfigContext.Provider>
  );
}

// --- Hooks ---

export function useGameConfig(): GameConfig {
  const ctx = useContext(GameConfigContext);
  if (!ctx) throw new Error('useGameConfig must be used within GameConfigProvider');
  return ctx.config;
}

export function useGameConfigHelpers() {
  const ctx = useContext(GameConfigContext);
  if (!ctx) throw new Error('useGameConfigHelpers must be used within GameConfigProvider');
  return { getCardWithOverrides: ctx.getCardWithOverrides };
}

export function useGameConfigAdmin(): GameConfigAdminContextType {
  const ctx = useContext(GameConfigAdminContext);
  if (!ctx) throw new Error('useGameConfigAdmin must be used within GameConfigProvider');
  return ctx;
}
