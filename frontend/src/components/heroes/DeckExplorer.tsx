import { useState } from 'react';
import { useHeroes } from '../../context/HeroesContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Plus, Swords, Zap, Users } from 'lucide-react';
import { DeckRole } from '../../types/heroes';

interface DeckExplorerProps {
  selectedDeckId: string | null;
  onSelectDeck: (deckId: string | null) => void;
}

export default function DeckExplorer({ selectedDeckId, onSelectDeck }: DeckExplorerProps) {
  const { decksWithPower, createDeck } = useHeroes();
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckRole, setNewDeckRole] = useState<DeckRole>('general');

  const handleCreateDeck = () => {
    if (newDeckName.trim()) {
      const deckId = createDeck(newDeckName.trim(), newDeckRole);
      onSelectDeck(deckId);
      setNewDeckName('');
      setNewDeckRole('general');
      setIsCreatingDeck(false);
    }
  };

  const getRoleIcon = (role: DeckRole) => {
    switch (role) {
      case 'raid': return '⚔️';
      case 'defence': return '🛡️';
      case 'tournament': return '🏆';
      default: return '⭐';
    }
  };

  const getRoleColor = (role: DeckRole) => {
    switch (role) {
      case 'raid': return 'text-red-400';
      case 'defence': return 'text-blue-400';
      case 'tournament': return 'text-purple-400';
      default: return 'text-amber-400';
    }
  };

  return (
    <Card className="bg-retro-panel border-retro-gold backdrop-blur-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-400 flex items-center gap-2 text-xl">
          <Swords className="w-6 h-6" />
          Decks Explorer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Deck Button */}
        {!isCreatingDeck ? (
          <Button
            onClick={() => setIsCreatingDeck(true)}
            className="w-full bg-retro-gold text-black hover:bg-white font-bold py-6 text-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Deck
          </Button>
        ) : (
          <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-amber-500/30">
            <Input
              placeholder="Deck name..."
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              className="bg-slate-800 border-amber-500/30 text-amber-100"
              autoFocus
            />
            <Select value={newDeckRole} onValueChange={(v) => setNewDeckRole(v as DeckRole)}>
              <SelectTrigger className="bg-slate-800 border-amber-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">⭐ General</SelectItem>
                <SelectItem value="raid">⚔️ Raid</SelectItem>
                <SelectItem value="defence">🛡️ Defence</SelectItem>
                <SelectItem value="tournament">🏆 Tournament</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateDeck}
                className="flex-1 bg-retro-gold text-black hover:bg-white font-bold"
              >
                Create
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreatingDeck(false);
                  setNewDeckName('');
                }}
                className="flex-1 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <Separator className="bg-amber-500/20" />

        {/* Decks List */}
        <ScrollArea className="h-[600px] pr-3">
          <div className="space-y-3">
            {decksWithPower.map((deck) => {
              const isActive = selectedDeckId === deck.id;
              return (
                <Card
                  key={deck.id}
                  className={`cursor-pointer transition-all ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/50 ring-2 ring-amber-400'
                      : 'bg-slate-900/50 border-amber-500/20 hover:border-amber-400/50 hover:bg-slate-800/60'
                  }`}
                  onClick={() => onSelectDeck(deck.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-bold text-amber-400 text-lg leading-tight">
                          {deck.name}
                        </div>
                        <div className={`text-sm capitalize flex items-center gap-1 mt-1 ${getRoleColor(deck.role)}`}>
                          <span>{getRoleIcon(deck.role)}</span>
                          <span>{deck.role}</span>
                        </div>
                      </div>
                      {isActive && (
                        <div className="text-amber-400 text-xs font-bold bg-amber-500/20 px-2 py-1 rounded">
                          ACTIVE
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-amber-500/20">
                      <div className="flex items-center gap-1 text-amber-300/70">
                        <Users className="w-4 h-4" />
                        <span className="font-semibold">{deck.cardCount}</span>
                        <span>cards</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Zap className="w-4 h-4" />
                        <span className="text-lg">{deck.totalPower}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {decksWithPower.length === 0 && !isCreatingDeck && (
          <div className="text-center py-8 text-amber-300/50">
            <Swords className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No decks yet. Create your first deck!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
