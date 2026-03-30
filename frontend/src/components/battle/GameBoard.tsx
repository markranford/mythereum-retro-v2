import { useState, useEffect, useRef, useCallback } from 'react';
import { Battle, BattleCard } from '../../types/battle';
import { OwnedHeroCard } from '../../types/heroes';
import { buildBattleDeck, buildAiDeck, initializeBattle, simulateBattleRound, PlayerTargeting } from '../../lib/battleUtils';
import { useGameConfig } from '../../context/GameConfigContext';
import { CombatConfig, ClassAbilitiesConfig } from '../../types/gameConfig';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import BattleLog from './BattleLog';
import { Heart, Swords, Shield, Trophy, Zap, Crosshair, RotateCcw } from 'lucide-react';

interface GameBoardProps {
  playerDeck: OwnedHeroCard[];
  playerName: string;
  onBattleEnd: (victory: boolean, battleId: string, usedHeroOwnedIds: string[]) => void;
  battleId: string;
  timerDuration?: number;
}

/**
 * GameBoard - Battle UI with player card targeting.
 *
 * Targeting flow:
 * 1. Player clicks one of their cards → selected as attacker (amber glow)
 * 2. Player clicks an enemy card → selected as target (red glow)
 * 3. Player clicks "Attack!" to execute with chosen attacker+target
 * 4. Or clicks "End Turn (Random)" to let the system pick randomly
 * 5. After Phase 1, the AI counterattacks randomly (Phase 2)
 *
 * Stability:
 * ✅ Single initialization effect with stable deck key
 * ✅ Manual turn advancement via user button click (event-driven)
 * ✅ Optional timer using functional state updates
 * ✅ Ref-based guard ensuring onBattleEnd fires exactly once
 */
export default function GameBoard({
  playerDeck,
  playerName,
  onBattleEnd,
  battleId,
  timerDuration,
}: GameBoardProps) {
  const { combat: combatConfig, classAbilities: abilitiesConfig } = useGameConfig();
  const combatConfigRef = useRef<CombatConfig>(combatConfig);
  const abilitiesConfigRef = useRef<ClassAbilitiesConfig>(abilitiesConfig);

  const [battle, setBattle] = useState<Battle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Targeting state
  const [selectedAttacker, setSelectedAttacker] = useState<string | number | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | number | null>(null);

  // Refs for stable state tracking
  useEffect(() => { combatConfigRef.current = combatConfig; }, [combatConfig]);
  useEffect(() => { abilitiesConfigRef.current = abilitiesConfig; }, [abilitiesConfig]);
  const battleEndedRef = useRef(false);
  const usedHeroIdsRef = useRef<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initializationKeyRef = useRef<string>('');
  const onBattleEndRef = useRef(onBattleEnd);

  // Keep onBattleEnd ref up to date
  useEffect(() => {
    onBattleEndRef.current = onBattleEnd;
  }, [onBattleEnd]);

  // Create stable initialization key from deck content only
  const playerDeckKey = JSON.stringify(playerDeck.map(h => ({ id: h.instanceId, name: h.name })));

  /**
   * Single initialization effect - runs once per unique deck snapshot.
   */
  useEffect(() => {
    if (initializationKeyRef.current === playerDeckKey) return;

    initializationKeyRef.current = playerDeckKey;
    usedHeroIdsRef.current = playerDeck.map(h => h.instanceId).filter(Boolean);

    const deck1 = buildBattleDeck(playerDeck, playerName);
    const deck2 = buildAiDeck(deck1.cards.length, deck1.totalPower, 'AI Opponent');
    const initialBattle = initializeBattle(deck1, deck2);

    setBattle(initialBattle);
    battleEndedRef.current = false;
    setSelectedAttacker(null);
    setSelectedTarget(null);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playerDeckKey, playerName, battleId]);

  /**
   * Check if battle is over and invoke callback exactly once.
   */
  const checkGameOver = useCallback((currentBattle: Battle) => {
    if (currentBattle.winner !== null && !battleEndedRef.current) {
      battleEndedRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (typeof currentBattle.winner === 'number') {
        const victory = currentBattle.winner === 1;
        onBattleEndRef.current(victory, battleId, usedHeroIdsRef.current);
      }
    }
  }, [battleId]);

  /**
   * Execute a round with optional player targeting, then reset selections.
   */
  const executeRound = useCallback((targeting?: PlayerTargeting) => {
    if (!battle || isProcessing || battle.winner !== null) return;

    setIsProcessing(true);
    const nextBattle = simulateBattleRound(battle, combatConfigRef.current, targeting, abilitiesConfigRef.current);
    setBattle(nextBattle);
    setIsProcessing(false);
    setSelectedAttacker(null);
    setSelectedTarget(null);
    checkGameOver(nextBattle);
  }, [battle, isProcessing, checkGameOver]);

  /** Attack with chosen attacker + target */
  const handleTargetedAttack = useCallback(() => {
    if (selectedAttacker == null && selectedTarget == null) {
      // No selection at all — random
      executeRound();
      return;
    }
    const targeting: PlayerTargeting = {};
    if (selectedAttacker != null) targeting.attackerInstanceId = selectedAttacker;
    if (selectedTarget != null) targeting.targetInstanceId = selectedTarget;
    executeRound(targeting);
  }, [selectedAttacker, selectedTarget, executeRound]);

  /** End turn with random picks */
  const handleEndTurnRandom = useCallback(() => {
    executeRound();
  }, [executeRound]);

  /** Click a player card to select it as attacker */
  const handleSelectAttacker = useCallback((instanceId: string | number) => {
    if (!battle || battle.winner !== null || isProcessing) return;
    setSelectedAttacker(prev => prev === instanceId ? null : instanceId);
  }, [battle, isProcessing]);

  /** Click an enemy card to select it as target */
  const handleSelectTarget = useCallback((instanceId: string | number) => {
    if (!battle || battle.winner !== null || isProcessing) return;
    setSelectedTarget(prev => prev === instanceId ? null : instanceId);
  }, [battle, isProcessing]);

  /** Clear targeting selections */
  const handleClearSelection = useCallback(() => {
    setSelectedAttacker(null);
    setSelectedTarget(null);
  }, []);

  /**
   * Optional timer - auto-advance with random targeting.
   */
  useEffect(() => {
    if (!timerDuration || !battle || battle.winner !== null || battleEndedRef.current) return;

    timerRef.current = setInterval(() => {
      setBattle(prevBattle => {
        if (!prevBattle || prevBattle.winner !== null || battleEndedRef.current) return prevBattle;

        const nextBattle = simulateBattleRound(prevBattle, combatConfigRef.current, undefined, abilitiesConfigRef.current);

        setTimeout(() => {
          if (nextBattle.winner !== null && !battleEndedRef.current) {
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
      // Also clear targeting during auto mode
      setSelectedAttacker(null);
      setSelectedTarget(null);
    }, timerDuration);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerDuration, battle?.winner, battleId]);

  if (!battle) {
    return (
      <div className="text-center py-12">
        <div className="text-amber-400 text-xl">Preparing battlefield...</div>
      </div>
    );
  }

  /** Get the passive ability name and color for a card's class */
  const getAbilityBadge = (cardClass?: string): { name: string; color: string } | null => {
    switch (cardClass) {
      case 'Warrior': return { name: 'Fortify', color: 'bg-yellow-700/50 text-yellow-300' };
      case 'Mage':    return { name: 'Arcane Surge', color: 'bg-purple-700/50 text-purple-300' };
      case 'Rogue':   return { name: 'Critical Strike', color: 'bg-emerald-700/50 text-emerald-300' };
      case 'Healer':  return { name: 'Rejuvenation', color: 'bg-green-700/50 text-green-300' };
      case 'Ranger':  return { name: 'Precision Shot', color: 'bg-sky-700/50 text-sky-300' };
      default: return null;
    }
  };

  const deck1Cards = battle.deck1.cards;
  const deck2Cards = battle.deck2.cards;
  const liveDeck1 = deck1Cards.filter(c => c.currentDefense > 0);
  const liveDeck2 = deck2Cards.filter(c => c.currentDefense > 0);
  const isComplete = battle.winner !== null;
  const hasSelection = selectedAttacker != null || selectedTarget != null;

  /** Render a single battle card with selection UI */
  const renderCard = (card: BattleCard, side: 'player' | 'enemy') => {
    const isAlive = card.currentDefense > 0;
    const isSelected = side === 'player'
      ? selectedAttacker === card.instanceId
      : selectedTarget === card.instanceId;

    // Was this card involved in the last round's events?
    const lastRoundEvent = battle.roundEvents?.find(e =>
      (side === 'player' && e.side === 2 && e.defenderInstanceId === card.instanceId) ||
      (side === 'enemy' && e.side === 1 && e.defenderInstanceId === card.instanceId) ||
      (side === 'player' && e.side === 1 && e.attackerInstanceId === card.instanceId) ||
      (side === 'enemy' && e.side === 2 && e.attackerInstanceId === card.instanceId)
    );
    const wasAttacked = lastRoundEvent && lastRoundEvent.defenderInstanceId === card.instanceId;
    const wasAttacker = lastRoundEvent && lastRoundEvent.attackerInstanceId === card.instanceId;

    const baseClasses = side === 'player'
      ? 'bg-gradient-to-r from-amber-900/90 to-amber-950/90 border-amber-600/60'
      : 'bg-gradient-to-r from-red-900/90 to-red-950/90 border-red-600/60';

    const selectedClasses = isSelected
      ? side === 'player'
        ? 'ring-2 ring-amber-400 border-amber-400 shadow-lg shadow-amber-400/30'
        : 'ring-2 ring-red-400 border-red-400 shadow-lg shadow-red-400/30'
      : '';

    const deadClasses = !isAlive ? 'opacity-40 grayscale' : '';

    const hitFlash = wasAttacked && isAlive ? 'animate-pulse' : '';
    const strikeGlow = wasAttacker && isAlive ? '' : '';

    const clickable = !isComplete && isAlive && !isProcessing;
    const cursorClass = clickable ? 'cursor-pointer hover:scale-[1.02] transition-transform' : '';

    const handleClick = () => {
      if (!clickable) return;
      if (side === 'player') handleSelectAttacker(card.instanceId);
      else handleSelectTarget(card.instanceId);
    };

    const hpPercent = isAlive ? Math.round((card.currentDefense / card.defense) * 100) : 0;

    return (
      <Card
        key={card.instanceId}
        className={`border ${baseClasses} ${selectedClasses} ${deadClasses} ${hitFlash} ${strikeGlow} ${cursorClass} relative`}
        onClick={handleClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-bold truncate flex-1" style={{ color: isAlive ? (side === 'player' ? '#fcd34d' : '#fca5a5') : '#6b7280' }}>
              {isSelected && <Crosshair className="w-3 h-3 inline mr-1" />}
              {card.name}
            </div>
            {!isAlive && (
              <span className="text-xs text-gray-500 font-bold ml-1">DEAD</span>
            )}
          </div>

          {/* HP bar */}
          <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1" style={{ color: '#fca5a5' }}>
                <Swords className="w-3 h-3" />
                <span className="font-bold">{card.attack}</span>
              </div>
              <div className="flex items-center gap-1" style={{ color: '#93c5fd' }}>
                <Shield className="w-3 h-3" />
                <span className="font-bold">{card.currentDefense}/{card.defense}</span>
              </div>
            </div>
            {card.class && (
              <span className="text-gray-400 text-[10px] uppercase">{card.class}</span>
            )}
          </div>

          {/* Ability badge */}
          {isAlive && (() => {
            const badge = getAbilityBadge(card.class);
            return badge ? (
              <div className={`mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block ${badge.color}`}>
                {badge.name}
              </div>
            ) : null;
          })()}

          {/* Damage number flash */}
          {wasAttacked && lastRoundEvent && (
            <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
              -{lastRoundEvent.damage}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
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
        {/* Targeting status indicator */}
        {!isComplete && (
          <div className="text-sm text-amber-200/70">
            {selectedAttacker != null && selectedTarget != null
              ? '✅ Ready to Attack!'
              : selectedAttacker != null
              ? '🗡️ Now pick an enemy target...'
              : selectedTarget != null
              ? '🎯 Target chosen — pick your attacker...'
              : '⚔️ Click your card, then an enemy, or just End Turn'}
          </div>
        )}
      </div>

      {/* Victory/Defeat Banner */}
      {isComplete && (
        <div className="bg-gradient-to-r from-amber-600/90 to-amber-500/80 border-2 border-amber-400 rounded-lg p-6 text-center">
          <Trophy className="w-16 h-16 text-amber-900 mx-auto mb-4" />
          <div className="text-3xl font-bold text-amber-900 mb-2">
            {battle.winner === 1 ? 'Victory!' : 'Defeat'}
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
                    Cards Alive
                  </span>
                  <span className="font-bold">{liveDeck1.length} / {deck1Cards.length}</span>
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
            <div className="text-amber-300 font-semibold text-sm flex items-center gap-2">
              Your Cards
              {!isComplete && <span className="text-amber-400/60 text-xs font-normal">(click to select attacker)</span>}
            </div>
            <div className="space-y-2">
              {deck1Cards.map(card => renderCard(card, 'player'))}
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
            <div className="space-y-2">
              {/* Targeted attack button — prominent when selections made */}
              {hasSelection && (
                <>
                  <Button
                    onClick={handleTargetedAttack}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 text-lg"
                  >
                    {isProcessing ? 'Processing...' : (
                      <>
                        <Crosshair className="w-5 h-5 mr-2 inline" />
                        Attack!
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleClearSelection}
                    variant="outline"
                    className="w-full border-amber-600/40 text-amber-400 text-sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-2 inline" />
                    Clear Selection
                  </Button>
                </>
              )}

              {/* Random end turn button */}
              <Button
                onClick={handleEndTurnRandom}
                disabled={isProcessing}
                variant={hasSelection ? 'outline' : 'default'}
                className={hasSelection
                  ? 'w-full border-amber-600/40 text-amber-400'
                  : 'w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold py-3'
                }
              >
                {isProcessing ? 'Processing...' : (hasSelection ? 'End Turn (Random Instead)' : 'End Turn')}
              </Button>
            </div>
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
                    Cards Alive
                  </span>
                  <span className="font-bold">{liveDeck2.length} / {deck2Cards.length}</span>
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
            <div className="text-red-300 font-semibold text-sm flex items-center gap-2">
              Enemy Cards
              {!isComplete && <span className="text-red-400/60 text-xs font-normal">(click to select target)</span>}
            </div>
            <div className="space-y-2">
              {deck2Cards.map(card => renderCard(card, 'enemy'))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
