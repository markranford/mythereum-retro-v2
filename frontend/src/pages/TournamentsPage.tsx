import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useTournaments } from '../context/TournamentsContext';
import { useHeroes } from '../context/HeroesContext';
import { useEconomy } from '../context/EconomyContext';
import { useProgress } from '../context/ProgressContext';
import { AutobotStrategy } from '../types/tournaments';
import LayerGate from '../components/LayerGate';
import TournamentCard from '../components/tournaments/TournamentCard';
import TournamentDetail from '../components/tournaments/TournamentDetail';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Trophy, Plus } from 'lucide-react';
import { toast } from 'sonner';

function TournamentsContent() {
  const { identity } = useInternetIdentity();
  const { tournaments, createTournament, joinTournament, startTournament, simulateNextRound, getTournamentById } = useTournaments();
  const { decksWithPower } = useHeroes();
  const { getMythexBalance, earnMythex, earnResources } = useEconomy();
  const { registerTournamentResult } = useProgress();

  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  // Create Tournament dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSize, setNewSize] = useState(8);
  const [newFee, setNewFee] = useState(50);

  if (!identity) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Login Required</h2>
        <p className="text-amber-200/70">Please login to view and join tournaments.</p>
      </div>
    );
  }

  const selectedTournament = selectedTournamentId ? getTournamentById(selectedTournamentId) : null;

  if (selectedTournament) {
    return (
      <TournamentDetail
        tournament={selectedTournament}
        onBack={() => {
          setSelectedTournamentId(null);
          setSelectedDeckId(null);
        }}
        onJoin={(deckId: string, strategy: AutobotStrategy) => {
          const result = joinTournament(selectedTournamentId!, deckId, strategy);
          if (result.success) {
            toast.success('Successfully joined tournament!', {
              description: `Entry fee of ${selectedTournament.config.entryFee} Mythex deducted. Strategy: ${strategy}`,
            });
            const updated = getTournamentById(selectedTournamentId!);
            if (updated) {
              setSelectedTournamentId(null);
              setTimeout(() => setSelectedTournamentId(updated.id), 0);
            }
          } else {
            toast.error('Failed to join tournament', { description: result.error });
          }
        }}
        onStart={() => {
          const result = startTournament(selectedTournamentId!);
          if (result.success) {
            toast.success('Tournament started!', { description: 'AI opponents have been seeded. First round matches are ready.' });
          } else {
            toast.error('Failed to start', { description: result.error });
          }
        }}
        onSimulateRound={() => {
          const result = simulateNextRound(selectedTournamentId!);
          if (result.success) {
            const updated = getTournamentById(selectedTournamentId!);
            if (updated?.status === 'completed') {
              const playerP = updated.participants.find(p => !p.isAI);
              const playerWon = updated.championId === playerP?.id;

              if (playerP) registerTournamentResult(playerWon);

              if (playerWon) {
                const rewards = updated.rewards;
                const mythex = rewards?.first?.mythex || 500;
                const res = rewards?.first?.resources;
                earnMythex(mythex, 'Tournament Victory (1st Place)');
                if (res) earnResources(res, 'Tournament Victory');
                toast.success('You are the Champion!', { description: `+${mythex} Mythex + resources` });
              } else {
                earnMythex(50, 'Tournament Participation');
                earnResources({ gold: 10, stone: 10, lumber: 10, iron: 10, food: 10 }, 'Tournament Participation');
                toast.success('Tournament completed!', { description: 'Better luck next time! +50 Mythex participation reward.' });
              }
            } else {
              toast.success('Round completed!', { description: 'All matches simulated. Check the bracket for results.' });
            }
          } else {
            toast.error('Simulation failed', { description: result.error });
          }
        }}
        availableDecks={decksWithPower.map(d => ({ id: d.id, name: d.name, power: d.totalPower }))}
        selectedDeckId={selectedDeckId}
        onSelectDeck={setSelectedDeckId}
      />
    );
  }

  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming' || t.status === 'registration');
  const activeTournaments = tournaments.filter(t => t.status === 'active');
  const completedTournaments = tournaments.filter(t => t.status === 'completed');
  const balance = getMythexBalance();

  const handleCreateTournament = () => {
    if (!newName.trim()) {
      toast.error('Tournament name is required');
      return;
    }
    const result = createTournament({
      name: newName.trim(),
      format: 'single-elimination',
      maxParticipants: newSize,
      entryFee: newFee,
      startTime: Date.now() + 24 * 60 * 60 * 1000,
    });
    if (result.success) {
      toast.success('Tournament created!', { description: `"${newName}" is open for registration.` });
      setShowCreateDialog(false);
      setNewName('');
      setNewSize(8);
      setNewFee(50);
    } else {
      toast.error('Failed to create', { description: result.error });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-amber-400">Tournaments</h1>
          <p className="text-xl text-amber-200/80">
            Set your strategy, submit your deck, and let the autobot fight for you.
          </p>
          <div className="text-amber-300 text-sm">
            Balance: <span className="font-bold text-amber-400">{balance} Mythex</span>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
        >
          <Plus className="w-5 h-5 mr-2" /> Create Tournament
        </Button>
      </div>

      {upcomingTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-amber-400">Open for Registration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingTournaments.map(t => (
              <TournamentCard key={t.id} tournament={t} onSelect={() => setSelectedTournamentId(t.id)} />
            ))}
          </div>
        </div>
      )}

      {activeTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-amber-400">Active Tournaments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTournaments.map(t => (
              <TournamentCard key={t.id} tournament={t} onSelect={() => setSelectedTournamentId(t.id)} />
            ))}
          </div>
        </div>
      )}

      {completedTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-amber-400">Completed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedTournaments.map(t => (
              <TournamentCard key={t.id} tournament={t} onSelect={() => setSelectedTournamentId(t.id)} />
            ))}
          </div>
        </div>
      )}

      {tournaments.length === 0 && (
        <Card className="bg-slate-800/60 border-amber-500/30 max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-amber-400 mb-2">No Tournaments</h2>
            <p className="text-amber-200/70">Create one to get started!</p>
          </CardContent>
        </Card>
      )}

      {/* Create Tournament Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gradient-to-b from-amber-950 to-amber-900 border-2 border-amber-600/50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-amber-300">Create Tournament</DialogTitle>
            <DialogDescription className="text-amber-200/80">
              Set up a new tournament. AI opponents will fill remaining slots when started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-amber-300">Tournament Name</Label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Friday Night Fights"
                className="w-full bg-slate-900/70 border border-amber-600/40 text-amber-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-amber-300">Max Participants</Label>
                <select
                  value={newSize}
                  onChange={e => setNewSize(Number(e.target.value))}
                  className="w-full bg-slate-900/70 border border-amber-600/40 text-amber-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value={4}>4 players</option>
                  <option value={8}>8 players</option>
                  <option value={16}>16 players</option>
                  <option value={32}>32 players</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-amber-300">Entry Fee (Mythex)</Label>
                <input
                  type="number"
                  value={newFee}
                  onChange={e => setNewFee(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-900/70 border border-amber-600/40 text-amber-200 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-amber-600/40 text-amber-400">
              Cancel
            </Button>
            <Button
              onClick={handleCreateTournament}
              className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TournamentsPage() {
  return (
    <LayerGate minLayer={4} featureName="Tournaments">
      <TournamentsContent />
    </LayerGate>
  );
}
