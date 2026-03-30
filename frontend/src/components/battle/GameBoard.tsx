import { useState, useEffect, useRef, useCallback } from 'react';
import { Battle, BattleCard, MagickPool } from '../../types/battle';
import { OwnedHeroCard } from '../../types/heroes';
import { MagickCost } from '../../types/game';
import { buildBattleDeck, buildAiDeck, initializeBattle, simulateBattleRound, canAffordAbility, totalMagickCost, PlayerTargeting } from '../../lib/battleUtils';
import { useGameConfig } from '../../context/GameConfigContext';
import { CombatConfig, ClassAbilitiesConfig, MagickConfig } from '../../types/gameConfig';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import BattleLog from './BattleLog';
import { Heart, Swords, Shield, Trophy, Zap, Sparkles, ArrowLeftRight, RotateCcw, Skull, Star } from 'lucide-react';

interface GameBoardProps {
  playerDeck: OwnedHeroCard[];
  playerName: string;
  onBattleEnd: (victory: boolean, battleId: string, usedHeroOwnedIds: string[]) => void;
  battleId: string;
  timerDuration?: number;
}

/**
 * GameBoard — Original Mythereum battle UI.
 *
 * Layout:
 * - Top center: Enemy leader (large card)
 * - Middle: VS indicator + player HP bars + magick display
 * - Bottom center: Player leader (large card)
 * - Bottom row: Player hand cards (click to swap as leader)
 * - Side: Battle log + controls
 *
 * Turn flow:
 * 1. (Optional) Click hand card to swap as leader
 * 2. (Optional) Click ability button to activate leader's ability
 * 3. Click "Fight!" to execute the turn
 */
export default function GameBoard({
  playerDeck,
  playerName,
  onBattleEnd,
  battleId,
  timerDuration,
}: GameBoardProps) {
  const { combat: combatConfig, classAbilities: abilitiesConfig, magick: magickConfig } = useGameConfig();
  const combatConfigRef = useRef<CombatConfig>(combatConfig);
  const abilitiesConfigRef = useRef<ClassAbilitiesConfig>(abilitiesConfig);
  const magickConfigRef = useRef<MagickConfig>(magickConfig);

  const [battle, setBattle] = useState<Battle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Turn actions
  const [pendingSwap, setPendingSwap] = useState<string | number | null>(null);
  const [pendingAbility, setPendingAbility] = useState(false);

  // Refs
  useEffect(() => { combatConfigRef.current = combatConfig; }, [combatConfig]);
  useEffect(() => { abilitiesConfigRef.current = abilitiesConfig; }, [abilitiesConfig]);
  useEffect(() => { magickConfigRef.current = magickConfig; }, [magickConfig]);
  const battleEndedRef = useRef(false);
  const usedHeroIdsRef = useRef<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initializationKeyRef = useRef<string>('');
  const onBattleEndRef = useRef(onBattleEnd);

  useEffect(() => { onBattleEndRef.current = onBattleEnd; }, [onBattleEnd]);

  const playerDeckKey = JSON.stringify(playerDeck.map(h => ({ id: h.instanceId, name: h.name })));

  // Initialize battle
  useEffect(() => {
    if (initializationKeyRef.current === playerDeckKey) return;
    initializationKeyRef.current = playerDeckKey;
    usedHeroIdsRef.current = playerDeck.map(h => h.instanceId).filter(Boolean);

    const deck1 = buildBattleDeck(playerDeck, playerName, combatConfigRef.current, magickConfigRef.current);
    const deck2 = buildAiDeck(deck1.cards.length, deck1.totalPower, 'AI Opponent', combatConfigRef.current, magickConfigRef.current);
    const initialBattle = initializeBattle(deck1, deck2);

    setBattle(initialBattle);
    battleEndedRef.current = false;
    setPendingSwap(null);
    setPendingAbility(false);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playerDeckKey, playerName, battleId]);

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

  const executeRound = useCallback((targeting?: PlayerTargeting) => {
    if (!battle || isProcessing || battle.winner !== null) return;

    setIsProcessing(true);
    const nextBattle = simulateBattleRound(
      battle,
      combatConfigRef.current,
      targeting,
      abilitiesConfigRef.current,
      magickConfigRef.current,
    );
    setBattle(nextBattle);
    setIsProcessing(false);
    setPendingSwap(null);
    setPendingAbility(false);
    checkGameOver(nextBattle);
  }, [battle, isProcessing, checkGameOver]);

  /** Execute turn with current pending actions */
  const handleFight = useCallback(() => {
    const targeting: PlayerTargeting = {};
    if (pendingSwap != null) targeting.swapLeaderInstanceId = pendingSwap;
    if (pendingAbility) targeting.activateAbility = true;
    executeRound(targeting);
  }, [pendingSwap, pendingAbility, executeRound]);

  /** Select a hand card to swap as leader */
  const handleSelectSwap = useCallback((instanceId: string | number) => {
    if (!battle || battle.winner !== null || isProcessing) return;
    setPendingSwap(prev => prev === instanceId ? null : instanceId);
  }, [battle, isProcessing]);

  /** Toggle ability activation */
  const handleToggleAbility = useCallback(() => {
    setPendingAbility(prev => !prev);
  }, []);

  /** Clear all pending actions */
  const handleClearActions = useCallback(() => {
    setPendingSwap(null);
    setPendingAbility(false);
  }, []);

  // Auto-timer
  useEffect(() => {
    if (!timerDuration || !battle || battle.winner !== null || battleEndedRef.current) return;

    timerRef.current = setInterval(() => {
      setBattle(prevBattle => {
        if (!prevBattle || prevBattle.winner !== null || battleEndedRef.current) return prevBattle;
        const nextBattle = simulateBattleRound(prevBattle, combatConfigRef.current, undefined, abilitiesConfigRef.current, magickConfigRef.current);
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
      setPendingSwap(null);
      setPendingAbility(false);
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

  const isComplete = battle.winner !== null;
  const d1 = battle.deck1;
  const d2 = battle.deck2;

  // Can player activate ability?
  const playerAbility = d1.leader?.ability;
  const canActivate = playerAbility && canAffordAbility(d1.magick, playerAbility.cost);
  const hasPendingActions = pendingSwap != null || pendingAbility;

  // === RENDER HELPERS ===

  /** Render magick pool display */
  const renderMagickPool = (pool: MagickPool, side: 'player' | 'enemy') => (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-white/80 border border-white/40" />
        <span className="text-white font-bold">{pool.white}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-gray-900 border border-gray-500" />
        <span className="text-gray-300 font-bold">{pool.black}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-gray-500 border border-gray-400" />
        <span className="text-gray-400 font-bold">{pool.grey}</span>
      </div>
    </div>
  );

  /** Render magick cost pips */
  const renderMagickCost = (cost: MagickCost) => (
    <div className="flex items-center gap-1">
      {(cost.white || 0) > 0 && Array.from({ length: cost.white! }).map((_, i) => (
        <div key={`w${i}`} className="w-3 h-3 rounded-full bg-white/80 border border-white/40" />
      ))}
      {(cost.black || 0) > 0 && Array.from({ length: cost.black! }).map((_, i) => (
        <div key={`b${i}`} className="w-3 h-3 rounded-full bg-gray-900 border border-gray-500" />
      ))}
      {(cost.grey || 0) > 0 && Array.from({ length: cost.grey! }).map((_, i) => (
        <div key={`g${i}`} className="w-3 h-3 rounded-full bg-gray-500 border border-gray-400" />
      ))}
    </div>
  );

  /** Get edition border color */
  const getEditionBorder = (edition?: string) => {
    switch (edition) {
      case 'Genesis': return 'border-red-500/70';
      case 'Awakening': return 'border-blue-500/70';
      case 'Survivor': return 'border-gray-600/70';
      default: return 'border-amber-500/50';
    }
  };

  const getEditionGlow = (edition?: string) => {
    switch (edition) {
      case 'Genesis': return 'shadow-red-500/30';
      case 'Awakening': return 'shadow-blue-500/30';
      case 'Survivor': return 'shadow-gray-500/30';
      default: return 'shadow-amber-500/20';
    }
  };

  /** Render a leader card (large format, like original Mythereum) */
  const renderLeaderCard = (card: BattleCard | null, side: 'player' | 'enemy') => {
    if (!card) {
      return (
        <div className="w-64 h-80 border-2 border-dashed border-gray-600/50 rounded-xl flex items-center justify-center bg-gray-900/30">
          <div className="text-center text-gray-500">
            <Skull className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div className="text-sm">No Leader</div>
          </div>
        </div>
      );
    }

    const hpPercent = Math.round((card.currentDefense / card.defense) * 100);
    const wasAttacked = battle.roundEvents?.some(e => e.defenderInstanceId === card.instanceId && e.damage > 0);
    const hitFlash = wasAttacked ? 'animate-pulse' : '';
    const edgeBorder = getEditionBorder(card.edition);
    const edgeGlow = getEditionGlow(card.edition);

    const effectiveAtk = card.attack + (card.tempAttackBoost || 0);
    const isHidden = card.isHidden;
    const isStunned = card.isStunned;
    const hasAnnihilate = card.hasAnnihilate;

    return (
      <div className={`w-64 relative ${hitFlash}`}>
        <Card className={`border-3 ${edgeBorder} bg-gradient-to-b from-slate-900/95 to-slate-800/95 shadow-lg ${edgeGlow} overflow-hidden`}>
          <CardContent className="p-0">
            {/* Card Header — Name + Level + Edition */}
            <div className="px-3 py-2 bg-gradient-to-r from-amber-950/80 to-slate-900/80 border-b border-amber-600/30">
              <div className="flex items-center justify-between">
                <span className="text-amber-300 font-bold text-sm truncate flex-1">{card.name}</span>
                <span className="text-amber-400/60 text-xs ml-2">Lv.{card.level || 1}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-amber-200/50">{card.class}</span>
                <span className="text-amber-200/40">{card.edition}</span>
              </div>
            </div>

            {/* Card Art Area (placeholder with class icon) */}
            <div className="h-28 bg-gradient-to-b from-slate-800/50 to-slate-700/50 flex items-center justify-center relative">
              <div className="text-6xl opacity-30">
                {card.class === 'Warrior' ? '⚔️' : card.class === 'Mage' ? '🔮' : card.class === 'Rogue' ? '🗡️' : card.class === 'Healer' ? '✨' : '🏹'}
              </div>
              {/* Status overlays */}
              {isHidden && (
                <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
                  <span className="text-gray-300 font-bold text-lg">HIDDEN</span>
                </div>
              )}
              {isStunned && (
                <div className="absolute inset-0 bg-yellow-900/60 flex items-center justify-center">
                  <span className="text-yellow-300 font-bold text-lg">STUNNED</span>
                </div>
              )}
              {hasAnnihilate && (
                <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center animate-pulse">
                  <span className="text-red-300 font-bold text-lg">ANNIHILATE</span>
                </div>
              )}
            </div>

            {/* Stats Bar — ATK (left) / DEF (right) */}
            <div className="flex items-center justify-between px-3 py-1 bg-slate-900/80">
              <div className="flex items-center gap-1">
                <Swords className="w-4 h-4 text-red-400" />
                <span className={`font-black text-lg ${effectiveAtk > card.attack ? 'text-green-400' : 'text-red-300'}`}>
                  {effectiveAtk}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="font-black text-lg text-blue-300">{card.defense}</span>
              </div>
            </div>

            {/* HP Bar */}
            <div className="px-3 py-1">
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <div className="text-center text-[10px] text-gray-400 mt-0.5">
                {card.currentDefense}/{card.defense} HP
              </div>
            </div>

            {/* Ability Section */}
            {card.ability && (
              <div className="px-3 py-2 border-t border-amber-600/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-300 text-xs font-bold">{card.ability.name}</span>
                  {renderMagickCost(card.ability.cost)}
                </div>
                <p className="text-amber-200/50 text-[10px] leading-tight">{card.ability.description}</p>
              </div>
            )}

            {/* Bottom: Magick generation gems */}
            {card.magickGeneration && (
              <div className="flex items-center justify-center gap-2 py-1.5 bg-slate-900/60 border-t border-slate-700/50">
                {card.magickGeneration.white > 0 && (
                  <div className="flex items-center gap-0.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                    <span className="text-[9px] text-white/60">{card.magickGeneration.white}%</span>
                  </div>
                )}
                {card.magickGeneration.black > 0 && (
                  <div className="flex items-center gap-0.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-500" />
                    <span className="text-[9px] text-gray-400">{card.magickGeneration.black}%</span>
                  </div>
                )}
                {card.magickGeneration.grey > 0 && (
                  <div className="flex items-center gap-0.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                    <span className="text-[9px] text-gray-500">{card.magickGeneration.grey}%</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Damage flash overlay */}
        {wasAttacked && battle.roundEvents && (() => {
          const evt = battle.roundEvents.find(e => e.defenderInstanceId === card.instanceId);
          return evt ? (
            <div className="absolute -top-3 -right-3 bg-red-600 text-white text-sm font-black rounded-full w-8 h-8 flex items-center justify-center animate-bounce z-10">
              -{evt.damage}
            </div>
          ) : null;
        })()}
      </div>
    );
  };

  /** Render a hand card (smaller, clickable for swap) */
  const renderHandCard = (card: BattleCard, isSwapTarget: boolean) => {
    const edgeBorder = getEditionBorder(card.edition);
    const clickable = !isComplete && !isProcessing;

    return (
      <Card
        key={String(card.instanceId)}
        onClick={() => clickable && handleSelectSwap(card.instanceId)}
        className={`border-2 ${edgeBorder} bg-gradient-to-b from-slate-900/90 to-slate-800/90
          ${isSwapTarget ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/30' : ''}
          ${clickable ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
          w-32`}
      >
        <CardContent className="p-2">
          <div className="text-amber-300 font-bold text-xs truncate">{card.name}</div>
          <div className="text-amber-200/40 text-[10px]">{card.class} • {card.edition}</div>
          <div className="flex items-center justify-between mt-1 text-xs">
            <div className="flex items-center gap-1 text-red-300">
              <Swords className="w-3 h-3" />
              <span className="font-bold">{card.attack}</span>
            </div>
            <div className="flex items-center gap-1 text-blue-300">
              <Shield className="w-3 h-3" />
              <span className="font-bold">{card.defense}</span>
            </div>
          </div>
          {card.ability && (
            <div className="mt-1 text-[9px] text-amber-300/70 truncate">
              {card.ability.name}
            </div>
          )}
          {isSwapTarget && (
            <div className="mt-1 text-[10px] text-amber-400 font-bold text-center">
              <ArrowLeftRight className="w-3 h-3 inline mr-0.5" />SWAP
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  /** Render player HP bar */
  const renderPlayerHp = (hp: number, maxHp: number, name: string, side: 'player' | 'enemy') => {
    const pct = Math.max(0, Math.round((hp / maxHp) * 100));
    const barColor = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-500' : 'bg-red-500';
    const textColor = side === 'player' ? 'text-amber-300' : 'text-red-300';

    return (
      <div className="w-full max-w-xs">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-bold ${textColor}`}>{name}</span>
          <span className={`text-sm font-bold ${textColor}`}>
            <Heart className="w-3 h-3 inline mr-1" />{hp}/{maxHp}
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* === VICTORY / DEFEAT BANNER === */}
      {isComplete && (
        <div className={`border-2 rounded-lg p-6 text-center ${
          battle.winner === 1
            ? 'bg-gradient-to-r from-amber-600/90 to-amber-500/80 border-amber-400'
            : 'bg-gradient-to-r from-red-800/90 to-red-700/80 border-red-500'
        }`}>
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${battle.winner === 1 ? 'text-amber-900' : 'text-red-200'}`} />
          <div className={`text-3xl font-bold mb-2 ${battle.winner === 1 ? 'text-amber-900' : 'text-red-100'}`}>
            {battle.winner === 1 ? 'VICTORY!' : 'DEFEAT'}
          </div>
          <div className={`text-xl ${battle.winner === 1 ? 'text-amber-950' : 'text-red-200'}`}>
            {battle.winner === 1 ? d1.ownerName : d2.ownerName} wins!
          </div>
        </div>
      )}

      {/* === TURN INDICATOR === */}
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-950/95 to-amber-900/90 border-2 border-amber-600/60 rounded-lg p-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="text-amber-300 font-bold text-xl">Turn {battle.turn}</span>
          </div>
        </div>
        <div className="text-sm text-amber-200/70">
          {isComplete ? 'Battle Complete' : hasPendingActions ? 'Actions queued — click Fight!' : 'Choose actions or Fight!'}
        </div>
      </div>

      {/* === MAIN BATTLE AREA === */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">

        {/* LEFT COLUMN: Battle Log */}
        <div className="space-y-3 order-3 lg:order-1">
          <BattleLog messages={battle.log} />
        </div>

        {/* CENTER COLUMN: Leader vs Leader + HP + Controls */}
        <div className="space-y-4 order-1 lg:order-2 flex flex-col items-center">

          {/* Enemy HP + Magick */}
          <div className="w-full max-w-xs space-y-2">
            {renderPlayerHp(d2.playerHp, d2.maxPlayerHp, d2.ownerName, 'enemy')}
            <div className="flex items-center justify-between">
              <span className="text-red-400/60 text-xs">Magick:</span>
              {renderMagickPool(d2.magick, 'enemy')}
            </div>
            <div className="text-red-400/50 text-xs text-center">
              Hand: {d2.hand.length} cards | Graveyard: {d2.graveyard.length}
            </div>
          </div>

          {/* Enemy Leader */}
          <div className="flex flex-col items-center">
            <div className="text-red-400 text-xs font-bold mb-1 uppercase tracking-wider">Enemy Leader</div>
            {renderLeaderCard(d2.leader, 'enemy')}
          </div>

          {/* VS Indicator */}
          <div className="py-2">
            <div className="text-5xl font-black text-amber-400/80 tracking-widest">VS</div>
          </div>

          {/* Player Leader */}
          <div className="flex flex-col items-center">
            <div className="text-amber-400 text-xs font-bold mb-1 uppercase tracking-wider">Your Leader</div>
            {renderLeaderCard(d1.leader, 'player')}
          </div>

          {/* Player HP + Magick */}
          <div className="w-full max-w-xs space-y-2">
            {renderPlayerHp(d1.playerHp, d1.maxPlayerHp, d1.ownerName, 'player')}
            <div className="flex items-center justify-between">
              <span className="text-amber-400/60 text-xs">Magick:</span>
              {renderMagickPool(d1.magick, 'player')}
            </div>
          </div>

          {/* Player Hand — Swap Cards */}
          {d1.hand.length > 0 && !isComplete && (
            <div className="w-full">
              <div className="text-amber-300 text-xs font-bold mb-2 text-center">
                <ArrowLeftRight className="w-3 h-3 inline mr-1" />
                Your Hand — Click to swap as Leader
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {d1.hand.map(card => renderHandCard(card, pendingSwap === card.instanceId))}
              </div>
            </div>
          )}

          {/* Graveyard count */}
          {d1.graveyard.length > 0 && (
            <div className="text-amber-400/40 text-xs">
              <Skull className="w-3 h-3 inline mr-1" />
              Graveyard: {d1.graveyard.map(c => c.name).join(', ')}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Controls */}
        <div className="space-y-3 order-2 lg:order-3">

          {/* Ability Activation */}
          {!isComplete && playerAbility && (
            <Card className="bg-gradient-to-b from-purple-950/80 to-purple-900/60 border-2 border-purple-500/40">
              <CardContent className="p-4 space-y-2">
                <div className="text-purple-300 font-bold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Leader Ability
                </div>
                <div className="text-purple-200 text-sm font-semibold">{playerAbility.name}</div>
                <p className="text-purple-200/60 text-xs">{playerAbility.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-purple-300/70">
                    Cost: {renderMagickCost(playerAbility.cost)}
                  </div>
                </div>
                <Button
                  onClick={handleToggleAbility}
                  disabled={!canActivate || isProcessing}
                  variant={pendingAbility ? 'default' : 'outline'}
                  className={pendingAbility
                    ? 'w-full bg-purple-600 hover:bg-purple-500 text-white font-bold'
                    : 'w-full border-purple-500/40 text-purple-300'
                  }
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {pendingAbility ? 'Ability Queued!' : canActivate ? 'Activate Ability' : 'Not Enough Magick'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Fight Button + Controls */}
          {!isComplete && (
            <div className="space-y-2">
              <Button
                onClick={handleFight}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 text-lg"
              >
                {isProcessing ? 'Fighting...' : (
                  <>
                    <Swords className="w-5 h-5 mr-2" />
                    FIGHT!
                  </>
                )}
              </Button>

              {hasPendingActions && (
                <div className="space-y-1">
                  <div className="text-amber-300/70 text-xs text-center">
                    {pendingSwap != null && '🔄 Swap leader queued'}
                    {pendingSwap != null && pendingAbility && ' + '}
                    {pendingAbility && '✨ Ability queued'}
                  </div>
                  <Button
                    onClick={handleClearActions}
                    variant="outline"
                    className="w-full border-amber-600/40 text-amber-400 text-sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear Actions
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Last Combat Event */}
          {battle.lastEvent && (
            <Card className="bg-gradient-to-b from-red-950/80 to-red-900/60 border border-red-600/40">
              <CardContent className="p-3">
                <div className="text-red-300 font-bold text-sm text-center">
                  {battle.lastEvent.attacker} hit {battle.lastEvent.defender} for {battle.lastEvent.damage} dmg
                  {battle.lastEvent.defenderDestroyed && ' — DESTROYED!'}
                  {(battle.lastEvent.excessDamage || 0) > 0 && ` (${battle.lastEvent.excessDamage} excess!)`}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Battle Info */}
          <Card className="bg-gradient-to-b from-slate-900/80 to-slate-800/60 border border-amber-600/30">
            <CardContent className="p-3 space-y-2 text-xs text-amber-200/60">
              <div className="text-amber-300 font-bold text-sm mb-1">How to Play</div>
              <div>1. <strong className="text-amber-300">Swap</strong> — Click a hand card to queue a leader swap</div>
              <div>2. <strong className="text-purple-300">Ability</strong> — Activate your leader's special power (costs Magick)</div>
              <div>3. <strong className="text-red-300">Fight!</strong> — Your leader attacks the enemy leader</div>
              <div className="pt-1 border-t border-amber-600/20">
                <Star className="w-3 h-3 inline mr-1 text-amber-400" />
                Excess damage after destroying a leader hits the player's HP!
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
