import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';

interface ProfileSetupModalProps {
  onSave: (name: string) => void;
}

export default function ProfileSetupModal({ onSave }: ProfileSetupModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="bg-slate-800 border-amber-500/30">
        <DialogHeader>
          <DialogTitle className="text-amber-400 text-2xl">Welcome to Mythereum!</DialogTitle>
          <DialogDescription className="text-amber-200/70">
            Before you begin your journey, please tell us your name.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name" className="text-amber-300">
              Your Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="bg-slate-900 border-amber-500/30 text-amber-100 placeholder:text-amber-200/40"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
          >
            Begin Adventure
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
