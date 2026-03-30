import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Sword, Wallet } from 'lucide-react';

interface WelcomeModalProps {
  onPlayAsGuest: (displayName: string, email?: string) => void;
}

export default function WelcomeModal({ onPlayAsGuest }: WelcomeModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  const handlePlayAsGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      onPlayAsGuest(displayName.trim(), email.trim() || undefined);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="bg-slate-800 border-amber-500/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-400 text-3xl font-bold text-center">
            Welcome to Mythereum Retro
          </DialogTitle>
          <DialogDescription className="text-amber-200/70 text-center">
            Begin your journey through the ancient realms of card battles and strategic conquest.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <form onSubmit={handlePlayAsGuest} className="space-y-4">
            <div>
              <Label htmlFor="displayName" className="text-amber-300">
                Display Name *
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your warrior name"
                className="bg-slate-900 border-amber-500/30 text-amber-100 placeholder:text-amber-200/40"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-amber-300">
                Email (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-slate-900 border-amber-500/30 text-amber-100 placeholder:text-amber-200/40"
              />
              <p className="text-xs text-amber-200/50 mt-1">
                For future updates and account recovery
              </p>
            </div>

            <Button
              type="submit"
              disabled={!displayName.trim()}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold py-3 shadow-lg shadow-amber-500/30"
            >
              <Sword className="w-4 h-4 mr-2" />
              Play as Guest
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-amber-500/20"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-800 px-2 text-amber-200/50">Coming Soon</span>
            </div>
          </div>

          <Button
            disabled
            className="w-full bg-slate-700/50 text-amber-200/40 cursor-not-allowed py-3"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Link Wallet (Coming Soon)
          </Button>

          <p className="text-xs text-amber-200/50 text-center">
            Start playing immediately as a guest. You'll receive <span className="text-amber-400 font-semibold">1000 Soft Mythex</span> to begin your adventure!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
