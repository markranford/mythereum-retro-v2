import { useState } from 'react';
import { useHeroes } from '../../context/HeroesContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Edit2, Trash2, Zap, Swords, Shield, Sparkles, X } from 'lucide-react';

interface ActiveDeckPaneProps {
  selectedDeckId: string | null;
}

export default function ActiveDeckPane({ selectedDeckId }: ActiveDeckPaneProps) {
  const { heroes, decksWithPower, updateDeck, deleteDeck, removeCardFromDeck } = useHeroes();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const selectedDeck = decksWithPower.find(d => d.id === selectedDeckId);

  if (!selectedDeck) {
    return (
      <Card className="bg-retro-panel border-retro-gold backdrop-blur-sm h-full">
        <CardHeader>
          <CardTitle className="text-amber-400 text-xl">Active Deck</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[600px]">
          <div className="text-center text-amber-300/50">
            <Swords className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select a deck to view details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const deckCards = selectedDeck.cardInstanceIds
    .map(instanceId => heroes.find(h => h.instanceId === instanceId))
    .filter(Boolean);

  // Calculate stats
  const totalAttack = deckCards.reduce((sum, card) => sum + (card?.power || 0), 0);
  const totalDefense = deckCards.reduce((sum, card) => sum + Math.floor((card?.power || 0) * 0.8), 0);
  const magickGain = deckCards.reduce((sum, card) => sum + Math.floor((card?.power || 0) * 0.1), 0);

  const handleSaveName = () => {
    if (editName.trim()) {
      updateDeck(selectedDeck.id, editName.trim(), selectedDeck.cardInstanceIds);
      setIsEditingName(false);
    }
  };

  const handleDeleteDeck = () => {
    if (confirm(`Delete "${selectedDeck.name}"? This cannot be undone.`)) {
      deleteDeck(selectedDeck.id);
    }
  };

  const handleRemoveCard = (instanceId: string) => {
    removeCardFromDeck(selectedDeck.id, instanceId);
  };

  return (
    <Card className="bg-retro-panel border-retro-gold backdrop-blur-sm h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-amber-400 text-xl">Active Deck</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditName(selectedDeck.name);
                setIsEditingName(true);
              }}
              className="h-8 w-8 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteDeck}
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deck Name */}
        {isEditingName ? (
          <div className="flex gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-slate-800 border-amber-500/30 text-amber-100"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
            />
            <Button
              size="sm"
              onClick={handleSaveName}
              className="bg-retro-gold text-black hover:bg-white"
            >
              Save
            </Button>
          </div>
        ) : (
          <div className="text-2xl font-bold text-amber-400">{selectedDeck.name}</div>
        )}

        {/* Deck Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-slate-900/50 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-amber-300/70 text-xs mb-1">Card Count</div>
              <div className="text-2xl font-bold text-amber-400">{selectedDeck.cardCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-amber-300/70 text-xs mb-1">Deck Power</div>
              <div className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">
                <Zap className="w-5 h-5" />
                {selectedDeck.totalPower}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Combat Stats Table */}
        <Card className="bg-slate-900/50 border-amber-500/20">
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-semibold text-amber-400 mb-3">Combat Stats per Turn</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300/70">
                  <Swords className="w-4 h-4 text-red-400" />
                  <span>Total Attack</span>
                </div>
                <span className="font-bold text-amber-400">{totalAttack}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300/70">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Total Defense</span>
                </div>
                <span className="font-bold text-amber-400">{totalDefense}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300/70">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Magick Gain</span>
                </div>
                <span className="font-bold text-amber-400">{magickGain}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-amber-500/20" />

        {/* Cards in Deck */}
        <div>
          <div className="text-sm font-semibold text-amber-400 mb-3">Cards in Deck</div>
          <ScrollArea className="h-[350px] pr-3">
            <div className="space-y-2">
              {deckCards.map((card) => (
                <Card
                  key={card!.instanceId}
                  className="bg-slate-900/50 border-amber-500/20 hover:border-amber-400/50 transition-all"
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {/* Card Thumbnail */}
                    <div
                      className="w-12 h-16 rounded bg-slate-800 border border-amber-500/30 flex-shrink-0"
                      style={{
                        backgroundImage: 'url(/assets/generated/card-glow-border.dim_300x400.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    {/* Card Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-amber-400 truncate">{card!.name}</div>
                      <div className="text-xs text-amber-300/60">{card!.class} • Lv.{card!.level}</div>
                      <div className="flex items-center gap-1 text-amber-400 mt-1">
                        <Zap className="w-3 h-3" />
                        <span className="text-sm font-bold">{card!.power}</span>
                      </div>
                    </div>
                    {/* Remove Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveCard(card!.instanceId)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {deckCards.length === 0 && (
          <div className="text-center py-8 text-amber-300/50">
            <p className="text-sm">No cards in this deck yet.</p>
            <p className="text-xs mt-1">Add cards from your collection →</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
