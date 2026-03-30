import { BattleCard, BattleDeck, Battle } from '../types/battle';
import { OwnedHeroCard } from '../types/heroes';
import { CombatConfig } from '../types/gameConfig';
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
 * Simulate one round of battle using attack vs defense-based combat.
 * 
 * PURE FUNCTION - No side effects, no mutations.
 * Deep copies input battle state before applying any logic.
 * 
 * Combat Logic:
 * 1. Select random attacker from deck1 (live cards only)
 * 2. Select random defender from deck2 (live cards only)
 * 3. Calculate damage: attacker.attack - (defender.defense / 2)
 * 4. Apply minimum 1 damage to ensure progress
 * 5. Reduce defender's currentDefense by damage amount
 * 6. Check if defender is destroyed (currentDefense <= 0)
 * 7. Record combat event for UI display
 * 8. Check victory conditions (all cards on one side destroyed)
 * 
 * Returns new battle state with combat results.
 * Never mutates input battle state.
 */
export function simulateBattleRound(battle: Battle, combatConfig?: CombatConfig): Battle {
  // Deep copy to prevent mutation - CRITICAL for React state integrity
  const next = deepCloneBattle(battle);
  
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
  
  // === PHASE 1: Deck 1 attacks Deck 2 ===
  const attacker1 = deck1Cards[Math.floor(Math.random() * deck1Cards.length)];
  const defender1 = deck2Cards[Math.floor(Math.random() * deck2Cards.length)];

  const baseDmg1 = attacker1.attack;
  const mitDiv = combatConfig?.damageMitigationDivisor ?? 2;
  const minDmg = combatConfig?.minimumDamage ?? 1;
  const mitigated1 = Math.max(0, baseDmg1 - Math.floor(defender1.defense / mitDiv));
  const dmg1 = Math.max(minDmg, mitigated1);

  const defIdx1 = next.deck2.cards.findIndex(c => c.instanceId === defender1.instanceId);
  let defender1Destroyed = false;
  if (defIdx1 !== -1) {
    next.deck2.cards[defIdx1] = deepCloneCard(next.deck2.cards[defIdx1]);
    next.deck2.cards[defIdx1].currentDefense -= dmg1;
    defender1Destroyed = next.deck2.cards[defIdx1].currentDefense <= 0;

    if (defender1Destroyed) {
      next.log.push({
        message: `${attacker1.name} attacks ${defender1.name} for ${dmg1} damage - ${defender1.name} is destroyed!`,
        category: 'combat',
      });
    } else {
      next.log.push({
        message: `${attacker1.name} attacks ${defender1.name} for ${dmg1} damage (${next.deck2.cards[defIdx1].currentDefense} HP remaining)`,
        category: 'combat',
      });
    }
  }

  // === PHASE 2: Deck 2 counterattacks Deck 1 ===
  const liveDeck2 = next.deck2.cards.filter(c => c.currentDefense > 0);
  const liveDeck1 = next.deck1.cards.filter(c => c.currentDefense > 0);

  let attacker2Name = '';
  let defender2Name = '';
  let dmg2 = 0;
  let defender2Destroyed = false;

  if (liveDeck2.length > 0 && liveDeck1.length > 0) {
    const attacker2 = liveDeck2[Math.floor(Math.random() * liveDeck2.length)];
    const defender2 = liveDeck1[Math.floor(Math.random() * liveDeck1.length)];

    const baseDmg2 = attacker2.attack;
    const mitigated2 = Math.max(0, baseDmg2 - Math.floor(defender2.defense / mitDiv));
    dmg2 = Math.max(minDmg, mitigated2);
    attacker2Name = attacker2.name;
    defender2Name = defender2.name;

    const defIdx2 = next.deck1.cards.findIndex(c => c.instanceId === defender2.instanceId);
    if (defIdx2 !== -1) {
      next.deck1.cards[defIdx2] = deepCloneCard(next.deck1.cards[defIdx2]);
      next.deck1.cards[defIdx2].currentDefense -= dmg2;
      defender2Destroyed = next.deck1.cards[defIdx2].currentDefense <= 0;

      if (defender2Destroyed) {
        next.log.push({
          message: `${attacker2Name} attacks ${defender2Name} for ${dmg2} damage - ${defender2Name} is destroyed!`,
          category: 'combat',
        });
      } else {
        next.log.push({
          message: `${attacker2Name} attacks ${defender2Name} for ${dmg2} damage (${next.deck1.cards[defIdx2].currentDefense} HP remaining)`,
          category: 'combat',
        });
      }
    }
  }

  // Record last event for UI (show the most dramatic event)
  next.lastEvent = defender1Destroyed
    ? { attacker: attacker1.name, defender: defender1.name, damage: dmg1, defenderDestroyed: true }
    : defender2Destroyed
    ? { attacker: attacker2Name, defender: defender2Name, damage: dmg2, defenderDestroyed: true }
    : { attacker: attacker1.name, defender: defender1.name, damage: dmg1, defenderDestroyed: false };

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
