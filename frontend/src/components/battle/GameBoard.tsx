import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Battle } from '../../types/battle';
import { OwnedHeroCard } from '../../types/heroes';
import { buildBattleDeck, buildAiDeck, initializeBattle, simulateBattleRound } from '../../lib/battleUtils';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import BattleLog from './BattleLog';
import { Heart, Swords, Shield, Trophy, Zap } from 'lucide-react';

interface GameBoardProps {
  playerDeck: OwnedHeroCard[];
  playerName: string;
  onBattleEnd: (victory: boolean, battleId: string, usedHeroOwnedIds: string[]) => void;
  battleId: string;
  timerDuration?: number;
}

/**
 * GameBoard - Stable, event-driven battle UI with complete isolation from parent state changes.
 * 
 * Key Stability Features (Priority 1):
 * ✅ Single initialization effect with stable deck key (no state dependencies)
 * ✅ Manual turn advancement via user button click (event-driven)
 * ✅ Optional timer using functional state updates to avoid stale closures
 * ✅ Ref-based guard ensuring onBattleEnd fires exactly once
 * ✅ Complete cleanup of timers on unmount
 * ✅ No useEffect dependencies on state updated within those effects
 * 
 * Diagnostic Features (Priority 3):
 * ✅ Enhanced development logging for battle phases
 * ✅ Render tracking and performance monitoring
 * ✅ State transition logging for debugging
 */
export default function GameBoard({ 
  playerDeck, 
  playerName, 
  onBattleEnd, 
  battleId,
  timerDuration 
}: GameBoardProps) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refs for stable state tracking
  const battleEndedRef = useRef(false);
  const usedHeroIdsRef = useRef<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initializationKeyRef = useRef<string>('');
  const onBattleEndRef = useRef(onBattleEnd);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  
  // PRIORITY 3: Enhanced diagnostic logging
  if (import.meta.env.DEV) {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;
    
    if (timeSinceLastRender < 16 && renderCountRef.current > 5) {
      console.warn(`[GameBoard] Rapid re-render detected: ${timeSinceLastRender}ms (count: ${renderCountRef.current})`);
    }
    
    if (renderCountRef.current % 10 === 0) {
      console.debug(`[GameBoard] Render count: ${renderCountRef.current}, Battle turn: ${battle?.turn || 'N/A'}`);
    }
  }
  
  // Keep onBattleEnd ref up to date
  useEffect(() => {
    onBattleEndRef.current = onBattleEnd;
  }, [onBattleEnd]);
  
  // Create stable initialization key from deck content only
  const playerDeckKey = JSON.stringify(playerDeck.map(h => ({ id: h.instanceId, name: h.name })));
  
  /**
   * Single initialization effect - runs once per unique deck snapshot.
   * No dependencies on state that changes during battle = no re-initialization loops.
   */
  useEffect(() => {
    // Skip if already initialized with this exact deck
    if (initializationKeyRef.current === playerDeckKey) {
      if (import.meta.env.DEV) {
        console.debug('[GameBoard] Skipping re-initialization - deck unchanged');
      }
      return;
    }
    
    if (import.meta.env.DEV) {
      console.debug('[GameBoard] Initializing battle - Phase: Start', {
        heroCount: playerDeck.length,
        battleId,
      });
    }
    
    initializationKeyRef.current = playerDeckKey;
    
    // Store hero IDs for XP award
    usedHeroIdsRef.current = playerDeck.map(h => h.instanceId).filter(Boolean);
    
    if (import.meta.env.DEV) {
      console.debug('[GameBoard] Stored hero IDs for rewards:', usedHeroIdsRef.current.length);
    }
    
    // Build player deck and distinct AI opponent deck
    const deck1 = buildBattleDeck(playerDeck, playerName);
    const deck2 = buildAiDeck(deck1.cards.length, deck1.totalPower, 'AI Opponent');
    const initialBattle = initializeBattle(deck1, deck2);
    
    setBattle(initialBattle);
    battleEndedRef.current = false;
    
    if (import.meta.env.DEV) {
      console.debug('[GameBoard] Battle initialized successfully - Phase: Complete', {
        deck1Power: deck1.totalPower,
        deck2Power: deck2.totalPower,
        deck1Cards: deck1.cards.length,
        deck2Cards: deck2.cards.length,
      });
    }
    
    return () => {
      if (import.meta.env.DEV) {
        console.debug('[GameBoard] Cleaning up battle - total renders:', renderCountRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playerDeckKey, playerName, battleId]); // Only deck content, name, and battleId - no state dependencies
  
  /**
   * Check if battle is over and invoke callback exactly once.
   * Uses ref to ensure callback fires only once even if called multiple times.
   */
  const checkGameOver = useCallback((currentBattle: Battle) => {
    if (currentBattle.winner !== null && !battleEndedRef.current) {
      if (import.meta.env.DEV) {
        console.debug('[GameBoard] Battle ended - Phase: Victory Check', {
          winner: currentBattle.winner,
          turn: currentBattle.turn,
        });
      }
      
      battleEndedRef.current = true;
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        if (import.meta.env.DEV) {
          console.debug('[GameBoard] Auto-advance timer stopped');
        }
      }
      
      if (typeof currentBattle.winner === 'number') {
        const victory = currentBattle.winner === 1;
        if (import.meta.env.DEV) {
          console.debug('[GameBoard] Firing onBattleEnd callback - Phase: Rewards', {
            victory,
            heroCount: usedHeroIdsRef.current.length,
          });
        }
        onBattleEndRef.current(victory, battleId, usedHeroIdsRef.current);
      }
    }
  }, [battleId]); // Only battleId - stable identifier
  
  /**
   * Event handler: Manual turn advancement triggered by user button click.
   * This is the primary battle progression mechanism - fully event-driven.
   */
  const handleEndTurn = useCallback(() => {
    if (!battle || isProcessing || battle.winner !== null) {
      return;
    }
    
    if (import.meta.env.DEV) {
      console.debug('[GameBoard] Player ending turn manually - Phase: Combat', {
        turn: battle.turn,
        phase: battle.phase,
      });
    }
    
    setIsProcessing(true);
    
    const nextBattle = simulateBattleRound(battle);
    setBattle(nextBattle);
    setIsProcessing(false);
    
    if (import.meta.env.DEV) {
      console.debug('[GameBoard] Turn complete - Phase: Result', {
        turn: nextBattle.turn,
        winner: nextBattle.winner,
        lastEvent: nextBattle.lastEvent,
      });
    }
    
    checkGameOver(nextBattle);
  }, [battle, isProcessing, checkGameOver]);
  
  /**
   * Optional timer effect - completely isolated from battle state.
   * Uses functional state updates to avoid stale closures.
   * Only runs if timerDuration is provided.
   */
  useEffect(() => {
    if (!timerDuration || !battle || battle.winner !== null || battleEndedRef.current) {
      return;
    }
    
    if (import.meta.env.DEV) {
      console.debug('[GameBoard] Starting auto-advance timer:', timerDuration, 'ms');
    }
    
    timerRef.current = setInterval(() => {
      // Use functional update to avoid stale closure
      setBattle(prevBattle => {
        if (!prevBattle || prevBattle.winner !== null || battleEndedRef.current) {
          return prevBattle;
        }
        
        if (import.meta.env.DEV) {
          console.debug('[GameBoard] Auto-advancing turn - Phase: Timer', {
            turn: prevBattle.turn,
          });
        }
        
        const nextBattle = simulateBattleRound(prevBattle);
        
        // Check game over in next tick to avoid state update during render
        setTimeout(() => {
          if (nextBattle.winner !== null && !battleEndedRef.current) {
            if (import.meta.env.DEV) {
              console.debug('[GameBoard] Auto-advance detected victory - Phase: End');
            }
            
            battleEndedRef.current = true;
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            if (typeof nextBattle.winner === 'number') {
              const victory = nextBattle.winner === 1;
              onBattleEndRef.current(victory, battleId, usedHeroIdsRef.current);
            }
          }
        }, 0);
        
        return nextBattle;
      });
    }, timerDuration);
    
    return () => {
      if (timerRef.current) {
        if (import.meta.env.DEV) {
          console.debug('[GameBoard] Clearing auto-advance timer');
        }
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerDuration, battle?.winner, battleId]); // Minimal dependencies
  
  if (!battle) {
    return (
      <div className="text-center py-12">
        <div className="text-amber-400 text-xl">Preparing battlefield...</div>
      </div>
    );
  }
  
  const deck1Cards = battle.deck1.cards.filter(c => c.currentDefense > 0);
  const deck2Cards = battle.deck2.cards.filter(c => c.currentDefense > 0);
  const isComplete = battle.winner !== null;
  
  return (
    <div className="space-y-6">
      {/* Battle Status Bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-950/95 to-amber-900/90 border-2 border-amber-600/60 rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="text-amber-300 font-bold text-xl">Turn {battle.turn}</span>
          </div>
          <span className="text-amber-400 text-sm uppercase tracking-wider">
            Phase: {battle.phase}
          </span>
        </div>
      </div>
      
      {/* Victory/Defeat Banner */}
      {isComplete && (
        <div className="bg-gradient-to-r from-amber-600/90 to-amber-500/80 border-2 border-amber-400 rounded-lg p-6 text-center">
          <Trophy className="w-16 h-16 text-amber-900 mx-auto mb-4" />
          <div className="text-3xl font-bold text-amber-900 mb-2">
            {battle.winner === 1 ? '🏆 Victory!' : '💀 Defeat'}
          </div>
          <div className="text-xl text-amber-950">
            {battle.winner === 1 ? `${battle.deck1.ownerName} wins!` : `${battle.deck2.ownerName} wins!`}
          </div>
        </div>
      )}
      
      {/* Last Combat Event */}
      {battle.lastEvent && (
        <div className="bg-gradient-to-r from-red-950/90 to-red-900/80 border-2 border-red-600/60 rounded-lg p-4">
          <div className="text-red-300 font-bold text-center">
            {battle.lastEvent.attacker} attacked {battle.lastEvent.defender} for {battle.lastEvent.damage} damage
            {battle.lastEvent.defenderDestroyed && ' - DESTROYED!'}
          </div>
        </div>
      )}
      
      {/* Three-Column Battle Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Player Stats & Cards */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-b from-amber-950/90 to-amber-900/80 border-2 border-amber-600/60">
            <CardContent className="p-4 space-y-3">
              <div className="text-amber-300 font-bold text-lg border-b border-amber-600/40 pb-2">
                {battle.deck1.ownerName}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-amber-200">
                  <span className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Cards Remaining
                  </span>
                  <span className="font-bold">{deck1Cards.length}</span>
                </div>
                <div className="flex items-center justify-between text-amber-200">
                  <span className="flex items-center gap-2">
                    <Swords className="w-4 h-4" />
                    Total Power
                  </span>
                  <span className="font-bold">{battle.deck1.totalPower}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-2">
            <div className="text-amber-300 font-semibold text-sm">Your Cards:</div>
            <div className="space-y-2">
              {deck1Cards.slice(0, 5).map(card => (
                <Card
                  key={card.instanceId}
                  className="bg-gradient-to-r from-amber-900/90 to-amber-950/90 border border-amber-600/60"
                >
                  <CardContent className="p-2 flex items-center justify-between">
                    <div className="text-amber-200 font-semibold text-sm truncate flex-1">
                      {card.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 text-red-300">
                        <Swords className="w-3 h-3" />
                        {card.attack}
                      </div>
                      <div className="flex items-center gap-1 text-blue-300">
                        <Shield className="w-3 h-3" />
                        {card.currentDefense}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
        
        {/* Center Column: Battle Log & Controls */}
        <div className="space-y-4">
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-amber-600/50 rounded-lg p-6">
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-amber-400 tracking-wider">VS</div>
              <div className="text-amber-200/70 text-sm">
                {isComplete ? 'Battle Complete' : 'Battle in Progress'}
              </div>
            </div>
          </div>
          
          <BattleLog messages={battle.log} />
          
          {!isComplete && (
            <Button
              onClick={handleEndTurn}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold py-3"
            >
              {isProcessing ? 'Processing...' : 'End Turn'}
            </Button>
          )}
        </div>
        
        {/* Right Column: Opponent Stats & Cards */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-b from-red-950/90 to-red-900/80 border-2 border-red-600/60">
            <CardContent className="p-4 space-y-3">
              <div className="text-red-300 font-bold text-lg border-b border-red-600/40 pb-2">
                {battle.deck2.ownerName}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-red-200">
                  <span className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Cards Remaining
                  </span>
                  <span className="font-bold">{deck2Cards.length}</span>
                </div>
                <div className="flex items-center justify-between text-red-200">
                  <span className="flex items-center gap-2">
                    <Swords className="w-4 h-4" />
                    Total Power
                  </span>
                  <span className="font-bold">{battle.deck2.totalPower}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-2">
            <div className="text-red-300 font-semibold text-sm">Opponent Cards:</div>
            <div className="space-y-2">
              {deck2Cards.slice(0, 5).map(card => (
                <Card
                  key={card.instanceId}
                  className="bg-gradient-to-r from-red-900/90 to-red-950/90 border border-red-600/60"
                >
                  <CardContent className="p-2 flex items-center justify-between">
                    <div className="text-red-200 font-semibold text-sm truncate flex-1">
                      {card.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 text-red-300">
                        <Swords className="w-3 h-3" />
                        {card.attack}
                      </div>
                      <div className="flex items-center gap-1 text-blue-300">
                        <Shield className="w-3 h-3" />
                        {card.currentDefense}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
