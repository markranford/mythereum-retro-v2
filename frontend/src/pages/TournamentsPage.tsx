import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useTournaments } from '../context/TournamentsContext';
import { useHeroes } from '../context/HeroesContext';
import { useEconomy } from '../context/EconomyContext';
import { useProgress } from '../context/ProgressContext';
import LayerGate from '../components/LayerGate';
import TournamentCard from '../components/tournaments/TournamentCard';
import TournamentDetail from '../components/tournaments/TournamentDetail';
import { Card, CardContent } from '../components/ui/card';
import { Trophy } from 'lucide-react';
import { toast } from 'sonner';

function TournamentsContent() {
  const { identity } = useInternetIdentity();
  const { tournaments, joinTournament, startTournament, simulateNextRound, getTournamentById } = useTournaments();
  const { decksWithPower } = useHeroes();
  const { getMythexBalance, earnMythex, earnResources } = useEconomy();
  const { registerTournamentResult } = useProgress();
  
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

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
        onJoin={(deckId) => {
          const result = joinTournament(selectedTournamentId!, deckId);
          if (result.success) {
            toast.success('Successfully joined tournament!', {
              description: `Entry fee of ${selectedTournament.config.entryFee} Mythex deducted.`,
            });
            const updated = getTournamentById(selectedTournamentId!);
            if (updated) {
              setSelectedTournamentId(null);
              setTimeout(() => setSelectedTournamentId(updated.id), 0);
            }
          } else {
            toast.error('Failed to join tournament', {
              description: result.error || 'An unknown error occurred',
            });
          }
        }}
        onStart={() => {
          const result = startTournament(selectedTournamentId!);
          if (result.success) {
            toast.success('Tournament started!', {
              description: 'First round matches have been generated.',
            });
          } else {
            toast.error('Failed to start tournament', {
              description: result.error || 'An unknown error occurred',
            });
          }
        }}
        onSimulateRound={() => {
          const result = simulateNextRound(selectedTournamentId!);
          if (result.success) {
            const updated = getTournamentById(selectedTournamentId!);
            if (updated?.status === 'completed') {
              // Check if player won
              const playerParticipant = updated.participants.find(p => !p.isAI);
              const playerWon = updated.championId === playerParticipant?.id;
              
              // Register tournament result with progression system
              if (playerParticipant) {
                registerTournamentResult(playerWon);
              }
              
              // Grant rewards via EconomyContext
              if (playerWon) {
                earnMythex(500, 'Tournament Victory (1st Place)');
                earnResources({ gold: 100, stone: 100, lumber: 100, iron: 100, food: 100 }, 'Tournament Victory');
                toast.success('Tournament completed!', {
                  description: 'Congratulations! You are the champion! +500 Mythex, +100 resources',
                });
              } else {
                // Participation reward
                earnMythex(50, 'Tournament Participation');
                earnResources({ gold: 10, stone: 10, lumber: 10, iron: 10, food: 10 }, 'Tournament Participation');
                toast.success('Tournament completed!', {
                  description: 'Check the results to see the champion. +50 Mythex, +10 resources',
                });
              }
            } else {
              toast.success('Round completed!', {
                description: 'Matches have been simulated.',
              });
            }
          } else {
            toast.error('Failed to simulate round', {
              description: result.error || 'An unknown error occurred',
            });
          }
        }}
        availableDecks={decksWithPower.map(d => ({
          id: d.id,
          name: d.name,
          power: d.totalPower,
        }))}
        selectedDeckId={selectedDeckId}
        onSelectDeck={setSelectedDeckId}
      />
    );
  }

  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming' || t.status === 'registration');
  const activeTournaments = tournaments.filter(t => t.status === 'active');
  const completedTournaments = tournaments.filter(t => t.status === 'completed');

  const balance = getMythexBalance();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-amber-400">Tournaments</h1>
        <p className="text-xl text-amber-200/80">
          Compete in organized tournaments against the best players. Prove your skill, earn prestigious rewards, and claim your place on the leaderboards.
        </p>
        <div className="text-amber-300 text-lg">
          Your Balance: <span className="font-bold text-amber-400">{balance} Mythex</span>
        </div>
      </div>

      {upcomingTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-amber-400">Upcoming & Registration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingTournaments.map(tournament => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onSelect={() => setSelectedTournamentId(tournament.id)}
              />
            ))}
          </div>
        </div>
      )}

      {activeTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-amber-400">Ongoing Tournaments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTournaments.map(tournament => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onSelect={() => setSelectedTournamentId(tournament.id)}
              />
            ))}
          </div>
        </div>
      )}

      {completedTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-amber-400">Completed Tournaments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedTournaments.map(tournament => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onSelect={() => setSelectedTournamentId(tournament.id)}
              />
            ))}
          </div>
        </div>
      )}

      {tournaments.length === 0 && (
        <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-amber-400 mb-2">No Active Tournaments</h2>
            <p className="text-amber-200/70">Check back soon for upcoming tournament events!</p>
          </CardContent>
        </Card>
      )}
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
