import { Outlet, Link, useLocation } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Sword, Castle, Users, Swords, Trophy, ShoppingBag, Hammer, User, Bell, FlaskConical } from 'lucide-react';

export default function Layout() {
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();
  const queryClient = useQueryClient();
  const location = useLocation();

  const isAuthenticated = !!identity;

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const navItems = [
    { path: '/', label: 'Home', icon: Sword },
    { path: '/strongholds', label: 'Strongholds', icon: Castle },
    { path: '/heroes', label: 'Heroes', icon: Users },
    { path: '/battlegrounds', label: 'Battlegrounds', icon: Swords },
    { path: '/tournaments', label: 'Tournaments', icon: Trophy },
    { path: '/market', label: 'Market', icon: ShoppingBag },
    { path: '/forge', label: 'Forge', icon: Hammer },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/notifications', label: 'Notifications', icon: Bell },
  ];

  const adminNavItems = [
    { path: '/admin/balancer-lab', label: 'Balancer Lab', icon: FlaskConical, badge: 'Dev' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-950 via-amber-900 to-slate-900">
      <div className="absolute inset-0 bg-[url('/assets/generated/app-background.dim_1920x1080.png')] bg-cover bg-center opacity-30 pointer-events-none" />
      
      <header className="relative z-10 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/90 to-slate-900/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src="/assets/generated/mythereum-logo.dim_400x150.png" alt="Mythereum" className="h-12 w-auto" />
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-amber-200/70 hover:text-amber-300 hover:bg-amber-500/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {isAuthenticated && adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-purple-200/70 hover:text-purple-300 hover:bg-purple-500/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="text-xs bg-purple-600/40 text-purple-300 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <Button
              onClick={handleAuth}
              disabled={isLoggingIn}
              className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold px-6 py-2 rounded-lg shadow-lg shadow-amber-500/30 transition-all"
            >
              {isLoggingIn ? 'Connecting...' : isAuthenticated ? 'Logout' : 'Login'}
            </Button>
          </div>

          <nav className="lg:hidden flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-amber-200/70 hover:text-amber-300 hover:bg-amber-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
            {isAuthenticated && adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'text-purple-200/70 hover:text-purple-300 hover:bg-purple-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="text-xs bg-purple-600/40 text-purple-300 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-amber-500/20 bg-gradient-to-r from-slate-900/90 to-amber-950/90 backdrop-blur-sm py-6">
        <div className="container mx-auto px-4 text-center text-amber-200/60 text-sm">
          © 2025. Built with ❤️ using{' '}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 transition-colors">
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
