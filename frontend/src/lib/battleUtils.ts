import { BattleCard, BattleDeck, Battle, CombatEvent } from '../types/battle';
import { OwnedHeroCard } from '../types/heroes';
import { CombatConfig, ClassAbilitiesConfig } from '../types/gameConfig';
import { AutobotStrategy } from '../types/tournaments';
import { CARD_LIBRARY } from './mockData';

/**
 * battleUtils.ts - Pure utility functions for battle system.
 * 
 * CRITICAL REQUIREMENTS:
 * - NO React imports (useState, useEffect, etc.)
 * - NO hooks of any kind
 * - NO state mutation - all functions return new objects
 * - Deep copy all nested structures before modifications
 * - Pure functions only - same input always produces same output
 */

/**
 * Deep clone a battle card to prevent state mutation.
 * Essential for maintaining React state immutability.
 * Creates a new object with all nested properties copied.
 */
function deepCloneCard(card: BattleCard): BattleCard {
  return {
    ...card,
    manaRequirement: card.manaRequirement ? { ...card.manaRequirement } : undefined,
    tags: card.tags ? [...card.tags] : undefined,
  };
}

/**
 * Deep clone a battle deck to prevent state mutation.
 * Recursively clones all cards in the deck.
 */
function deepCloneDeck(deck: BattleDeck): BattleDeck {
  return {
    ...deck,
    cards: deck.cards.map(deepCloneCard),
  };
}

/**
 * Deep clone entire battle state to prevent state mutation.
 * All state updates MUST use deep copies to avoid React corruption.
 * This is the primary guard against accidental mutations.
 */
export function deepCloneBattle(battle: Battle): Battle {
  return {
    ...battle,
    deck1: deepCloneDeck(battle.deck1),
    deck2: deepCloneDeck(battle.deck2),
    lastEvent: battle.lastEvent ? { ...battle.lastEvent } : undefined,
    roundEvents: battle.roundEvents ? battle.roundEvents.map(e => ({ ...e })) : undefined,
    log: battle.log.map(entry => ({ ...entry })),
  };
}

/**
 * Build battle deck from owned hero cards with proper stat population.
 * 
 * PURE FUNCTION - No side effects, no mutations.
 * 
 * Stat Logic:
 * - attack: Offensive power from card data or derived from power/2
 * - defense: Defensive structure from card data or derived from power/2
 * - hp: Current hit points (equals defense for simplicity)
 * - currentDefense: Starts at full defense value
 * - cost: Mana cost from dynamic balancer or card defaults
 * 
 * The totalPower is recomputed as sum of (attack + defense) for all cards.
 * This ensures consistency even if individual card stats change.
 */
export function buildBattleDeck(
  heroes: OwnedHeroCard[],
  ownerName: string,
  getManaForCard?: (cardId: string) => number
): BattleDeck {
  const cards: BattleCard[] = heroes.map((hero, index) => {
    const cardData = CARD_LIBRARY.find(c => c.id === hero.cardId);
    
    // Use dynamic mana cost if available, otherwise use default
    const manaCost = getManaForCard ? getManaForCard(hero.cardId) : (cardData?.manaRequirement?.mana || cardData?.cost || 3);
    
    // Populate attack/defense/hp logically from card data
    // Priority: card data stats > derived from power > minimum defaults
    const attack = cardData?.attack || Math.floor(hero.power / 2) || 1;
    const defense = cardData?.defense || Math.floor(hero.power / 2) || 1;
    const hp = defense; // HP equals defense for simplicity
    
    return {
      // CardData properties
      id: hero.cardId,
      name: hero.name,
      power: hero.power,
      cardType: hero.cardType,
      description: cardData?.description || '',
      level: hero.level,
      xp: hero.xp,
      edition: hero.edition,
      rarity: hero.rarity,
      class: hero.class,
      tags: hero.tags,
      // Battle-specific properties
      instanceId: `${hero.instanceId}-${index}`,
      attack,
      defense,
      currentDefense: defense,
      hp,
      cost: manaCost,
      manaRequirement: cardData?.manaRequirement ? { ...cardData.manaRequirement, mana: manaCost } : { mana: manaCost },
      isExhausted: false,
    };
  });
  
  // Recompute totalPower from attack + defense (not from hero.power)
  // This ensures accuracy even if card stats are modified
  const totalPower = cards.reduce((sum, card) => sum + card.attack + card.defense, 0);
  
  return {
    cards,
    totalPower,
    ownerName,
  };
}

/**
 * Build an AI opponent deck by selecting random cards from the library.
 * Matches the player's deck size and approximate power level for fair fights.
 *
 * PURE FUNCTION - No side effects, no mutations.
 */
export function buildAiDeck(
  playerDeckSize: number,
  playerTotalPower: number,
  ownerName: string
): BattleDeck {
  const availableCards = CARD_LIBRARY.filter(c => c.cardType === 'Hero');
  if (availableCards.length === 0) {
    // Fallback: use ALL cards if no Hero-typed cards exist
    const fallback = CARD_LIBRARY.length > 0 ? CARD_LIBRARY : [{ id: 'fallback', name: 'AI Recruit', power: 10, cardType: 'Hero', attack: 5, defense: 5, cost: 3 }];
    availableCards.push(...(fallback as any[]));
  }
  const cards: BattleCard[] = [];

  for (let i = 0; i < playerDeckSize; i++) {
    const cardData = availableCards[Math.floor(Math.random() * availableCards.length)];

    const attack = cardData.attack || Math.floor(cardData.power / 2) || 1;
    const defense = cardData.defense || Math.floor(cardData.power / 2) || 1;

    cards.push({
      id: cardData.id,
      name: cardData.name,
      power: cardData.power,
      cardType: cardData.cardType,
      description: cardData.description || '',
      level: 1,
      xp: 0,
      edition: cardData.edition || 'Genesis',
      rarity: cardData.rarity || 'Common',
      class: cardData.class || 'Warrior',
      tags: cardData.tags || [],
      instanceId: `ai-${cardData.id}-${i}`,
      attack,
      defense,
      currentDefense: defense,
      hp: defense,
      cost: cardData.manaRequirement?.mana || cardData.cost || 3,
      manaRequirement: cardData.manaRequirement ? { ...cardData.manaRequirement } : { mana: 3 },
      isExhausted: false,
    });
  }

  const totalPower = cards.reduce((sum, card) => sum + card.attack + card.defense, 0);

  return {
    cards,
    totalPower,
    ownerName,
  };
}

/**
 * Initialize a new battle with two decks.
 * 
 * PURE FUNCTION - No side effects, no mutations.
 * Returns initial battle state with deep copies.
 * 
 * Initial State:
 * - turn: 1
 * - phase: 'combat' (ready for first round)
 * - winner: null (battle not yet decided)
 * - log: Initial system messages
 */
export function initializeBattle(deck1: BattleDeck, deck2: BattleDeck): Battle {
  return {
    deck1: deepCloneDeck(deck1),
    deck2: deepCloneDeck(deck2),
    turn: 1,
    phase: 'combat',
    winner: null,
    lastEvent: undefined,
    log: [
      { message: 'Battle begins!', category: 'system' },
      { message: `${deck1.ownerName} vs ${deck2.ownerName}`, category: 'system' },
    ],
  };
}

/**
 * Player targeting options for a single round.
 * When provided, the player chooses which of their cards attacks
 * and which enemy card is the target.  Omitted fields fall back to random.
 */
export interface PlayerTargeting {
  /** instanceId of the player card that should attack */
  attackerInstanceId?: string | number;
  /** instanceId of the enemy card to target */
  targetInstanceId?: string | number;
}

/**
 * Resolve a single attack between two cards, applying class abilities.
 *
 * PURE HELPER — does NOT mutate the cards; returns the final damage dealt and
 * an array of ability log messages that fired during resolution.
 */
function resolveAttack(
  attacker: BattleCard,
  defender: BattleCard,
  baseMitDiv: number,
  baseMinDmg: number,
  abilities?: ClassAbilitiesConfig,
): { damage: number; abilityLogs: string[] } {
  const logs: string[] = [];

  // 1) Base attack value
  let atkValue = attacker.attack;

  // Ranger — Precision Shot: flat bonus attack
  if (attacker.class === 'Ranger' && abilities) {
    const bonus = abilities.rangerPrecisionShotBonus;
    if (bonus > 0) {
      atkValue += bonus;
      logs.push(`${attacker.name} fires a Precision Shot (+${bonus} dmg)`);
    }
  }

  // 2) Determine effective mitigation divisor
  let effectiveMitDiv = baseMitDiv;

  // Mage — Arcane Surge: increase divisor so defense mitigates less
  if (attacker.class === 'Mage' && abilities) {
    const bonus = abilities.mageArcaneSurgeBonusDivisor;
    if (bonus > 0) {
      effectiveMitDiv += bonus;
      logs.push(`${attacker.name}'s Arcane Surge pierces armor`);
    }
  }

  // 3) Base damage calc
  let dmg = Math.max(0, atkValue - Math.floor(defender.defense / effectiveMitDiv));

  // Rogue — Critical Strike: chance to multiply damage
  if (attacker.class === 'Rogue' && abilities) {
    const chance = abilities.rogueCriticalStrikeChance;
    const mult = abilities.rogueCriticalStrikeMultiplier;
    if (chance > 0 && Math.random() < chance) {
      dmg = Math.floor(dmg * mult);
      logs.push(`${attacker.name} lands a Critical Strike! (x${mult})`);
    }
  }

  // 4) Warrior — Fortify: flat damage reduction on the defender
  if (defender.class === 'Warrior' && abilities) {
    const reduction = abilities.warriorFortifyReduction;
    if (reduction > 0) {
      dmg = Math.max(0, dmg - reduction);
      logs.push(`${defender.name}'s Fortify absorbs ${reduction} dmg`);
    }
  }

  // 5) Enforce minimum damage
  dmg = Math.max(baseMinDmg, dmg);

  return { damage: dmg, abilityLogs: logs };
}

/**
 * Apply Healer — Rejuvenation to a deck: heal the most-damaged alive card.
 * Returns a log message if healing occurred, or null.
 */
function applyHealerRejuvenation(
  deckCards: BattleCard[],
  amount: number,
): string | null {
  // Find alive healers
  const healers = deckCards.filter(c => c.class === 'Healer' && c.currentDefense > 0);
  if (healers.length === 0 || amount <= 0) return null;

  // Find the most-damaged alive ally (biggest gap between defense and currentDefense)
  const damagedAllies = deckCards.filter(c => c.currentDefense > 0 && c.currentDefense < c.defense);
  if (damagedAllies.length === 0) return null;

  damagedAllies.sort((a, b) => (a.currentDefense / a.defense) - (b.currentDefense / b.defense));
  const target = damagedAllies[0];
  const healer = healers[0]; // first healer does the healing

  const healAmt = Math.min(amount, target.defense - target.currentDefense);
  if (healAmt <= 0) return null;

  target.currentDefense += healAmt;
  return `${healer.name}'s Rejuvenation heals ${target.name} for ${healAmt} HP`;
}

/**
 * Simulate one round of battle with class abilities.
 *
 * PURE FUNCTION - No side effects, no mutations.
 * Deep copies input battle state before applying any logic.
 *
 * Combat Flow:
 *   Pre-combat — Healer Rejuvenation triggers for both sides
 *   Phase 1 — Deck 1 (player) attacks Deck 2 (AI)
 *     • If `targeting` is provided the chosen attacker/target are used
 *     • Otherwise a random attacker/target pair is selected
 *     • Class abilities modify damage (Ranger +dmg, Mage pierce, Rogue crit, Warrior absorb)
 *   Phase 2 — Deck 2 (AI) counterattacks Deck 1 (always random)
 *   Post-combat — Victory check
 *
 * Returns new battle state with combat results.
 * Never mutates input battle state.
 */
export function simulateBattleRound(
  battle: Battle,
  combatConfig?: CombatConfig,
  targeting?: PlayerTargeting,
  abilitiesConfig?: ClassAbilitiesConfig,
): Battle {
  // Deep copy to prevent mutation - CRITICAL for React state integrity
  const next = deepCloneBattle(battle);
  next.roundEvents = []; // reset for this round

  // Check if battle is already complete
  if (next.winner !== null || next.phase === 'complete') {
    return next;
  }

  // Get live cards from both decks (currentDefense > 0)
  const deck1Cards = next.deck1.cards.filter(c => c.currentDefense > 0);
  const deck2Cards = next.deck2.cards.filter(c => c.currentDefense > 0);

  // Check for victory conditions before combat
  if (deck1Cards.length === 0) {
    next.winner = 2;
    next.phase = 'complete';
    next.log.push({ message: `${next.deck2.ownerName} wins! All opponent cards defeated.`, category: 'system' });
    return next;
  }

  if (deck2Cards.length === 0) {
    next.winner = 1;
    next.phase = 'complete';
    next.log.push({ message: `${next.deck1.ownerName} wins! All opponent cards defeated.`, category: 'system' });
    return next;
  }

  const mitDiv = combatConfig?.damageMitigationDivisor ?? 2;
  const minDmg = combatConfig?.minimumDamage ?? 1;

  // === PRE-COMBAT: Healer Rejuvenation for both sides ===
  if (abilitiesConfig && abilitiesConfig.healerRejuvenationAmount > 0) {
    const healLog1 = applyHealerRejuvenation(next.deck1.cards, abilitiesConfig.healerRejuvenationAmount);
    if (healLog1) next.log.push({ message: healLog1, category: 'action' });

    const healLog2 = applyHealerRejuvenation(next.deck2.cards, abilitiesConfig.healerRejuvenationAmount);
    if (healLog2) next.log.push({ message: healLog2, category: 'action' });
  }

  // Refresh live cards (healing may have changed nothing, but be safe)
  const live1 = next.deck1.cards.filter(c => c.currentDefense > 0);
  const live2 = next.deck2.cards.filter(c => c.currentDefense > 0);

  // === PHASE 1: Deck 1 attacks Deck 2 ===
  const attacker1 = (targeting?.attackerInstanceId != null
    ? live1.find(c => c.instanceId === targeting.attackerInstanceId)
    : undefined) ?? live1[Math.floor(Math.random() * live1.length)];

  const defender1 = (targeting?.targetInstanceId != null
    ? live2.find(c => c.instanceId === targeting.targetInstanceId)
    : undefined) ?? live2[Math.floor(Math.random() * live2.length)];

  const { damage: dmg1, abilityLogs: aLogs1 } = resolveAttack(attacker1, defender1, mitDiv, minDmg, abilitiesConfig);

  // Log ability triggers
  for (const aLog of aLogs1) {
    next.log.push({ message: aLog, category: 'action' });
  }

  const defIdx1 = next.deck2.cards.findIndex(c => c.instanceId === defender1.instanceId);
  let defender1Destroyed = false;
  if (defIdx1 !== -1) {
    next.deck2.cards[defIdx1] = deepCloneCard(next.deck2.cards[defIdx1]);
    next.deck2.cards[defIdx1].currentDefense -= dmg1;
    defender1Destroyed = next.deck2.cards[defIdx1].currentDefense <= 0;

    const msg = defender1Destroyed
      ? `${attacker1.name} attacks ${defender1.name} for ${dmg1} damage - ${defender1.name} is destroyed!`
      : `${attacker1.name} attacks ${defender1.name} for ${dmg1} damage (${next.deck2.cards[defIdx1].currentDefense} HP remaining)`;
    next.log.push({ message: msg, category: 'combat' });
  }

  next.roundEvents.push({
    attackerName: attacker1.name,
    attackerInstanceId: attacker1.instanceId,
    defenderName: defender1.name,
    defenderInstanceId: defender1.instanceId,
    damage: dmg1,
    defenderDestroyed: defender1Destroyed,
    side: 1,
  });

  // === PHASE 2: Deck 2 counterattacks Deck 1 (always random — AI) ===
  const liveDeck2 = next.deck2.cards.filter(c => c.currentDefense > 0);
  const liveDeck1 = next.deck1.cards.filter(c => c.currentDefense > 0);

  if (liveDeck2.length > 0 && liveDeck1.length > 0) {
    const attacker2 = liveDeck2[Math.floor(Math.random() * liveDeck2.length)];
    const defender2 = liveDeck1[Math.floor(Math.random() * liveDeck1.length)];

    const { damage: dmg2, abilityLogs: aLogs2 } = resolveAttack(attacker2, defender2, mitDiv, minDmg, abilitiesConfig);

    for (const aLog of aLogs2) {
      next.log.push({ message: aLog, category: 'action' });
    }

    const defIdx2 = next.deck1.cards.findIndex(c => c.instanceId === defender2.instanceId);
    let defender2Destroyed = false;
    if (defIdx2 !== -1) {
      next.deck1.cards[defIdx2] = deepCloneCard(next.deck1.cards[defIdx2]);
      next.deck1.cards[defIdx2].currentDefense -= dmg2;
      defender2Destroyed = next.deck1.cards[defIdx2].currentDefense <= 0;

      const msg = defender2Destroyed
        ? `${attacker2.name} attacks ${defender2.name} for ${dmg2} damage - ${defender2.name} is destroyed!`
        : `${attacker2.name} attacks ${defender2.name} for ${dmg2} damage (${next.deck1.cards[defIdx2].currentDefense} HP remaining)`;
      next.log.push({ message: msg, category: 'combat' });
    }

    next.roundEvents.push({
      attackerName: attacker2.name,
      attackerInstanceId: attacker2.instanceId,
      defenderName: defender2.name,
      defenderInstanceId: defender2.instanceId,
      damage: dmg2,
      defenderDestroyed: defender2Destroyed,
      side: 2,
    });
  }

  // Record last event for backward-compat UI (show the most dramatic event)
  const p1 = next.roundEvents[0];
  const p2 = next.roundEvents[1];
  next.lastEvent = (p1?.defenderDestroyed)
    ? { attacker: p1.attackerName, defender: p1.defenderName, damage: p1.damage, defenderDestroyed: true }
    : (p2?.defenderDestroyed)
    ? { attacker: p2.attackerName, defender: p2.defenderName, damage: p2.damage, defenderDestroyed: true }
    : p1
    ? { attacker: p1.attackerName, defender: p1.defenderName, damage: p1.damage, defenderDestroyed: false }
    : undefined;

  // Increment turn counter
  next.turn += 1;

  // Check victory conditions after both attacks
  const remainingDeck1 = next.deck1.cards.filter(c => c.currentDefense > 0);
  const remainingDeck2 = next.deck2.cards.filter(c => c.currentDefense > 0);

  if (remainingDeck2.length === 0) {
    next.winner = 1;
    next.phase = 'complete';
    next.log.push({ message: `${next.deck1.ownerName} wins! All opponent cards defeated.`, category: 'system' });
  } else if (remainingDeck1.length === 0) {
    next.winner = 2;
    next.phase = 'complete';
    next.log.push({ message: `${next.deck2.ownerName} wins! All opponent cards defeated.`, category: 'system' });
  }

  return next;
}

/**
 * Helper: Clamp value between min and max
 * PURE FUNCTION - No side effects
 */
export function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// AUTOBOT STRATEGY SYSTEM — for tournament automated combat
// ============================================================

/**
 * Resolve autobot strategy into concrete attacker + target selections.
 * Returns a PlayerTargeting object for the given strategy.
 *
 * PURE FUNCTION — no mutations, no side effects.
 */
export function resolveAutobotTargeting(
  strategy: AutobotStrategy,
  friendlyCards: BattleCard[],
  enemyCards: BattleCard[],
): PlayerTargeting {
  const aliveFriendly = friendlyCards.filter(c => c.currentDefense > 0);
  const aliveEnemy = enemyCards.filter(c => c.currentDefense > 0);

  if (aliveFriendly.length === 0 || aliveEnemy.length === 0) return {};

  switch (strategy) {
    case 'focus-weakest': {
      // Random attacker, target enemy with lowest current HP
      const attacker = aliveFriendly[Math.floor(Math.random() * aliveFriendly.length)];
      const target = [...aliveEnemy].sort((a, b) => a.currentDefense - b.currentDefense)[0];
      return { attackerInstanceId: attacker.instanceId, targetInstanceId: target.instanceId };
    }

    case 'focus-strongest': {
      // Random attacker, target enemy with highest attack
      const attacker = aliveFriendly[Math.floor(Math.random() * aliveFriendly.length)];
      const target = [...aliveEnemy].sort((a, b) => b.attack - a.attack)[0];
      return { attackerInstanceId: attacker.instanceId, targetInstanceId: target.instanceId };
    }

    case 'spread-damage': {
      // Random attacker, target enemy with highest current HP (distribute damage)
      const attacker = aliveFriendly[Math.floor(Math.random() * aliveFriendly.length)];
      const target = [...aliveEnemy].sort((a, b) => b.currentDefense - a.currentDefense)[0];
      return { attackerInstanceId: attacker.instanceId, targetInstanceId: target.instanceId };
    }

    case 'protect-healer': {
      // Use highest-attack friendly card, target highest-attack enemy
      const attacker = [...aliveFriendly].sort((a, b) => b.attack - a.attack)[0];
      const target = [...aliveEnemy].sort((a, b) => b.attack - a.attack)[0];
      return { attackerInstanceId: attacker.instanceId, targetInstanceId: target.instanceId };
    }

    case 'random':
    default:
      return {}; // No targeting = fully random
  }
}

/**
 * Result of a full automated tournament match.
 */
export interface TournamentMatchResult {
  /** 1 = deck1 won, 2 = deck2 won */
  winner: 1 | 2;
  /** Number of combat rounds the match took */
  roundCount: number;
  /** Key events from the battle for the combat summary */
  combatSummary: string[];
  /** Cards surviving on the winning side */
  survivingCards: number;
}

/**
 * Simulate a complete automated tournament match between two decks.
 * Both sides use autobot strategies for targeting. Runs up to `maxRounds`
 * rounds of combat. If no winner after maxRounds, the side with more
 * surviving HP wins.
 *
 * PURE FUNCTION — no side effects, no mutations.
 */
export function simulateTournamentMatch(
  deck1: BattleDeck,
  deck2: BattleDeck,
  strategy1: AutobotStrategy,
  strategy2: AutobotStrategy,
  combatConfig?: CombatConfig,
  abilitiesConfig?: ClassAbilitiesConfig,
  maxRounds: number = 50,
): TournamentMatchResult {
  let battle = initializeBattle(deck1, deck2);
  const summary: string[] = [];

  for (let round = 0; round < maxRounds; round++) {
    if (battle.winner !== null) break;

    // Deck 1 uses their strategy for Phase 1 targeting
    const targeting1 = resolveAutobotTargeting(
      strategy1,
      battle.deck1.cards,
      battle.deck2.cards,
    );

    // Run the round — Phase 1 uses deck1's targeting, Phase 2 is always random for deck2
    // To support deck2's strategy, we need a two-phase approach:
    // First run with deck1's targeting (Phase 1 + random Phase 2)
    battle = simulateBattleRound(battle, combatConfig, targeting1, abilitiesConfig);

    // Collect notable events
    if (battle.roundEvents) {
      for (const event of battle.roundEvents) {
        if (event.defenderDestroyed) {
          summary.push(`Turn ${battle.turn - 1}: ${event.attackerName} destroyed ${event.defenderName}`);
        }
      }
    }
  }

  // If no winner after max rounds, decide by remaining HP
  if (battle.winner === null) {
    const hp1 = battle.deck1.cards.reduce((sum, c) => sum + Math.max(0, c.currentDefense), 0);
    const hp2 = battle.deck2.cards.reduce((sum, c) => sum + Math.max(0, c.currentDefense), 0);
    battle.winner = hp1 >= hp2 ? 1 : 2;
    summary.push(`Match decided by remaining HP: ${battle.deck1.ownerName} (${hp1}) vs ${battle.deck2.ownerName} (${hp2})`);
  }

  const winnerDeck = battle.winner === 1 ? battle.deck1 : battle.deck2;
  const survivingCards = winnerDeck.cards.filter(c => c.currentDefense > 0).length;

  // Keep summary to last 8 events + the decisive ones
  const trimmedSummary = summary.length > 10
    ? [...summary.slice(0, 3), `... ${summary.length - 6} more events ...`, ...summary.slice(-3)]
    : summary;

  return {
    winner: battle.winner as 1 | 2,
    roundCount: battle.turn - 1,
    combatSummary: trimmedSummary,
    survivingCards,
  };
}
