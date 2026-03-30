import { RouterProvider, createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from './hooks/useQueries';
import { AccountProvider, useAccount } from './context/AccountContext';
import { EconomyProvider } from './context/EconomyContext';
import { ProgressProvider } from './context/ProgressContext';
import { StrongholdProvider } from './context/StrongholdContext';
import { HeroesProvider } from './context/HeroesContext';
import { MarketProvider } from './context/MarketContext';
import { TournamentsProvider } from './context/TournamentsContext';
import { TelemetryProvider } from './context/TelemetryContext';
import { BalancerProvider } from './context/BalancerContext';
import { Toaster } from './components/ui/sonner';
import { Alert, AlertDescription } from './components/ui/alert';
import { AlertCircle } from 'lucide-react';
import Layout from './components/Layout';
import ProfileSetupModal from './components/ProfileSetupModal';
import WelcomeModal from './components/WelcomeModal';
import ProgressSync from './components/ProgressSync';
import HomePage from './pages/HomePage';
import StrongholdsPage from './pages/StrongholdsPage';
import HeroesPage from './pages/HeroesPage';
import BattlegroundsPage from './pages/BattlegroundsPage';
import TournamentsPage from './pages/TournamentsPage';
import MarketPage from './pages/MarketPage';
import ForgePage from './pages/ForgePage';
import ProfilePage from './pages/ProfilePage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminBalancerLabPage from './pages/AdminBalancerLabPage';
import React from 'react';

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const strongholdsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/strongholds',
  component: StrongholdsPage,
});

const heroesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/heroes',
  component: HeroesPage,
});

const battlegroundsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/battlegrounds',
  component: BattlegroundsPage,
});

const tournamentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tournaments',
  component: TournamentsPage,
});

const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/market',
  component: MarketPage,
});

const forgeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forge',
  component: ForgePage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

const profileSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/settings',
  component: ProfileSettingsPage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notifications',
  component: NotificationsPage,
});

const adminBalancerLabRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/balancer-lab',
  component: AdminBalancerLabPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  strongholdsRoute,
  heroesRoute,
  battlegroundsRoute,
  tournamentsRoute,
  marketRoute,
  forgeRoute,
  profileRoute,
  profileSettingsRoute,
  notificationsRoute,
  adminBalancerLabRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('[ErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    console.error('[ErrorBoundary] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-950 via-amber-900 to-slate-900 p-4">
          <div className="max-w-2xl w-full">
            <Alert className="bg-red-950/50 border-red-600/50">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <AlertDescription className="text-red-300 space-y-2">
                <div className="font-bold text-lg">Application Error</div>
                <div>
                  {this.state.error?.message || 'An unexpected error occurred'}
                </div>
                <div className="text-sm text-red-200/70 mt-4">
                  Please try refreshing the page. If the problem persists, clear your browser cache and local storage.
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold"
                >
                  Reload Application
                </button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const { mutate: saveProfile } = useSaveCallerUserProfile();
  const { account, onboardingFlags, createGuestAccount, markWelcomeSeen } = useAccount();

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;
  const showWelcomeModal = !account && !onboardingFlags.hasSeenWelcome;

  // Log initialization status
  React.useEffect(() => {
    console.log('[App] Initialization status:', {
      isInitializing,
      isAuthenticated,
      hasAccount: !!account,
      hasSeenWelcome: onboardingFlags.hasSeenWelcome,
    });
  }, [isInitializing, isAuthenticated, account, onboardingFlags]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-950 via-amber-900 to-slate-900">
        <div className="text-amber-400 text-xl">Loading Mythereum...</div>
      </div>
    );
  }

  return (
    <>
      <ProgressSync />
      <RouterProvider router={router} />
      <Toaster />
      {showProfileSetup && (
        <ProfileSetupModal
          onSave={(name) => {
            saveProfile({ name });
          }}
        />
      )}
      {showWelcomeModal && (
        <WelcomeModal
          onPlayAsGuest={(displayName, email) => {
            try {
              console.log('[App] Creating guest account:', displayName);
              createGuestAccount(displayName, email);
              markWelcomeSeen();
            } catch (error) {
              console.error('[App] Failed to create guest account:', error);
              alert('Failed to create account. Please try again.');
            }
          }}
        />
      )}
    </>
  );
}

export default function App() {
  const [initError, setInitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Log app startup
    console.log('[App] Mythereum Retro V2 starting...');
    console.log('[App] Environment:', import.meta.env.MODE);
    console.log('[App] Provider hierarchy: AccountProvider → EconomyProvider → ProgressProvider → StrongholdProvider → HeroesProvider → MarketProvider → TournamentsProvider → TelemetryProvider → BalancerProvider');

    // Check for critical dependencies
    try {
      if (typeof localStorage === 'undefined') {
        throw new Error('localStorage is not available');
      }
      console.log('[App] localStorage check: OK');
    } catch (error) {
      console.error('[App] Critical dependency check failed:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
    }
  }, []);

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-950 via-amber-900 to-slate-900 p-4">
        <div className="max-w-2xl w-full">
          <Alert className="bg-red-950/50 border-red-600/50">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <AlertDescription className="text-red-300 space-y-2">
              <div className="font-bold text-lg">Initialization Error</div>
              <div>{initError}</div>
              <div className="text-sm text-red-200/70 mt-4">
                Your browser may not support required features. Please try a modern browser like Chrome, Firefox, or Edge.
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AccountProvider>
        <EconomyProvider>
          <ProgressProvider>
            <StrongholdProvider>
              <HeroesProvider>
                <MarketProvider>
                  <TournamentsProvider>
                    <TelemetryProvider>
                      <BalancerProvider>
                        <AppContent />
                      </BalancerProvider>
                    </TelemetryProvider>
                  </TournamentsProvider>
                </MarketProvider>
              </HeroesProvider>
            </StrongholdProvider>
          </ProgressProvider>
        </EconomyProvider>
      </AccountProvider>
    </ErrorBoundary>
  );
}
