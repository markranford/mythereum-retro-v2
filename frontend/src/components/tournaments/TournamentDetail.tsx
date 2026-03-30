import { useState } from 'react';
import { Tournament, AutobotStrategy, STRATEGY_LABELS } from '../../types/tournaments';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Trophy, Users, Swords, Award, ArrowLeft, Bot, Brain, ChevronDown, ChevronUp } from 'lucide-react';

interface TournamentDetailProps {
  tournament: Tournament;
  onBack: () => void;
  onJoin: (deckId: string, strategy: AutobotStrategy) => void;
  onStart: () => void;
  onSimulateRound: () => void;
  availableDecks: Array<{ id: string; name: string; power: number }>;
  selectedDeckId: string | null;
  onSelectDeck: (deckId: string) => void;
}

const strategyKeys = Object.keys(STRATEGY_LABELS) as AutobotStrategy[];

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
  const [selectedStrategy, setSelectedStrategy] = useState<AutobotStrategy>('random');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const playerParticipant = tournament.participants.find(p => !p.isAI);
  const hasJoined = !!playerParticipant;

  const currentRound = tournament.matches.length > 0
    ? Math.max(...tournament.matches.map(m => m.round))
    : 0;

  const currentRoundMatches = tournament.matches.filter(m => m.round === currentRound);
  const allCurrentRoundComplete = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.completed);

  // All rounds for bracket display
  const allRounds = Array.from(new Set(tournament.matches.map(m => m.round))).sort((a, b) => a - b);

  const getParticipant = (id: string) => tournament.participants.find(p => p.id === id);
  const getParticipantName = (id: string) => getParticipant(id)?.name || 'Unknown';

  const handleJoin = async () => {
    if (!selectedDeckId) return;
    setIsJoining(true);
    try {
      await onJoin(selectedDeckId, selectedStrategy);
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
        <Button onClick={onBack} variant="outline" className="border-amber-600/30 text-amber-300 hover:bg-amber-900/20">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h2 className="text-3xl font-bold text-amber-400">{tournament.config.name}</h2>
        <span className="text-sm text-amber-200/60 capitalize bg-amber-900/30 px-2 py-1 rounded">{tournament.status}</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800/60 border border-amber-600/30">
          <TabsTrigger value="overview" className="data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-300">
            Overview
          </TabsTrigger>
          <TabsTrigger value="bracket" className="data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-300">
            Bracket
          </TabsTrigger>
          {tournament.rewards && (
            <TabsTrigger value="rewards" className="data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-300">
              Rewards
            </TabsTrigger>
          )}
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30">
            <CardHeader>
              <CardTitle className="text-amber-300">Tournament Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.config.description && (
                <p className="text-amber-200/80">{tournament.config.description}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <div className="text-amber-300/70 text-sm">Round</div>
                  <div className="text-amber-300 font-semibold">{tournament.currentRound || '-'}</div>
                </div>
              </div>

              {/* JOIN SECTION: Deck + Strategy selection */}
              {!hasJoined && (tournament.status === 'registration' || tournament.status === 'upcoming') && (
                <div className="space-y-4 pt-4 border-t border-amber-600/20">
                  {/* Deck picker */}
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
                    {availableDecks.length === 0 && (
                      <div className="text-amber-200/50 text-sm p-3">No decks available. Create one in the Heroes page first.</div>
                    )}
                  </div>

                  {/* Strategy picker */}
                  <div className="text-amber-300 font-semibold flex items-center gap-2">
                    <Brain className="w-4 h-4" /> Autobot Strategy
                  </div>
                  <p className="text-xs text-amber-200/60">Your deck will fight automatically using this strategy in every match.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {strategyKeys.map(key => {
                      const label = STRATEGY_LABELS[key];
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedStrategy(key)}
                          className={`p-3 rounded border-2 transition-all text-left ${
                            selectedStrategy === key
                              ? 'border-purple-500 bg-purple-900/30'
                              : 'border-amber-600/30 bg-slate-800/40 hover:border-purple-500/50'
                          }`}
                        >
                          <div className="text-amber-300 font-semibold text-sm">{label.name}</div>
                          <div className="text-amber-200/60 text-xs">{label.description}</div>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={handleJoin}
                    disabled={!selectedDeckId || isJoining}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold disabled:opacity-50"
                  >
                    {isJoining ? 'Joining...' : `Join Tournament (${tournament.config.entryFee} Mythex)`}
                  </Button>
                </div>
              )}

              {/* Start button if joined but not started */}
              {hasJoined && tournament.status === 'registration' && (
                <div className="space-y-2 pt-4 border-t border-amber-600/20">
                  <p className="text-amber-200/70 text-sm">
                    You're registered with strategy: <span className="text-purple-300 font-semibold">{STRATEGY_LABELS[playerParticipant!.strategy].name}</span>
                  </p>
                  <Button
                    onClick={handleStart}
                    disabled={isStarting}
                    className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold disabled:opacity-50"
                  >
                    {isStarting ? 'Starting...' : 'Start Tournament (AI fills remaining slots)'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants list */}
          <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30">
            <CardHeader>
              <CardTitle className="text-amber-300 flex items-center gap-2">
                <Users className="w-5 h-5" /> Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tournament.participants.map((p, idx) => (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded border ${
                    p.eliminated ? 'bg-red-950/20 border-red-600/20 opacity-60' : 'bg-slate-800/40 border-amber-600/20'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 font-bold w-6">#{idx + 1}</span>
                      <span className="text-amber-300">{p.name}</span>
                      {!p.isAI && <span className="text-xs bg-amber-600/30 text-amber-300 px-2 py-0.5 rounded">You</span>}
                      {p.isAI && <Bot className="w-3 h-3 text-purple-400" />}
                      {p.eliminated && <span className="text-xs text-red-400 font-bold">ELIMINATED</span>}
                      {tournament.championId === p.id && <Trophy className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-purple-300/70 text-xs">{STRATEGY_LABELS[p.strategy]?.name || p.strategy}</span>
                      <span className="text-amber-200/70">Power: {p.deckPower}</span>
                    </div>
                  </div>
                ))}
                {tournament.participants.length === 0 && (
                  <div className="text-amber-200/50 text-sm text-center py-4">No participants yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === BRACKET TAB === */}
        <TabsContent value="bracket" className="space-y-6">
          {tournament.status === 'completed' && tournament.championId && (
            <Card className="bg-gradient-to-br from-amber-600/20 to-amber-950/40 border-2 border-amber-500/50">
              <CardContent className="py-8 text-center">
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-3" />
                <h3 className="text-3xl font-bold text-amber-400 mb-1">Champion!</h3>
                <p className="text-xl text-amber-300">{getParticipantName(tournament.championId)}</p>
                {getParticipant(tournament.championId)?.isAI === false && (
                  <p className="text-amber-200/60 text-sm mt-1">That's you!</p>
                )}
              </CardContent>
            </Card>
          )}

          {allRounds.map(round => {
            const roundMatches = tournament.matches.filter(m => m.round === round);
            const isCurrentRound = round === tournament.currentRound;
            return (
              <Card key={round} className={`bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 ${
                isCurrentRound ? 'border-amber-500/60' : 'border-amber-600/30'
              }`}>
                <CardHeader>
                  <CardTitle className="text-amber-300 flex items-center gap-2">
                    <Swords className="w-5 h-5" />
                    Round {round}
                    {isCurrentRound && !roundMatches.every(m => m.completed) && (
                      <span className="text-xs bg-amber-600/30 px-2 py-0.5 rounded ml-2">Current</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {roundMatches.map(match => {
                    const p1 = getParticipant(match.participant1Id);
                    const p2 = getParticipant(match.participant2Id);
                    const isExpanded = expandedMatchId === match.id;

                    return (
                      <div key={match.id} className="rounded bg-slate-800/40 border border-amber-600/20 overflow-hidden">
                        <div
                          className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                          onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className={`text-sm ${match.winnerId === match.participant1Id ? 'text-green-400 font-bold' : 'text-amber-300'}`}>
                                {p1?.name || 'TBD'}
                                {p1?.isAI && <Bot className="w-3 h-3 inline ml-1 text-purple-400" />}
                                {match.participant1Score !== undefined && <span className="ml-2 text-xs text-amber-200/50">({match.participant1Score} cards left)</span>}
                              </div>
                            </div>
                            <div className="text-amber-400 font-bold px-4 text-sm">VS</div>
                            <div className="flex-1 text-right">
                              <div className={`text-sm ${match.winnerId === match.participant2Id ? 'text-green-400 font-bold' : 'text-amber-300'}`}>
                                {p2?.name || 'TBD'}
                                {p2?.isAI && <Bot className="w-3 h-3 inline ml-1 text-purple-400" />}
                                {match.participant2Score !== undefined && <span className="ml-2 text-xs text-amber-200/50">({match.participant2Score} cards left)</span>}
                              </div>
                            </div>
                            {match.completed && (
                              isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400 ml-2" /> : <ChevronDown className="w-4 h-4 text-amber-400 ml-2" />
                            )}
                          </div>
                          {match.completed && match.roundCount && (
                            <div className="text-xs text-amber-200/40 mt-1 text-center">
                              {match.roundCount} rounds of combat
                            </div>
                          )}
                        </div>

                        {/* Expanded combat log */}
                        {isExpanded && match.combatSummary && match.combatSummary.length > 0 && (
                          <div className="border-t border-amber-600/20 p-3 bg-slate-900/40">
                            <div className="text-xs text-amber-300/70 font-semibold mb-2">Combat Log</div>
                            <div className="space-y-1">
                              {match.combatSummary.map((line, i) => (
                                <div key={i} className="text-xs text-amber-200/60">{line}</div>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-amber-200/40 flex gap-4">
                              <span>{p1?.name}: {STRATEGY_LABELS[p1?.strategy || 'random']?.name}</span>
                              <span>vs</span>
                              <span>{p2?.name}: {STRATEGY_LABELS[p2?.strategy || 'random']?.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Simulate / Advance button */}
                  {isCurrentRound && tournament.status === 'active' && (
                    <Button
                      onClick={handleSimulate}
                      disabled={isSimulating}
                      className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold disabled:opacity-50 mt-2"
                    >
                      {isSimulating ? 'Simulating Combat...' : (
                        allCurrentRoundComplete ? 'Advance to Next Round' : 'Simulate All Matches'
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {tournament.status !== 'active' && tournament.status !== 'completed' && (
            <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30">
              <CardContent className="py-12 text-center">
                <Swords className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
                <p className="text-amber-200/70">Tournament has not started yet. Join and start to see the bracket!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === REWARDS TAB === */}
        {tournament.rewards && (
          <TabsContent value="rewards" className="space-y-6">
            <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border-2 border-amber-600/30">
              <CardHeader>
                <CardTitle className="text-amber-300 flex items-center gap-2">
                  <Award className="w-5 h-5" /> Prize Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { place: '1st Place', data: tournament.rewards.first, icon: <Trophy className="w-8 h-8 text-amber-400" />, style: 'bg-gradient-to-r from-amber-900/40 to-amber-800/30 border-2 border-amber-500/50' },
                  { place: '2nd Place', data: tournament.rewards.second, icon: null, style: 'bg-slate-800/40 border border-amber-600/20' },
                  { place: '3rd Place', data: tournament.rewards.third, icon: null, style: 'bg-slate-800/40 border border-amber-600/20' },
                ].map(tier => (
                  <div key={tier.place} className={`p-4 rounded ${tier.style}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {tier.icon}
                        <div className="text-amber-300 font-bold">{tier.place}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-400 font-bold text-xl">{tier.data.mythex} Mythex</div>
                        {tier.data.resources && (
                          <div className="text-amber-200/70 text-sm">
                            + {tier.data.resources.gold}g / {tier.data.resources.stone}s / {tier.data.resources.lumber}l / {tier.data.resources.iron}i / {tier.data.resources.food}f
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
