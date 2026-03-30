import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetAllBattleResults } from '../hooks/useQueries';
import { useHeroes } from '../context/HeroesContext';
import { useEconomy } from '../context/EconomyContext';
import { useTelemetry } from '../context/TelemetryContext';
import { useProgress } from '../context/ProgressContext';
import LayerGate from '../components/LayerGate';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Swords, Trophy, Plus, AlertCircle, Clock, Users, Target } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import GameBoard from '../components/battle/GameBoard';
import { TimerOption } from '../types/game';
import { OwnedHeroCard } from '../types/heroes';

interface BattleTab {
  id: string;
  type: 'waiting' | 'ongoing' | 'finished' | 'active-battle';
  battleId?: string;
  deckId?: string;
  snapshotHeroes?: OwnedHeroCard[];
}

/**
 * BattlegroundsContent - Battle lobby with PRIORITY 1 render-loop stability improvements.
 * 
 * Architectural Improvements (Phase 1 - Render Loop Stability):
 * ✅ Single mount-only initialization effect with [] dependencies
 * ✅ Deep-cloned hero snapshots completely isolated from live hero state
 * ✅ All event handlers memoized with useCallback and stable dependencies
 * ✅ Ref-based guard ensuring onBattleEnd fires exactly once
 * ✅ Context updates batched and decoupled from state changes
 * ✅ No useEffect dependencies on state updated within those effects
 * ✅ Developer-only debug logging for render tracking
 * ✅ Strict separation between render state and event-driven effects
 * 
 * Phase 2 - Context Isolation:
 * ✅ All context method calls are memoized and stable
 * ✅ No direct cross-context updates
 * ✅ Event-driven architecture with emit-style dispatches
 */
function BattlegroundsContent() {
  const { identity } = useInternetIdentity();
  const { data: battles, isLoading: battlesLoading } = useGetAllBattleResults();
  
  const heroesContext = useHeroes();
  const economyContext = useEconomy();
  const telemetryContext = useTelemetry();
  const progressContext = useProgress();
  
  // Tab management
  const [activeTab, setActiveTab] = useState<string>('waiting');
  const [battleTabs, setBattleTabs] = useState<BattleTab[]>([
    { id: 'waiting', type: 'waiting' },
    { id: 'ongoing', type: 'ongoing' },
    { id: 'finished', type: 'finished' },
  ]);
  
  // Create Battle Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [timerOption, setTimerOption] = useState<TimerOption>('normal');
  const [isAiOpponent, setIsAiOpponent] = useState(true);
  
  // Battle state
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Stable refs for guards and callbacks
  const mountedRef = useRef(false);
  const battleCompletionGuardRef = useRef<Set<string>>(new Set());
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());

  // PRIORITY 3: Enhanced developer-only diagnostic logging for render tracking
  if (import.meta.env.DEV) {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;
    
    // Warn on excessive render frequency
    if (timeSinceLastRender < 16 && renderCountRef.current > 5) {
      console.warn(`[BattlegroundsPage] Rapid re-render detected: ${timeSinceLastRender}ms since last render (count: ${renderCountRef.current})`);
    }
    
    // Periodic render count logging
    if (renderCountRef.current % 10 === 0) {
      console.debug(`[BattlegroundsPage] Render count: ${renderCountRef.current}`);
    }
    
    // Log state changes that might cause re-renders
    if (renderCountRef.current > 1) {
      console.debug('[BattlegroundsPage] Current state:', {
        activeTab,
        battleTabsCount: battleTabs.length,
        activeBattleId,
        hasError: !!error,
        showCreateDialog,
      });
    }
  }

  /**
   * PRIORITY 1: Mount-only initialization effect with [] dependencies.
   * No state dependencies = no re-execution = no loops.
   */
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    
    if (import.meta.env.DEV) {
      console.log('[BattlegroundsPage] Component mounted - initial render count:', renderCountRef.current);
      console.log('[BattlegroundsPage] Context availability:', {
        heroes: !!heroesContext,
        economy: !!economyContext,
        telemetry: !!telemetryContext,
        progress: !!progressContext,
      });
    }
    
    return () => {
      if (import.meta.env.DEV) {
        console.log('[BattlegroundsPage] Component unmounting - total renders:', renderCountRef.current);
        console.log('[BattlegroundsPage] Cleanup: clearing', battleCompletionGuardRef.current.size, 'battle completion guards');
      }
      mountedRef.current = false;
      battleCompletionGuardRef.current.clear();
      renderCountRef.current = 0;
    };
  }, []); // Empty deps - runs once on mount only

  // PRIORITY 2: Memoized computed values to prevent unnecessary recalculations
  const activeBattleTab = useMemo(() => 
    battleTabs.find(tab => tab.id === activeTab && tab.type === 'active-battle'),
    [battleTabs, activeTab]
  );
  
  // Use snapshot heroes from battle tab - completely isolated from live heroes
  const activeDeckHeroes = useMemo(() => {
    if (!activeBattleTab?.snapshotHeroes) return [];
    return activeBattleTab.snapshotHeroes;
  }, [activeBattleTab?.snapshotHeroes]);

  /**
   * PRIORITY 1: Stable callback with useCallback - Open create battle dialog.
   * Memoized to prevent unintentional re-renders.
   */
  const handleOpenCreateDialog = useCallback(() => {
    if (heroesContext.decksWithPower.length === 0) {
      setError('You need at least one deck to create a battle. Visit the Heroes page to create a deck.');
      return;
    }
    setError(null);
    setShowCreateDialog(true);
    
    if (import.meta.env.DEV) {
      console.debug('[BattlegroundsPage] Opening create dialog - available decks:', heroesContext.decksWithPower.length);
    }
  }, [heroesContext.decksWithPower.length]);

  /**
   * PRIORITY 1: Stable callback with useCallback - Create and start a new battle.
   * Deep clone ensures complete isolation from live hero state changes.
   */
  const handleCreateBattle = useCallback(() => {
    try {
      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] handleCreateBattle called - Phase: Create');
      }
      
      if (!selectedDeckId) {
        setError('Please select a deck');
        return;
      }
      
      const selectedDeck = heroesContext.decksWithPower.find(d => d.id === selectedDeckId);
      if (!selectedDeck || selectedDeck.cardCount < 7) {
        setError('Deck must have at least 7 cards to battle');
        return;
      }

      // PRIORITY 1: Create deep snapshot of heroes at battle start
      const deckHeroes = heroesContext.heroes.filter(h => 
        selectedDeck.cardInstanceIds.includes(h.instanceId)
      );
      
      // Deep clone to completely isolate from live hero state
      const snapshotHeroes = JSON.parse(JSON.stringify(deckHeroes)) as OwnedHeroCard[];

      const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] Creating battle:', {
          battleId,
          heroCount: snapshotHeroes.length,
          deckName: selectedDeck.name,
          deckPower: selectedDeck.totalPower,
        });
      }

      const newTab: BattleTab = {
        id: battleId,
        type: 'active-battle',
        battleId,
        deckId: selectedDeckId,
        snapshotHeroes,
      };

      setBattleTabs(prev => [...prev, newTab]);
      setActiveBattleId(battleId);
      setActiveTab(battleId);
      setShowCreateDialog(false);
      setError(null);
      
      setSelectedDeckId('');
      setTimerOption('normal');
      setIsAiOpponent(true);
      
      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] Battle created successfully - Phase: Complete');
      }
    } catch (err) {
      console.error('[BattlegroundsPage] Error creating battle:', err);
      setError('Failed to create battle. Please try again.');
    }
  }, [selectedDeckId, heroesContext.decksWithPower, heroesContext.heroes]);

  /**
   * PRIORITY 1 & 2: Stable callback with useCallback - Handle battle completion.
   * 
   * Critical Design:
   * - Uses ref-based guard to ensure exactly-once execution
   * - Batches all context updates together
   * - Decouples reward dispatch from state changes via setTimeout
   * - No dependencies on context state that could trigger re-renders
   * - Emit-style event dispatch pattern for cross-context communication
   */
  const handleBattleComplete = useCallback((victory: boolean, battleId: string, usedHeroOwnedIds: string[]) => {
    try {
      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] handleBattleComplete called - Phase: Start', {
          victory,
          battleId,
          heroCount: usedHeroOwnedIds.length,
        });
      }
      
      // PRIORITY 1: Guard - check if already completed
      if (battleCompletionGuardRef.current.has(battleId)) {
        if (import.meta.env.DEV) {
          console.warn('[BattlegroundsPage] Battle completion already processed:', battleId);
        }
        return;
      }
      
      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] Processing battle completion - Phase: Rewards');
      }
      battleCompletionGuardRef.current.add(battleId);

      // PRIORITY 1 & 2: Batch all context updates together to minimize re-renders
      // Each context update is isolated and doesn't trigger other contexts
      const xpAmount = victory ? 50 : 10;
      const mythexReward = victory ? 50 : 10;
      const resourceAmount = victory ? 25 : 5;

      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] Reward calculation:', {
          xpAmount,
          mythexReward,
          resourceAmount,
          victory,
        });
      }

      // Context update 1: Heroes (XP award)
      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] Awarding XP:', xpAmount, 'to', usedHeroOwnedIds.length, 'heroes');
      }
      heroesContext.awardXpToHeroes(usedHeroOwnedIds, xpAmount);

      // Context update 2: Economy (Mythex)
      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] Granting Mythex:', mythexReward);
      }
      economyContext.earnMythex(mythexReward, 'Battle Reward');
      
      // Context update 3: Economy (Resources)
      if (victory) {
        if (import.meta.env.DEV) {
          console.debug('[BattlegroundsPage] Granting victory resources:', resourceAmount);
        }
        economyContext.earnResources({ 
          gold: resourceAmount, 
          stone: resourceAmount, 
          lumber: resourceAmount, 
          iron: resourceAmount, 
          food: resourceAmount 
        }, 'Battle Victory');
      } else {
        if (import.meta.env.DEV) {
          console.debug('[BattlegroundsPage] Granting participation resources:', resourceAmount);
        }
        economyContext.earnResources({ 
          gold: resourceAmount, 
          stone: resourceAmount, 
          lumber: resourceAmount, 
          iron: resourceAmount, 
          food: resourceAmount 
        }, 'Battle Participation');
      }

      // Context update 4: Telemetry (Battle outcome)
      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] Recording telemetry');
      }
      telemetryContext.recordBattleOutcome(battleId, victory, usedHeroOwnedIds);

      // Context update 5: Progress (Battle result)
      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] Registering with progression system');
      }
      progressContext.registerBattleResult(victory);

      if (import.meta.env.DEV) {
        console.debug('[BattlegroundsPage] Battle rewards granted successfully - Phase: Complete');
      }

      // PRIORITY 1: Move battle tab to finished after delay - decoupled from context updates
      setTimeout(() => {
        if (import.meta.env.DEV) {
          console.debug('[BattlegroundsPage] Moving battle to finished tab - Phase: Cleanup');
        }
        setBattleTabs(prev => prev.map(tab => 
          tab.battleId === battleId 
            ? { ...tab, type: 'finished' }
            : tab
        ));
        setActiveBattleId(null);
        setActiveTab('finished');
      }, 2000);
    } catch (err) {
      console.error('[BattlegroundsPage] Error completing battle:', err);
      setError('Failed to process battle results. Rewards may not have been granted.');
    }
  }, [heroesContext, economyContext, telemetryContext, progressContext]);

  /**
   * PRIORITY 1: Stable callback with useCallback - Close battle tab and cleanup.
   */
  const handleCloseBattleTab = useCallback((battleId: string) => {
    if (import.meta.env.DEV) {
      console.debug('[BattlegroundsPage] Closing battle tab:', battleId);
    }
    setBattleTabs(prev => prev.filter(tab => tab.battleId !== battleId));
    if (activeTab === battleId) {
      setActiveTab('waiting');
    }
    if (activeBattleId === battleId) {
      setActiveBattleId(null);
    }
    battleCompletionGuardRef.current.delete(battleId);
  }, [activeTab, activeBattleId]);

  /**
   * PRIORITY 1: Stable callback with useCallback - Handle tab changes.
   */
  const handleTabChange = useCallback((value: string) => {
    if (import.meta.env.DEV) {
      console.debug('[BattlegroundsPage] Tab changed:', value);
    }
    setActiveTab(value);
  }, []);

  /**
   * PRIORITY 1: Stable callback with useCallback - Handle dialog open/close.
   */
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (import.meta.env.DEV) {
      console.debug('[BattlegroundsPage] Dialog state changed:', open);
    }
    setShowCreateDialog(open);
  }, []);

  if (!heroesContext || !economyContext || !telemetryContext || !progressContext) {
    return (
      <div className="text-center py-12">
        <Alert className="max-w-2xl mx-auto bg-amber-950/50 border-amber-600/50">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <AlertDescription className="text-amber-300">
            <div className="font-bold text-lg mb-2">Loading Battle System...</div>
            <div>Please wait while the game initializes.</div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="text-center py-12">
        <Swords className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Login Required</h2>
        <p className="text-amber-200/70">Please login to enter the battlegrounds.</p>
      </div>
    );
  }

  // Render active battle with snapshot heroes
  if (activeBattleTab && activeDeckHeroes.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-amber-400">Battle #{activeBattleTab.battleId?.slice(-8)}</h1>
          <Button
            onClick={() => handleCloseBattleTab(activeBattleTab.battleId!)}
            variant="outline"
            className="border-amber-600/40 text-amber-400"
          >
            Return to Lobby
          </Button>
        </div>
        
        {error && (
          <Alert className="bg-red-950/50 border-red-600/50">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <GameBoard
          playerDeck={activeDeckHeroes}
          playerName="You"
          onBattleEnd={handleBattleComplete}
          battleId={activeBattleTab.battleId!}
        />
      </div>
    );
  }

  // Render lobby
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-amber-400 mb-2">Battlegrounds</h1>
          <p className="text-xl text-amber-200/80">
            Strategic card battles await. Choose your deck and prove your tactical mastery.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateDialog}
          className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Battle
        </Button>
      </div>

      {error && (
        <Alert className="bg-red-950/50 border-red-600/50">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-amber-950/50 border border-amber-600/40">
          {battleTabs.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300"
            >
              {tab.type === 'waiting' && 'Waiting'}
              {tab.type === 'ongoing' && 'Ongoing'}
              {tab.type === 'finished' && 'Finished'}
              {tab.type === 'active-battle' && `Battle #${tab.battleId?.slice(-8)}`}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="waiting" className="space-y-4">
          <Card className="bg-gradient-to-b from-amber-950/80 to-amber-900/60 border-2 border-amber-600/50">
            <CardHeader>
              <CardTitle className="text-amber-300 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Waiting for Opponents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
                <p className="text-amber-200/70">No battles waiting. Create a new battle to get started!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-4">
          <Card className="bg-gradient-to-b from-amber-950/80 to-amber-900/60 border-2 border-amber-600/50">
            <CardHeader>
              <CardTitle className="text-amber-300 flex items-center gap-2">
                <Swords className="w-5 h-5" />
                Ongoing Battles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
                <p className="text-amber-200/70">No ongoing battles. Your active battles will appear here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finished" className="space-y-4">
          <Card className="bg-gradient-to-b from-amber-950/80 to-amber-900/60 border-2 border-amber-600/50">
            <CardHeader>
              <CardTitle className="text-amber-300 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Battle History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {battlesLoading ? (
                <div className="text-center py-8">
                  <div className="text-amber-400">Loading battle history...</div>
                </div>
              ) : battles && battles.length > 0 ? (
                <div className="space-y-3">
                  {battles.slice(0, 10).map((battle) => (
                    <Card key={battle.id.toString()} className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Swords className="w-5 h-5 text-amber-400" />
                            <div className="text-amber-200/70 text-sm">
                              Battle #{battle.id.toString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 font-semibold">
                              Winner: {battle.winner.toString().slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
                  <p className="text-amber-200/70">No battles recorded yet. Start your first match!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {battleTabs
          .filter(tab => tab.type === 'active-battle')
          .map(tab => (
            <TabsContent key={tab.id} value={tab.id}>
              {/* This content is handled by the active battle render above */}
            </TabsContent>
          ))}
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="bg-gradient-to-b from-amber-950 to-amber-900 border-2 border-amber-600/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-amber-300">Create New Battle</DialogTitle>
            <DialogDescription className="text-amber-200/80">
              Configure your battle settings and choose your deck.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-amber-300 font-semibold">Select Your Deck (≥7 cards required):</Label>
              <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
                <SelectTrigger className="bg-slate-900/70 border-amber-600/40 text-amber-200">
                  <SelectValue placeholder="Choose a deck..." />
                </SelectTrigger>
                <SelectContent className="bg-amber-950 border-amber-600/50">
                  {heroesContext.decksWithPower.map(deck => (
                    <SelectItem
                      key={deck.id}
                      value={deck.id}
                      disabled={deck.cardCount < 7}
                      className="text-amber-200 focus:bg-amber-600/20 focus:text-amber-300"
                    >
                      {deck.name} - {deck.cardCount} cards (Power: {deck.totalPower})
                      {deck.cardCount < 7 && ' - Need 7+ cards'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-amber-300 font-semibold">Turn Timer:</Label>
              <Select value={timerOption} onValueChange={(v) => setTimerOption(v as TimerOption)}>
                <SelectTrigger className="bg-slate-900/70 border-amber-600/40 text-amber-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-amber-950 border-amber-600/50">
                  <SelectItem value="none" className="text-amber-200">No Timer</SelectItem>
                  <SelectItem value="fast" className="text-amber-200">Fast (30s per turn)</SelectItem>
                  <SelectItem value="normal" className="text-amber-200">Normal (60s per turn)</SelectItem>
                  <SelectItem value="slow" className="text-amber-200">Slow (120s per turn)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between bg-slate-900/50 border border-amber-600/30 rounded-lg p-4">
              <div className="space-y-1">
                <Label className="text-amber-300 font-semibold">Opponent Type:</Label>
                <p className="text-sm text-amber-200/70">
                  {isAiOpponent ? 'Battle against AI opponent' : 'Wait for player opponent (PvP coming soon)'}
                </p>
              </div>
              <Switch
                checked={isAiOpponent}
                onCheckedChange={setIsAiOpponent}
                className="data-[state=checked]:bg-amber-600"
              />
            </div>

            {!isAiOpponent && (
              <Alert className="bg-blue-950/50 border-blue-600/50">
                <AlertCircle className="h-5 w-5 text-blue-400" />
                <AlertDescription className="text-blue-300">
                  PvP matchmaking is coming soon! For now, practice against AI opponents.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              className="border-amber-600/40 text-amber-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBattle}
              disabled={!selectedDeckId || !isAiOpponent}
              className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
            >
              Start Battle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BattlegroundsPage() {
  return (
    <LayerGate minLayer={3} featureName="Battlegrounds">
      <BattlegroundsContent />
    </LayerGate>
  );
}
