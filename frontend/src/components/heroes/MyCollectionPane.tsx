import { useState } from 'react';
import { useHeroes } from '../../context/HeroesContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import GameCard from './GameCard';
import { Search, Filter } from 'lucide-react';

interface MyCollectionPaneProps {
  selectedDeckId: string | null;
}

export default function MyCollectionPane({ selectedDeckId }: MyCollectionPaneProps) {
  const { heroes, decksWithPower, addCardToDeck, removeCardFromDeck } = useHeroes();

  const [searchQuery, setSearchQuery] = useState('');
  const [editionFilter, setEditionFilter] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  const selectedDeck = decksWithPower.find(d => d.id === selectedDeckId);
  const selectedCardIds = selectedDeck?.cardInstanceIds || [];

  // Apply filters
  const filteredHeroes = heroes.filter(hero => {
    // Search filter
    if (searchQuery && !hero.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Edition filter
    if (editionFilter !== 'all' && hero.edition !== editionFilter) return false;
    // Rarity filter
    if (rarityFilter !== 'all' && hero.rarity !== rarityFilter) return false;
    // Class filter
    if (classFilter !== 'all' && hero.class !== classFilter) return false;
    return true;
  });

  // Get unique values for filters
  const editions = Array.from(new Set(heroes.map(h => h.edition)));
  const rarities = Array.from(new Set(heroes.map(h => h.rarity)));
  const classes = Array.from(new Set(heroes.map(h => h.class)));

  const handleToggleCard = (instanceId: string) => {
    if (!selectedDeckId) return;
    
    if (selectedCardIds.includes(instanceId)) {
      removeCardFromDeck(selectedDeckId, instanceId);
    } else {
      addCardToDeck(selectedDeckId, instanceId);
    }
  };

  return (
    <Card className="bg-retro-panel border-retro-gold backdrop-blur-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-400 text-xl flex items-center gap-2">
          <Filter className="w-6 h-6" />
          My Collection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-400/50" />
          <Input
            placeholder="Search cards by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900/50 border-amber-500/30 text-amber-100"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-amber-300/70 mb-1 block">Edition</label>
            <Select value={editionFilter} onValueChange={setEditionFilter}>
              <SelectTrigger className="bg-slate-900/50 border-amber-500/30 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {editions.map(ed => (
                  <SelectItem key={ed} value={ed}>{ed}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-amber-300/70 mb-1 block">Rarity</label>
            <Select value={rarityFilter} onValueChange={setRarityFilter}>
              <SelectTrigger className="bg-slate-900/50 border-amber-500/30 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {rarities.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-amber-300/70 mb-1 block">Class</label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="bg-slate-900/50 border-amber-500/30 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {classes.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Collection Info */}
        {selectedDeck && (
          <div className="text-xs text-amber-300/70 bg-amber-500/10 p-2 rounded border border-amber-500/20">
            💡 Click cards to add/remove from <span className="text-amber-400 font-semibold">{selectedDeck.name}</span>
          </div>
        )}

        {!selectedDeck && (
          <div className="text-xs text-amber-300/50 bg-slate-900/30 p-2 rounded border border-amber-500/10">
            ← Select a deck to start building
          </div>
        )}

        {/* Hero Cards Grid */}
        <ScrollArea className="h-[600px] pr-3">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {filteredHeroes.map((hero) => (
              <GameCard
                key={hero.instanceId}
                hero={hero}
                isSelected={selectedCardIds.includes(hero.instanceId)}
                onToggle={() => handleToggleCard(hero.instanceId)}
                isInActiveDeck={selectedCardIds.includes(hero.instanceId)}
              />
            ))}
          </div>
        </ScrollArea>

        {filteredHeroes.length === 0 && (
          <div className="text-center py-12 text-amber-300/50">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No cards match your filters</p>
          </div>
        )}

        {/* Collection Stats */}
        <div className="pt-2 border-t border-amber-500/20 text-center text-xs text-amber-300/60">
          Showing {filteredHeroes.length} of {heroes.length} cards
        </div>
      </CardContent>
    </Card>
  );
}
