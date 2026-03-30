export interface PlayerAccount {
  accountId: string;
  displayName: string;
  email?: string;
  createdAt: number;
  linkedWallet?: LinkedWalletInfo;
}

export interface LinkedWalletInfo {
  address: string;
  connectedAt: number;
  isActive: boolean;
}

export interface OnboardingFlags {
  hasSeenWelcome: boolean;
  hasCompletedTutorial: boolean;
}
