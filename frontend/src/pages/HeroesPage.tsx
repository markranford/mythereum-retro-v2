import { useEffect, useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useHeroes } from '../context/HeroesContext';
import LayerGate from '../components/LayerGate';
import { Users, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import DeckExplorer from '../components/heroes/DeckExplorer';
import ActiveDeckPane from '../components/heroes/ActiveDeckPane';
import MyCollectionPane from '../components/heroes/MyCollectionPane';

function HeroesContent() {
  const { identity } = useInternetIdentity();
  const { ensureStarterCollection } = useHeroes();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  useEffect(() => {
    if (identity) {
      ensureStarterCollection();
    }
  }, [identity, ensureStarterCollection]);

  if (!identity) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Login Required</h2>
        <p className="text-amber-200/70">Please login to view your hero collection.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold text-amber-400 tracking-wide">Deck Manager</h1>
        <p className="text-lg text-amber-200/70">
          Build powerful bands from your hero collection to dominate in raids and battles
        </p>
      </div>

      {/* Phase 10: Informational section about hero recruitment */}
      <Alert className="bg-blue-900/20 border-blue-500/30">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-200/80">
          <strong>Hero Recruitment:</strong> New heroes can be recruited through your Stronghold! Visit the Stronghold HQ tab to recruit random heroes and expand your collection. Heroes can also be purchased from the Market or earned through battles and tournaments.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <DeckExplorer
            selectedDeckId={selectedDeckId}
            onSelectDeck={setSelectedDeckId}
          />
        </div>

        <div className="lg:col-span-4">
          <ActiveDeckPane selectedDeckId={selectedDeckId} />
        </div>

        <div className="lg:col-span-5">
          <MyCollectionPane selectedDeckId={selectedDeckId} />
        </div>
      </div>
    </div>
  );
}

export default function HeroesPage() {
  return (
    <LayerGate minLayer={2} featureName="Heroes & Bands">
      <HeroesContent />
    </LayerGate>
  );
}
