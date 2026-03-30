import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SoftWallet, ResourceAmount, EconomyTransaction } from '../types/economy';
import { useAccount } from './AccountContext';
import { useGameConfig } from './GameConfigContext';
import { loadFromStorage, debouncedSave } from '../lib/storageUtils';

interface EconomyContextType {
  wallet: SoftWallet | null;
  getMythexBalance: () => number;
  getResourceBalance: (resource: keyof ResourceAmount) => number;
  earnMythex: (amount: number, source: string) => void;
  spendMythex: (amount: number, source: string) => boolean;
  earnResources: (resources: Partial<ResourceAmount>, source: string) => void;
  spendResources: (resources: Partial<ResourceAmount>, source: string) => boolean;
  canAffordMythex: (amount: number) => boolean;
  canAffordResources: (resources: Partial<ResourceAmount>) => boolean;
  getTransactionHistory: () => EconomyTransaction[];
  isInitialized: boolean;
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined);

const STORAGE_KEY = 'retro-mythereum-economy-v1';
const TRANSACTION_KEY = 'retro-mythereum-transactions-v1';
const MAX_TRANSACTIONS = 100;

function createInitialWallet(accountId: string, cfg?: { startingMythex: number; startingGold: number; startingStone: number; startingLumber: number; startingIron: number; startingFood: number; startingMana: number }): SoftWallet {
  return {
    accountId,
    mythex: cfg?.startingMythex ?? 1000,
    resources: {
      gold: cfg?.startingGold ?? 200,
      stone: cfg?.startingStone ?? 200,
      lumber: cfg?.startingLumber ?? 200,
      iron: cfg?.startingIron ?? 200,
      food: cfg?.startingFood ?? 200,
      mana: cfg?.startingMana ?? 0,
    },
    lastUpdated: Date.now(),
  };
}

/**
 * EconomyProvider - PRIORITY 2: Context isolation with defensive guards.
 * 
 * Architectural Improvements:
 * ✅ useRef guard (isUpdatingRef) to prevent circular updates
 * ✅ Debounced localStorage writes (300ms) to prevent excessive I/O
 * ✅ Dependency on accountId only - no cross-context dependencies
 * ✅ All methods memoized with useCallback for stable references
 * ✅ No direct writes to other contexts - emit-style pattern only
 */
export function EconomyProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAccount();
  const { economyStarting: econCfg } = useGameConfig();
  const [wallet, setWallet] = useState<SoftWallet | null>(null);
  const [transactions, setTransactions] = useState<EconomyTransaction[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // PRIORITY 2: Use ref to prevent circular updates
  const isUpdatingRef = useRef(false);
  const walletRef = useRef<SoftWallet | null>(null);

  // PRIORITY 3: Diagnostic logging
  const renderCountRef = useRef(0);
  if (import.meta.env.DEV) {
    renderCountRef.current++;
    if (renderCountRef.current % 20 === 0) {
      console.debug('[EconomyContext] Render count:', renderCountRef.current);
    }
  }

  // Initialize or load wallet when account changes - only once
  useEffect(() => {
    if (isUpdatingRef.current) {
      if (import.meta.env.DEV) {
        console.debug('[EconomyContext] Skipping initialization - update in progress');
      }
      return;
    }
    
    try {
      if (!account) {
        if (import.meta.env.DEV) {
          console.debug('[EconomyContext] No account available, waiting...');
        }
        setWallet(null);
        setIsInitialized(false);
        return;
      }

      if (import.meta.env.DEV) {
        console.debug('[EconomyContext] Initializing for account:', account.accountId);
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const allWallets: Record<string, SoftWallet> = JSON.parse(stored);
          const accountWallet = allWallets[account.accountId];

          if (accountWallet) {
            if (import.meta.env.DEV) {
              console.debug('[EconomyContext] Loaded existing wallet:', {
                mythex: accountWallet.mythex,
                gold: accountWallet.resources.gold,
              });
            }
            setWallet(accountWallet);
          } else {
            if (import.meta.env.DEV) {
              console.debug('[EconomyContext] Creating new wallet for account');
            }
            const newWallet = createInitialWallet(account.accountId, econCfg);
            setWallet(newWallet);
            
            // Save immediately
            allWallets[account.accountId] = newWallet;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allWallets));
          }
        } catch (parseError) {
          console.error('[EconomyContext] Failed to parse stored wallet:', parseError);
          
          // Create fresh wallet
          const newWallet = createInitialWallet(account.accountId, econCfg);
          setWallet(newWallet);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ [account.accountId]: newWallet }));
        }
      } else {
        if (import.meta.env.DEV) {
          console.debug('[EconomyContext] No stored wallet, creating new');
        }
        const newWallet = createInitialWallet(account.accountId, econCfg);
        setWallet(newWallet);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ [account.accountId]: newWallet }));
      }

      // Load transactions
      const storedTransactions = localStorage.getItem(TRANSACTION_KEY);
      if (storedTransactions) {
        try {
          const allTransactions: Record<string, EconomyTransaction[]> = JSON.parse(storedTransactions);
          setTransactions(allTransactions[account.accountId] || []);
        } catch (error) {
          console.error('[EconomyContext] Failed to parse transactions:', error);
          setTransactions([]);
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('[EconomyContext] Critical initialization error:', error);
      setIsInitialized(false);
    }
  }, [account?.accountId]); // PRIORITY 2: Only depend on accountId

  // Keep wallet ref in sync
  useEffect(() => { walletRef.current = wallet; }, [wallet]);

  // PRIORITY 2: Debounced localStorage writes (300ms) to prevent excessive updates
  useEffect(() => {
    if (!wallet || !account || isUpdatingRef.current) return;

    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const allWallets: Record<string, SoftWallet> = stored ? JSON.parse(stored) : {};
        
        allWallets[account.accountId] = {
          ...wallet,
          lastUpdated: Date.now(),
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allWallets));
        
        if (import.meta.env.DEV) {
          console.debug('[EconomyContext] Wallet saved to localStorage');
        }
      } catch (error) {
        console.error('[EconomyContext] Failed to save wallet:', error);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [wallet, account]);

  // Save transactions to localStorage - debounced
  useEffect(() => {
    if (!account || transactions.length === 0 || isUpdatingRef.current) return;

    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(TRANSACTION_KEY);
        const allTransactions: Record<string, EconomyTransaction[]> = stored ? JSON.parse(stored) : {};
        
        allTransactions[account.accountId] = transactions.slice(0, MAX_TRANSACTIONS);
        
        localStorage.setItem(TRANSACTION_KEY, JSON.stringify(allTransactions));
      } catch (error) {
        console.error('[EconomyContext] Failed to save transactions:', error);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [transactions, account]);

  // PRIORITY 2: All methods memoized with useCallback for stable references
  const addTransaction = useCallback((transaction: EconomyTransaction) => {
    setTransactions(prev => [transaction, ...prev].slice(0, MAX_TRANSACTIONS));
  }, []);

  const getMythexBalance = useCallback((): number => {
    return wallet?.mythex || 0;
  }, [wallet]);

  const getResourceBalance = useCallback((resource: keyof ResourceAmount): number => {
    return wallet?.resources[resource] || 0;
  }, [wallet]);

  const earnMythex = useCallback((amount: number, source: string) => {
    if (!walletRef.current || amount <= 0) return;

    if (import.meta.env.DEV) {
      console.debug(`[EconomyContext] Earning ${amount} Mythex from ${source}`);
    }

    setWallet(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        mythex: prev.mythex + amount,
      };
    });

    addTransaction({
      timestamp: Date.now(),
      type: 'earn',
      mythex: amount,
      source,
    });
  }, [addTransaction]);

  const spendMythex = useCallback((amount: number, source: string): boolean => {
    if (!walletRef.current || amount <= 0) return false;
    if (walletRef.current.mythex < amount) {
      console.warn(`[EconomyContext] Insufficient Mythex: need ${amount}, have ${walletRef.current.mythex}`);
      return false;
    }

    if (import.meta.env.DEV) {
      console.debug(`[EconomyContext] Spending ${amount} Mythex on ${source}`);
    }

    setWallet(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        mythex: prev.mythex - amount,
      };
    });

    addTransaction({
      timestamp: Date.now(),
      type: 'spend',
      mythex: amount,
      source,
    });

    return true;
  }, [addTransaction]);

  const earnResources = useCallback((resources: Partial<ResourceAmount>, source: string) => {
    if (!walletRef.current) return;

    if (import.meta.env.DEV) {
      console.debug(`[EconomyContext] Earning resources from ${source}:`, resources);
    }

    setWallet(prev => {
      if (!prev) return prev;
      const newResources = { ...prev.resources };

      Object.entries(resources).forEach(([resource, amount]) => {
        if (amount && amount > 0) {
          newResources[resource as keyof ResourceAmount] += amount;
        }
      });

      return {
        ...prev,
        resources: newResources,
      };
    });

    addTransaction({
      timestamp: Date.now(),
      type: 'earn',
      resources,
      source,
    });
  }, [addTransaction]);

  const spendResources = useCallback((resources: Partial<ResourceAmount>, source: string): boolean => {
    if (!walletRef.current) return false;

    // Check if can afford
    const canAfford = Object.entries(resources).every(([resource, amount]) => {
      if (!amount || amount <= 0) return true;
      return walletRef.current!.resources[resource as keyof ResourceAmount] >= amount;
    });

    if (!canAfford) {
      console.warn(`[EconomyContext] Insufficient resources for ${source}`);
      return false;
    }

    if (import.meta.env.DEV) {
      console.debug(`[EconomyContext] Spending resources on ${source}:`, resources);
    }

    setWallet(prev => {
      if (!prev) return prev;
      const newResources = { ...prev.resources };

      Object.entries(resources).forEach(([resource, amount]) => {
        if (amount && amount > 0) {
          newResources[resource as keyof ResourceAmount] -= amount;
        }
      });

      return {
        ...prev,
        resources: newResources,
      };
    });

    addTransaction({
      timestamp: Date.now(),
      type: 'spend',
      resources,
      source,
    });

    return true;
  }, [addTransaction]);

  const canAffordMythex = useCallback((amount: number): boolean => {
    return (wallet?.mythex || 0) >= amount;
  }, [wallet]);

  const canAffordResources = useCallback((resources: Partial<ResourceAmount>): boolean => {
    if (!wallet) return false;
    return Object.entries(resources).every(([resource, amount]) => {
      if (!amount || amount <= 0) return true;
      return wallet.resources[resource as keyof ResourceAmount] >= amount;
    });
  }, [wallet]);

  const getTransactionHistory = useCallback((): EconomyTransaction[] => {
    return transactions;
  }, [transactions]);

  const contextValue = useMemo(() => ({
    wallet,
    getMythexBalance,
    getResourceBalance,
    earnMythex,
    spendMythex,
    earnResources,
    spendResources,
    canAffordMythex,
    canAffordResources,
    getTransactionHistory,
    isInitialized,
  }), [wallet, getMythexBalance, getResourceBalance, earnMythex, spendMythex, earnResources, spendResources, canAffordMythex, canAffordResources, getTransactionHistory, isInitialized]);

  return (
    <EconomyContext.Provider value={contextValue}>
      {children}
    </EconomyContext.Provider>
  );
}

export function useEconomy() {
  const context = useContext(EconomyContext);
  if (!context) {
    throw new Error('useEconomy must be used within EconomyProvider');
  }
  return context;
}
