import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlayerAccount, OnboardingFlags } from '../types/account';

interface AccountContextType {
  account: PlayerAccount | null;
  onboardingFlags: OnboardingFlags;
  createGuestAccount: (displayName: string, email?: string) => void;
  updateDisplayName: (name: string) => void;
  updateEmail: (email: string) => void;
  markWelcomeSeen: () => void;
  getReferralLink: () => string;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = 'retro-mythereum-account-v1';
const ONBOARDING_KEY = 'retro-mythereum-onboarding-v1';

function generateAccountId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<PlayerAccount | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[AccountContext] Loaded existing account:', parsed.accountId);
        return parsed;
      }
    } catch (error) {
      console.error('[AccountContext] Failed to load account:', error);
    }
    return null;
  });

  const [onboardingFlags, setOnboardingFlags] = useState<OnboardingFlags>(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[AccountContext] Failed to load onboarding flags:', error);
    }
    return {
      hasSeenWelcome: false,
      hasCompletedTutorial: false,
    };
  });

  // Save account to localStorage whenever it changes
  useEffect(() => {
    if (account) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
        console.log('[AccountContext] Account saved:', account.accountId);
      } catch (error) {
        console.error('[AccountContext] Failed to save account:', error);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [account]);

  // Save onboarding flags to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboardingFlags));
    } catch (error) {
      console.error('[AccountContext] Failed to save onboarding flags:', error);
    }
  }, [onboardingFlags]);

  const createGuestAccount = useCallback((displayName: string, email?: string) => {
    const newAccount: PlayerAccount = {
      accountId: generateAccountId(),
      displayName,
      email,
      createdAt: Date.now(),
    };
    console.log('[AccountContext] Creating new guest account:', newAccount.accountId);
    setAccount(newAccount);
  }, []);

  const updateDisplayName = useCallback((name: string) => {
    if (!account) return;
    setAccount({
      ...account,
      displayName: name,
    });
  }, [account]);

  const updateEmail = useCallback((email: string) => {
    if (!account) return;
    setAccount({
      ...account,
      email,
    });
  }, [account]);

  const markWelcomeSeen = useCallback(() => {
    setOnboardingFlags({
      ...onboardingFlags,
      hasSeenWelcome: true,
    });
  }, [onboardingFlags]);

  const getReferralLink = useCallback((): string => {
    if (!account) return '';
    return `${window.location.origin}?ref=${account.accountId}`;
  }, [account]);

  return (
    <AccountContext.Provider
      value={{
        account,
        onboardingFlags,
        createGuestAccount,
        updateDisplayName,
        updateEmail,
        markWelcomeSeen,
        getReferralLink,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return context;
}
