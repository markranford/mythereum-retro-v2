import { useState } from 'react';
import { Tournament } from '../../types/tournaments';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Trophy, Users, Swords, Award, ArrowLeft } from 'lucide-react';

interface TournamentDetailProps {
  tournament: Tournament;
  onBack: () => void;
  onJoin: (deckId: string) => void;
  onStart: () => void;
  onSimulateRound: () => void;
  availableDecks: Array<{ id: string; name: string; power: number }>;
  selectedDeckId: string | null;
  onSelectDeck: (deckId: string) => void;
}

export default function TournamentDetail({
  tournament,
  onBack,
  onJoin,
  onStart,
  onSimulateRound,
  availableDecks,
  selectedDeckId,
  onSelectDeck,
}: TournamentDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const playerParticipant = tournament.participants.find(p => !p.isAI);
  const hasJoined = !!playerParticipant;

  const currentRound = tournament.matches.length > 0
    ? Math.max(...tournament.matches.map(m => m.round))
    : 0;

  const currentRoundMatches = tournament.matches.filter(m => m.round === currentRound);
  const allCurrentRoundComplete = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.completed);

  const getParticipantName = (id: string): string => {
    const participant = tournament.participants.find(p => p.id === id);
    return participant?.name || 'Unknown';
  };

  const handleJoin = async () => {
    if (!selectedDeckId) return;
    setIsJoining(true);
    try {
      await onJoin(selectedDeckId);
    } finally {
      setIsJoining(false);
    }
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await onStart();
    } finally {
      setIsStarting(false);
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      await onSimulateRound();
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          className="border-amber-600/30 text-amber-300 hover:bg-amber-900/20"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h2 className="text-3xl font-bold text-amber-400">{tournament.config.name}</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800/60 border border-amber-600/30">
          <TabsTrigger value="overview" className="data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-300">
            Overview
          </TabsTrigger>
          <TabsTrigger value="progress" className="data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-300">
            Progress
          </TabsTrigger>
          {tournament.rewards && (
            <TabsTrigger value="rewards" className="data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-300">
              Rewards
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30">
            <CardHeader>
              <CardTitle className="text-amber-300">Tournament Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.config.description && (
                <p className="text-amber-200/80">{tournament.config.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-amber-300/70 text-sm">Format</div>
                  <div className="text-amber-300 font-semibold">{tournament.config.format}</div>
                </div>
                <div>
                  <div className="text-amber-300/70 text-sm">Entry Fee</div>
                  <div className="text-amber-300 font-semibold">{tournament.config.entryFee} Mythex</div>
                </div>
                <div>
                  <div className="text-amber-300/70 text-sm">Participants</div>
                  <div className="text-amber-300 font-semibold">
                    {tournament.participants.length}/{tournament.config.maxParticipants}
                  </div>
                </div>
                <div>
                  <div className="text-amber-300/70 text-sm">Status</div>
                  <div className="text-amber-300 font-semibold capitalize">{tournament.status}</div>
                </div>
              </div>

              {!hasJoined && (tournament.status === 'registration' || tournament.status === 'upcoming') && (
                <div className="space-y-4 pt-4 border-t border-amber-600/20">
                  <div className="text-amber-300 font-semibold">Select Your Deck</div>
                  <div className="grid grid-cols-1 gap-2">
                    {availableDecks.map(deck => (
                      <button
                        key={deck.id}
                        onClick={() => onSelectDeck(deck.id)}
                        className={`p-3 rounded border-2 transition-all text-left ${
                          selectedDeckId === deck.id
                            ? 'border-amber-500 bg-amber-900/30'
                            : 'border-amber-600/30 bg-slate-800/40 hover:border-amber-500/50'
                        }`}
                      >
                        <div className="text-amber-300 font-semibold">{deck.name}</div>
                        <div className="text-amber-200/70 text-sm">Power: {deck.power}</div>
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={handleJoin}
                    disabled={!selectedDeckId || isJoining}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold disabled:opacity-50"
                  >
                    {isJoining ? 'Joining...' : 'Join Tournament'}
                  </Button>
                </div>
              )}

              {hasJoined && tournament.status === 'registration' && (
                <Button
                  onClick={handleStart}
                  disabled={isStarting}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold disabled:opacity-50"
                >
                  {isStarting ? 'Starting...' : 'Start Tournament'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30">
            <CardHeader>
              <CardTitle className="text-amber-300 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tournament.participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 rounded bg-slate-800/40 border border-amber-600/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 font-bold">#{index + 1}</span>
                      <span className="text-amber-300">{participant.name}</span>
                      {!participant.isAI && (
                        <span className="text-xs bg-amber-600/30 text-amber-300 px-2 py-1 rounded">You</span>
                      )}
                    </div>
                    <div className="text-amber-200/70 text-sm">
                      Power: {participant.deckPower}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          {tournament.status === 'active' && (
            <>
              <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30">
                <CardHeader>
                  <CardTitle className="text-amber-300 flex items-center gap-2">
                    <Swords className="w-5 h-5" />
                    Round {currentRound}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentRoundMatches.map(match => (
                    <div
                      key={match.id}
                      className="p-4 rounded bg-slate-800/40 border border-amber-600/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className={`text-amber-300 ${match.winnerId === match.participant1Id ? 'font-bold' : ''}`}>
                            {getParticipantName(match.participant1Id)}
                          </div>
                          {match.participant1Score !== undefined && (
                            <div className="text-amber-200/70 text-sm">Score: {match.participant1Score}</div>
                          )}
                        </div>
                        <div className="text-amber-400 font-bold px-4">VS</div>
                        <div className="flex-1 text-right">
                          <div className={`text-amber-300 ${match.winnerId === match.participant2Id ? 'font-bold' : ''}`}>
                            {getParticipantName(match.participant2Id)}
                          </div>
                          {match.participant2Score !== undefined && (
                            <div className="text-amber-200/70 text-sm">Score: {match.participant2Score}</div>
                          )}
                        </div>
                      </div>
                      {match.completed && match.winnerId && (
                        <div className="mt-2 text-center text-green-400 text-sm">
                          Winner: {getParticipantName(match.winnerId)}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {allCurrentRoundComplete && (
                    <Button
                      onClick={handleSimulate}
                      disabled={isSimulating}
                      className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold disabled:opacity-50"
                    >
                      {isSimulating ? 'Simulating...' : 'Advance to Next Round'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {tournament.status === 'completed' && tournament.championId && (
            <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30">
              <CardContent className="py-12 text-center">
                <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-amber-400 mb-2">Tournament Complete!</h3>
                <p className="text-xl text-amber-300">
                  Champion: {getParticipantName(tournament.championId)}
                </p>
              </CardContent>
            </Card>
          )}

          {tournament.status !== 'active' && tournament.status !== 'completed' && (
            <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30">
              <CardContent className="py-12 text-center">
                <Swords className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
                <p className="text-amber-200/70">Tournament has not started yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {tournament.rewards && (
          <TabsContent value="rewards" className="space-y-6">
            <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30">
              <CardHeader>
                <CardTitle className="text-amber-300 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Prize Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded bg-gradient-to-r from-amber-900/40 to-amber-800/30 border-2 border-amber-500/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-amber-400" />
                      <div>
                        <div className="text-amber-300 font-bold text-lg">1st Place</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-400 font-bold text-xl">
                        {tournament.rewards.first.mythex} Mythex
                      </div>
                      {tournament.rewards.first.resources && (
                        <div className="text-amber-200/70 text-sm">
                          + Resources
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded bg-slate-800/40 border border-amber-600/20">
                  <div className="flex items-center justify-between">
                    <div className="text-amber-300 font-semibold">2nd Place</div>
                    <div className="text-right">
                      <div className="text-amber-400 font-bold">{tournament.rewards.second.mythex} Mythex</div>
                      {tournament.rewards.second.resources && (
                        <div className="text-amber-200/70 text-sm">+ Resources</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded bg-slate-800/40 border border-amber-600/20">
                  <div className="flex items-center justify-between">
                    <div className="text-amber-300 font-semibold">3rd Place</div>
                    <div className="text-right">
                      <div className="text-amber-400 font-bold">{tournament.rewards.third.mythex} Mythex</div>
                      {tournament.rewards.third.resources && (
                        <div className="text-amber-200/70 text-sm">+ Resources</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
