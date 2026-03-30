import { BattleCard, BattleDeck, Battle, CombatEvent, MagickPool } from '../types/battle';
import { OwnedHeroCard } from '../types/heroes';
import { CombatConfig, ClassAbilitiesConfig, MagickConfig } from '../types/gameConfig';
import { AutobotStrategy } from '../types/tournaments';
import { CARD_LIBRARY } from './mockData';
import { MagickCost, CardAbility } from '../types/game';

/**
 * battleUtils.ts - Pure utility functions for Original Mythereum battle system.
 *
 * LEADER COMBAT MODEL:
 * - Each player has 1 Leader on the field, rest in hand (4 cards)
 * - Leaders attack each other simultaneously each turn
 * - When a leader dies, excess damage hits player HP
 * - Player picks a new leader from hand (or auto-selects)
 * - Player HP reaching 0 = defeat
 * - Magick accumulates from all cards (leader + hand), abilities cost Magick
 *
 * CRITICAL REQUIREMENTS:
 * - NO React imports
 * - NO hooks
 * - NO state mutation - all functions return new objects
 * - Deep copy all nested structures before modifications
 * - Pure functions only
 */

// ============================================================
// DEEP CLONE HELPERS
// ============================================================

function deepCloneCard(card: BattleCard): BattleCard {
  return {
    ...card,
    manaRequirement: card.manaRequirement ? { ...card.manaRequirement } : undefined,
    magickGeneration: card.magickGeneration ? { ...card.magickGeneration } : undefined,
    ability: card.ability ? {
      ...card.ability,
      cost: { ...card.ability.cost },
      effect: { ...card.ability.effect } as any,
    } : undefined,
    tags: card.tags ? [...card.tags] : undefined,
  };
}

function deepCloneMagick(pool: MagickPool): MagickPool {
  return { ...pool };
}

function deepCloneDeck(deck: BattleDeck): BattleDeck {
  return {
    ...deck,
    cards: deck.cards.map(deepCloneCard),
    leader: deck.leader ? deepCloneCard(deck.leader) : null,
    hand: deck.hand.map(deepCloneCard),
    graveyard: deck.graveyard.map(deepCloneCard),
    magick: deepCloneMagick(deck.magick),
  };
}

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

// ============================================================
// MAGICK HELPERS
// ============================================================

function createMagickPool(startWhite = 0, startBlack = 0, startGrey = 0): MagickPool {
  return {
    white: startWhite,
    black: startBlack,
    grey: startGrey,
    whiteAccum: 0,
    blackAccum: 0,
    greyAccum: 0,
  };
}

/**
 * Generate magick for a deck based on all cards' magickGeneration rates.
 * Each card's % is accumulated; when accumulator reaches 100, +1 magick point.
 */
function generateMagick(
  deck: BattleDeck,
  magickConfig?: MagickConfig,
): string[] {
  const logs: string[] = [];
  const mult = magickConfig?.generationMultiplier ?? 1.0;
  const handGenerates = magickConfig?.handCardsGenerateMagick ?? true;

  // Collect all cards that generate magick
  const generators: BattleCard[] = [];
  if (deck.leader) generators.push(deck.leader);
  if (handGenerates) generators.push(...deck.hand);

  let totalWhite = 0, totalBlack = 0, totalGrey = 0;

  for (const card of generators) {
    if (!card.magickGeneration) continue;
    totalWhite += Math.floor(card.magickGeneration.white * mult);
    totalBlack += Math.floor(card.magickGeneration.black * mult);
    totalGrey += Math.floor(card.magickGeneration.grey * mult);
  }

  // Accumulate and convert
  deck.magick.whiteAccum += totalWhite;
  deck.magick.blackAccum += totalBlack;
  deck.magick.greyAccum += totalGrey;

  const whiteGained = Math.floor(deck.magick.whiteAccum / 100);
  const blackGained = Math.floor(deck.magick.blackAccum / 100);
  const greyGained = Math.floor(deck.magick.greyAccum / 100);

  deck.magick.whiteAccum %= 100;
  deck.magick.blackAccum %= 100;
  deck.magick.greyAccum %= 100;

  deck.magick.white += whiteGained;
  deck.magick.black += blackGained;
  deck.magick.grey += greyGained;

  const gained: string[] = [];
  if (whiteGained > 0) gained.push(`+${whiteGained} White`);
  if (blackGained > 0) gained.push(`+${blackGained} Black`);
  if (greyGained > 0) gained.push(`+${greyGained} Grey`);

  if (gained.length > 0) {
    logs.push(`${deck.ownerName} generates ${gained.join(', ')} Magick`);
  }

  return logs;
}

/**
 * Check if a player can afford an ability's magick cost.
 */
export function canAffordAbility(pool: MagickPool, cost: MagickCost): boolean {
  if ((cost.white || 0) > pool.white) return false;
  if ((cost.black || 0) > pool.black) return false;
  if ((cost.grey || 0) > pool.grey) return false;
  return true;
}

/**
 * Spend magick from pool. Returns true if successful.
 */
function spendMagick(pool: MagickPool, cost: MagickCost): boolean {
  if (!canAffordAbility(pool, cost)) return false;
  pool.white -= (cost.white || 0);
  pool.black -= (cost.black || 0);
  pool.grey -= (cost.grey || 0);
  return true;
}

/** Total magick cost for display */
export function totalMagickCost(cost: MagickCost): number {
  return (cost.white || 0) + (cost.black || 0) + (cost.grey || 0);
}

// ============================================================
// DECK BUILDING
// ============================================================

/**
 * Calculate player HP from deck cards.
 * Higher total power = lower player HP (risk/reward trade-off from original game).
 */
function calculatePlayerHp(
  cards: BattleCard[],
  combatConfig?: CombatConfig,
): { hp: number; maxHp: number } {
  const baseHp = combatConfig?.basePlayerHp ?? 100;
  const divisor = combatConfig?.deckPowerHpDivisor ?? 0.5;
  const minHp = combatConfig?.minimumPlayerHp ?? 20;

  // Sum HP modifiers from cards
  const hpMod = cards.reduce((sum, c) => sum + (c.hpModifier || 0), 0);

  // Total deck power penalty
  const totalPower = cards.reduce((sum, c) => sum + c.attack + c.defense, 0);
  const powerPenalty = Math.floor(totalPower * divisor);

  const finalHp = Math.max(minHp, baseHp + hpMod - powerPenalty);
  return { hp: finalHp, maxHp: finalHp };
}

/**
 * Build a battle deck from owned hero cards — Original Mythereum style.
 * First card becomes the leader, rest go to hand.
 */
export function buildBattleDeck(
  heroes: OwnedHeroCard[],
  ownerName: string,
  combatConfig?: CombatConfig,
  magickConfig?: MagickConfig,
): BattleDeck {
  const cards: BattleCard[] = heroes.map((hero, index) => {
    const cardData = CARD_LIBRARY.find(c => c.id === hero.cardId);

    const attack = cardData?.attack || Math.floor(hero.power / 2) || 15;
    const defense = cardData?.defense || Math.floor(hero.power / 2) || 15;

    return {
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
      instanceId: `${hero.instanceId}-${index}`,
      attack,
      defense,
      currentDefense: defense,
      hp: defense,
      cost: cardData?.cost || 3,
      manaRequirement: cardData?.manaRequirement ? { ...cardData.manaRequirement } : undefined,
      magickGeneration: cardData?.magickGeneration ? { ...cardData.magickGeneration } : undefined,
      ability: cardData?.ability ? {
        ...cardData.ability,
        cost: { ...cardData.ability.cost },
        effect: { ...cardData.ability.effect } as any,
      } : undefined,
      hpModifier: cardData?.hpModifier || 0,
      isExhausted: false,
    };
  });

  const totalPower = cards.reduce((sum, card) => sum + card.attack + card.defense, 0);
  const { hp, maxHp } = calculatePlayerHp(cards, combatConfig);

  // First card = leader, rest = hand
  const leader = cards.length > 0 ? deepCloneCard(cards[0]) : null;
  const hand = cards.slice(1).map(deepCloneCard);

  return {
    cards,
    totalPower,
    ownerName,
    leader,
    hand,
    graveyard: [],
    playerHp: hp,
    maxPlayerHp: maxHp,
    magick: createMagickPool(
      magickConfig?.startingWhite ?? 0,
      magickConfig?.startingBlack ?? 0,
      magickConfig?.startingGrey ?? 0,
    ),
  };
}

/**
 * Build an AI opponent deck from the card library.
 */
export function buildAiDeck(
  playerDeckSize: number,
  playerTotalPower: number,
  ownerName: string,
  combatConfig?: CombatConfig,
  magickConfig?: MagickConfig,
): BattleDeck {
  const availableCards = CARD_LIBRARY.filter(c => c.cardType === 'Hero');
  const cards: BattleCard[] = [];

  for (let i = 0; i < playerDeckSize; i++) {
    const cardData = availableCards[Math.floor(Math.random() * availableCards.length)];

    const attack = cardData.attack || Math.floor(cardData.power / 2) || 15;
    const defense = cardData.defense || Math.floor(cardData.power / 2) || 15;

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
      cost: cardData.cost || 3,
      manaRequirement: cardData.manaRequirement ? { ...cardData.manaRequirement } : undefined,
      magickGeneration: cardData.magickGeneration ? { ...cardData.magickGeneration } : undefined,
      ability: cardData.ability ? {
        ...cardData.ability,
        cost: { ...cardData.ability.cost },
        effect: { ...cardData.ability.effect } as any,
      } : undefined,
      hpModifier: cardData.hpModifier || 0,
      isExhausted: false,
    });
  }

  const totalPower = cards.reduce((sum, card) => sum + card.attack + card.defense, 0);
  const { hp, maxHp } = calculatePlayerHp(cards, combatConfig);

  const leader = cards.length > 0 ? deepCloneCard(cards[0]) : null;
  const hand = cards.slice(1).map(deepCloneCard);

  return {
    cards,
    totalPower,
    ownerName,
    leader,
    hand,
    graveyard: [],
    playerHp: hp,
    maxPlayerHp: maxHp,
    magick: createMagickPool(
      magickConfig?.startingWhite ?? 0,
      magickConfig?.startingBlack ?? 0,
      magickConfig?.startingGrey ?? 0,
    ),
  };
}

// ============================================================
// BATTLE INITIALIZATION
// ============================================================

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
      { message: `${deck1.ownerName} (${deck1.playerHp} HP) vs ${deck2.ownerName} (${deck2.playerHp} HP)`, category: 'system' },
      { message: `${deck1.ownerName}'s leader: ${deck1.leader?.name || 'None'}`, category: 'system' },
      { message: `${deck2.ownerName}'s leader: ${deck2.leader?.name || 'None'}`, category: 'system' },
    ],
  };
}

// ============================================================
// PLAYER ACTIONS
// ============================================================

/**
 * Player targeting / actions for a turn.
 */
export interface PlayerTargeting {
  /** Swap leader with a hand card (instanceId of hand card to swap in) */
  swapLeaderInstanceId?: string | number;
  /** Activate leader's ability this turn */
  activateAbility?: boolean;
  /** instanceId of the player card that should attack (legacy compat) */
  attackerInstanceId?: string | number;
  /** instanceId of the enemy card to target (legacy compat) */
  targetInstanceId?: string | number;
}

/**
 * Swap leader with a hand card. Returns new deck state.
 */
function swapLeader(deck: BattleDeck, handCardInstanceId: string | number): string | null {
  const handIdx = deck.hand.findIndex(c => c.instanceId === handCardInstanceId);
  if (handIdx === -1) return null;

  const oldLeader = deck.leader;
  const newLeader = deck.hand[handIdx];

  // Reset temporary boosts on old leader
  if (oldLeader) {
    oldLeader.tempAttackBoost = 0;
    oldLeader.tempDefenseBoost = 0;
    oldLeader.isHidden = false;
    oldLeader.hasAnnihilate = false;
    oldLeader.isStunned = false;
    deck.hand.splice(handIdx, 1);
    deck.hand.push(oldLeader);
  } else {
    deck.hand.splice(handIdx, 1);
  }

  deck.leader = newLeader;
  // Reset temp boosts on new leader
  newLeader.tempAttackBoost = 0;
  newLeader.tempDefenseBoost = 0;
  newLeader.isHidden = false;
  newLeader.hasAnnihilate = false;
  newLeader.isStunned = false;

  return `${deck.ownerName} swaps leader to ${newLeader.name}`;
}

/**
 * Apply an activated ability to the battle state.
 * Returns log messages.
 */
function activateAbility(
  deck: BattleDeck,
  enemyDeck: BattleDeck,
  ability: CardAbility,
): string[] {
  const logs: string[] = [];
  const leader = deck.leader;
  if (!leader) return logs;

  if (!spendMagick(deck.magick, ability.cost)) {
    logs.push(`${deck.ownerName} cannot afford ${ability.name}!`);
    return logs;
  }

  logs.push(`${leader.name} activates ${ability.name}!`);

  const effect = ability.effect;
  switch (effect.type) {
    case 'attack_boost':
      leader.tempAttackBoost = (leader.tempAttackBoost || 0) + effect.amount;
      logs.push(`${leader.name} gains +${effect.amount} ATK this turn`);
      break;

    case 'defense_boost':
      leader.tempDefenseBoost = (leader.tempDefenseBoost || 0) + effect.amount;
      logs.push(`${leader.name} gains +${effect.amount} DEF this turn`);
      break;

    case 'hp_boost':
      leader.currentDefense = Math.min(leader.defense + 50, leader.currentDefense + effect.amount);
      logs.push(`${leader.name} heals ${effect.amount} HP`);
      break;

    case 'hide':
      leader.isHidden = true;
      logs.push(`${leader.name} hides — infinite defense this turn!`);
      break;

    case 'annihilate':
      leader.hasAnnihilate = true;
      logs.push(`${leader.name} charges ANNIHILATE — infinite attack this turn!`);
      break;

    case 'drain': {
      const dmg = effect.amount;
      enemyDeck.playerHp -= dmg;
      logs.push(`${leader.name} drains ${dmg} HP from ${enemyDeck.ownerName}!`);
      break;
    }

    case 'stun':
      if (enemyDeck.leader) {
        enemyDeck.leader.isStunned = true;
        logs.push(`${enemyDeck.leader.name} is STUNNED — cannot attack next turn!`);
      }
      break;

    case 'superior_wit':
      leader.tempAttackBoost = (leader.tempAttackBoost || 0) + effect.attack;
      leader.currentDefense = Math.min(leader.defense + 50, leader.currentDefense + effect.hp);
      logs.push(`${leader.name} gains +${effect.attack} ATK and heals ${effect.hp} HP`);
      break;

    case 'shield':
      leader.tempDefenseBoost = (leader.tempDefenseBoost || 0) + effect.amount;
      logs.push(`${leader.name} shields for ${effect.amount} damage`);
      break;

    case 'piercing':
      // Store as negative defense boost on enemy
      if (enemyDeck.leader) {
        enemyDeck.leader.tempDefenseBoost = (enemyDeck.leader.tempDefenseBoost || 0) - effect.amount;
        logs.push(`${leader.name} pierces ${effect.amount} of ${enemyDeck.leader.name}'s defense!`);
      }
      break;

    case 'rally':
      for (const handCard of deck.hand) {
        handCard.attack += effect.amount;
      }
      logs.push(`All hand cards gain +${effect.amount} ATK permanently!`);
      break;

    case 'lifesteal':
      // Applied during combat resolution
      leader.tempAttackBoost = (leader.tempAttackBoost || 0); // mark for lifesteal
      logs.push(`${leader.name} will lifesteal ${effect.percent}% of damage dealt`);
      break;

    case 'magick_drain': {
      const stolen = Math.min(effect.amount, (enemyDeck.magick as any)[effect.color] || 0);
      (enemyDeck.magick as any)[effect.color] -= stolen;
      (deck.magick as any)[effect.color] += stolen;
      logs.push(`Stole ${stolen} ${effect.color} Magick from ${enemyDeck.ownerName}!`);
      break;
    }
  }

  return logs;
}

// ============================================================
// COMBAT RESOLUTION
// ============================================================

/**
 * Simulate one round of Original Mythereum battle.
 *
 * Turn flow:
 * 1. Reset temporary boosts from last turn
 * 2. Magick generation for both sides
 * 3. Player swap phase (optional leader swap)
 * 4. Ability activation phase (optional)
 * 5. Combat — leaders attack each other simultaneously
 * 6. Excess damage hits player HP
 * 7. Dead leader replaced from hand (auto-pick)
 * 8. Victory check
 */
export function simulateBattleRound(
  battle: Battle,
  combatConfig?: CombatConfig,
  targeting?: PlayerTargeting,
  abilitiesConfig?: ClassAbilitiesConfig,
  magickConfig?: MagickConfig,
): Battle {
  const next = deepCloneBattle(battle);
  next.roundEvents = [];

  if (next.winner !== null || next.phase === 'complete') return next;

  // Check both sides have leaders or can field one
  if (!next.deck1.leader && next.deck1.hand.length === 0) {
    next.winner = 2;
    next.phase = 'complete';
    next.log.push({ message: `${next.deck2.ownerName} wins! ${next.deck1.ownerName} has no cards left!`, category: 'system' });
    return next;
  }
  if (!next.deck2.leader && next.deck2.hand.length === 0) {
    next.winner = 1;
    next.phase = 'complete';
    next.log.push({ message: `${next.deck1.ownerName} wins! ${next.deck2.ownerName} has no cards left!`, category: 'system' });
    return next;
  }

  // Auto-field leader if none
  if (!next.deck1.leader && next.deck1.hand.length > 0) {
    next.deck1.leader = next.deck1.hand.shift()!;
    next.log.push({ message: `${next.deck1.ownerName} fields ${next.deck1.leader.name} as leader`, category: 'system' });
  }
  if (!next.deck2.leader && next.deck2.hand.length > 0) {
    next.deck2.leader = next.deck2.hand.shift()!;
    next.log.push({ message: `${next.deck2.ownerName} fields ${next.deck2.leader.name} as leader`, category: 'system' });
  }

  // === STEP 1: Reset temporary boosts ===
  if (next.deck1.leader) {
    next.deck1.leader.tempAttackBoost = 0;
    next.deck1.leader.tempDefenseBoost = 0;
    next.deck1.leader.isHidden = false;
    next.deck1.leader.hasAnnihilate = false;
    // Note: isStunned persists from previous turn's stun, cleared after combat
  }
  if (next.deck2.leader) {
    next.deck2.leader.tempAttackBoost = 0;
    next.deck2.leader.tempDefenseBoost = 0;
    next.deck2.leader.isHidden = false;
    next.deck2.leader.hasAnnihilate = false;
  }

  // === STEP 2: Magick generation ===
  const magickLogs1 = generateMagick(next.deck1, magickConfig);
  const magickLogs2 = generateMagick(next.deck2, magickConfig);
  for (const log of [...magickLogs1, ...magickLogs2]) {
    next.log.push({ message: log, category: 'magick' });
  }

  // === STEP 3: Player swap phase ===
  if (targeting?.swapLeaderInstanceId != null) {
    const swapLog = swapLeader(next.deck1, targeting.swapLeaderInstanceId);
    if (swapLog) next.log.push({ message: swapLog, category: 'action' });
  }

  // === STEP 4: Ability activation ===
  if (targeting?.activateAbility && next.deck1.leader?.ability) {
    const abilityLogs = activateAbility(next.deck1, next.deck2, next.deck1.leader.ability);
    for (const log of abilityLogs) {
      next.log.push({ message: log, category: 'ability' });
    }
  }

  // AI ability activation (simple heuristic: activate if can afford and ability is offensive)
  if (next.deck2.leader?.ability) {
    const aiAbility = next.deck2.leader.ability;
    if (canAffordAbility(next.deck2.magick, aiAbility.cost)) {
      // AI activates ability ~50% of the time when affordable
      if (Math.random() < 0.5) {
        const abilityLogs = activateAbility(next.deck2, next.deck1, aiAbility);
        for (const log of abilityLogs) {
          next.log.push({ message: log, category: 'ability' });
        }
      }
    }
  }

  // === STEP 5: Combat — Leaders attack each other ===
  const leader1 = next.deck1.leader;
  const leader2 = next.deck2.leader;

  if (!leader1 || !leader2) {
    // Edge case: one side has no leader (shouldn't happen at this point)
    next.turn += 1;
    return next;
  }

  const mitDiv = combatConfig?.damageMitigationDivisor ?? 2;
  const minDmg = combatConfig?.minimumDamage ?? 1;

  // Calculate Deck 1's attack on Deck 2's leader
  let atk1 = leader1.attack + (leader1.tempAttackBoost || 0);
  let def2 = Math.max(0, leader2.defense + (leader2.tempDefenseBoost || 0));

  // Annihilate = guaranteed kill
  if (leader1.hasAnnihilate) {
    atk1 = 9999;
  }
  // Hidden = can't be damaged
  if (leader2.isHidden) {
    def2 = 9999;
  }
  // Stunned = can't attack
  const leader1Stunned = leader1.isStunned;

  let dmg1 = leader1Stunned ? 0 : Math.max(minDmg, atk1 - Math.floor(def2 / mitDiv));
  if (leader2.isHidden && !leader1.hasAnnihilate) dmg1 = 0; // Hidden blocks all damage

  // Calculate Deck 2's attack on Deck 1's leader
  let atk2 = leader2.attack + (leader2.tempAttackBoost || 0);
  let def1 = Math.max(0, leader1.defense + (leader1.tempDefenseBoost || 0));

  if (leader2.hasAnnihilate) {
    atk2 = 9999;
  }
  if (leader1.isHidden) {
    def1 = 9999;
  }
  const leader2Stunned = leader2.isStunned;

  let dmg2 = leader2Stunned ? 0 : Math.max(minDmg, atk2 - Math.floor(def1 / mitDiv));
  if (leader1.isHidden && !leader2.hasAnnihilate) dmg2 = 0;

  // Apply damage to both leaders simultaneously
  let leader1Destroyed = false;
  let leader2Destroyed = false;
  let excess1 = 0; // Excess damage hitting player 2 HP
  let excess2 = 0; // Excess damage hitting player 1 HP

  // Damage to leader 2
  if (dmg1 > 0) {
    leader2.currentDefense -= dmg1;
    if (leader2.currentDefense <= 0) {
      excess1 = Math.abs(leader2.currentDefense);
      leader2Destroyed = true;
      next.deck2.playerHp -= excess1;
    }
  }

  // Damage to leader 1
  if (dmg2 > 0) {
    leader1.currentDefense -= dmg2;
    if (leader1.currentDefense <= 0) {
      excess2 = Math.abs(leader1.currentDefense);
      leader1Destroyed = true;
      next.deck1.playerHp -= excess2;
    }
  }

  // Lifesteal check
  if (leader1.ability?.effect.type === 'lifesteal' && targeting?.activateAbility && dmg1 > 0) {
    const healAmount = Math.floor(dmg1 * (leader1.ability.effect as any).percent / 100);
    next.deck1.playerHp = Math.min(next.deck1.maxPlayerHp, next.deck1.playerHp + healAmount);
    next.log.push({ message: `${leader1.name} lifesteals ${healAmount} HP!`, category: 'combat' });
  }

  // Log combat
  if (leader1Stunned) {
    next.log.push({ message: `${leader1.name} is STUNNED and cannot attack!`, category: 'combat' });
  }
  if (leader2Stunned) {
    next.log.push({ message: `${leader2.name} is STUNNED and cannot attack!`, category: 'combat' });
  }

  if (dmg1 > 0) {
    const msg = leader2Destroyed
      ? `${leader1.name} attacks ${leader2.name} for ${dmg1} — DESTROYED! (${excess1} excess dmg to ${next.deck2.ownerName})`
      : `${leader1.name} attacks ${leader2.name} for ${dmg1} (${leader2.currentDefense}/${leader2.defense} HP)`;
    next.log.push({ message: msg, category: 'combat' });
  }

  if (dmg2 > 0) {
    const msg = leader1Destroyed
      ? `${leader2.name} attacks ${leader1.name} for ${dmg2} — DESTROYED! (${excess2} excess dmg to ${next.deck1.ownerName})`
      : `${leader2.name} attacks ${leader1.name} for ${dmg2} (${leader1.currentDefense}/${leader1.defense} HP)`;
    next.log.push({ message: msg, category: 'combat' });
  }

  // Combat events for UI
  if (dmg1 > 0 || leader1Stunned) {
    next.roundEvents!.push({
      attackerName: leader1.name,
      attackerInstanceId: leader1.instanceId,
      defenderName: leader2.name,
      defenderInstanceId: leader2.instanceId,
      damage: dmg1,
      defenderDestroyed: leader2Destroyed,
      excessDamage: excess1,
      side: 1,
    });
  }
  if (dmg2 > 0 || leader2Stunned) {
    next.roundEvents!.push({
      attackerName: leader2.name,
      attackerInstanceId: leader2.instanceId,
      defenderName: leader1.name,
      defenderInstanceId: leader1.instanceId,
      damage: dmg2,
      defenderDestroyed: leader1Destroyed,
      excessDamage: excess2,
      side: 2,
    });
  }

  // Last event for backward compat
  const p1 = next.roundEvents![0];
  next.lastEvent = p1
    ? { attacker: p1.attackerName, defender: p1.defenderName, damage: p1.damage, defenderDestroyed: p1.defenderDestroyed, excessDamage: p1.excessDamage }
    : undefined;

  // === STEP 6: Clear stun after combat ===
  if (leader1.isStunned) leader1.isStunned = false;
  if (leader2.isStunned) leader2.isStunned = false;

  // === STEP 7: Dead leader → graveyard, field new leader from hand ===
  if (leader2Destroyed) {
    next.deck2.graveyard.push(leader2);
    if (next.deck2.hand.length > 0) {
      next.deck2.leader = next.deck2.hand.shift()!;
      next.deck2.leader.tempAttackBoost = 0;
      next.deck2.leader.tempDefenseBoost = 0;
      next.log.push({ message: `${next.deck2.ownerName} fields ${next.deck2.leader.name} as new leader`, category: 'system' });
    } else {
      next.deck2.leader = null;
    }
  }

  if (leader1Destroyed) {
    next.deck1.graveyard.push(leader1);
    if (next.deck1.hand.length > 0) {
      next.deck1.leader = next.deck1.hand.shift()!;
      next.deck1.leader.tempAttackBoost = 0;
      next.deck1.leader.tempDefenseBoost = 0;
      next.log.push({ message: `${next.deck1.ownerName} fields ${next.deck1.leader.name} as new leader`, category: 'system' });
    } else {
      next.deck1.leader = null;
    }
  }

  // Increment turn
  next.turn += 1;

  // === STEP 8: Victory check ===
  // Win condition: opponent player HP <= 0 OR opponent has no leader and no hand
  if (next.deck2.playerHp <= 0) {
    next.winner = 1;
    next.phase = 'complete';
    next.log.push({ message: `${next.deck1.ownerName} wins! ${next.deck2.ownerName}'s HP reduced to 0!`, category: 'system' });
  } else if (next.deck1.playerHp <= 0) {
    next.winner = 2;
    next.phase = 'complete';
    next.log.push({ message: `${next.deck2.ownerName} wins! ${next.deck1.ownerName}'s HP reduced to 0!`, category: 'system' });
  } else if (!next.deck2.leader && next.deck2.hand.length === 0) {
    next.winner = 1;
    next.phase = 'complete';
    next.log.push({ message: `${next.deck1.ownerName} wins! ${next.deck2.ownerName} has no cards left!`, category: 'system' });
  } else if (!next.deck1.leader && next.deck1.hand.length === 0) {
    next.winner = 2;
    next.phase = 'complete';
    next.log.push({ message: `${next.deck2.ownerName} wins! ${next.deck1.ownerName} has no cards left!`, category: 'system' });
  }

  // Check max rounds
  const maxRounds = combatConfig?.maxRounds ?? 30;
  if (next.winner === null && next.turn > maxRounds) {
    // Tiebreaker: most player HP wins
    next.winner = next.deck1.playerHp >= next.deck2.playerHp ? 1 : 2;
    next.phase = 'complete';
    next.log.push({
      message: `Max rounds reached! ${next.winner === 1 ? next.deck1.ownerName : next.deck2.ownerName} wins by HP (${next.deck1.playerHp} vs ${next.deck2.playerHp})`,
      category: 'system',
    });
  }

  return next;
}

// ============================================================
// UTILITY
// ============================================================

export function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// AUTOBOT STRATEGY SYSTEM — for tournaments
// ============================================================

/**
 * AI strategy resolver for tournament automated combat.
 * In leader system, strategy determines swap + ability decisions.
 */
export function resolveAutobotTargeting(
  strategy: AutobotStrategy,
  deck: BattleDeck,
  enemyDeck: BattleDeck,
): PlayerTargeting {
  const targeting: PlayerTargeting = {};

  if (!deck.leader || deck.hand.length === 0) return targeting;

  switch (strategy) {
    case 'focus-weakest': {
      // Aggressive: activate ability if affordable, don't swap
      if (deck.leader.ability && canAffordAbility(deck.magick, deck.leader.ability.cost)) {
        targeting.activateAbility = true;
      }
      break;
    }

    case 'focus-strongest': {
      // Counter: swap to highest-attack card, activate ability
      const strongestHand = [...deck.hand].sort((a, b) => b.attack - a.attack)[0];
      if (strongestHand && strongestHand.attack > deck.leader.attack + 10) {
        targeting.swapLeaderInstanceId = strongestHand.instanceId;
      }
      if (deck.leader.ability && canAffordAbility(deck.magick, deck.leader.ability.cost)) {
        targeting.activateAbility = true;
      }
      break;
    }

    case 'spread-damage': {
      // Rotate leaders to spread incoming damage
      if (deck.leader.currentDefense < deck.leader.defense * 0.5 && deck.hand.length > 0) {
        // Swap to healthiest hand card
        const healthiest = [...deck.hand].sort((a, b) => b.currentDefense - a.currentDefense)[0];
        targeting.swapLeaderInstanceId = healthiest.instanceId;
      }
      break;
    }

    case 'protect-healer': {
      // Keep highest-defense card as leader, use abilities defensively
      const tankiest = [...deck.hand].sort((a, b) => b.defense - a.defense)[0];
      if (tankiest && tankiest.defense > deck.leader.defense + 5) {
        targeting.swapLeaderInstanceId = tankiest.instanceId;
      }
      if (deck.leader.ability && canAffordAbility(deck.magick, deck.leader.ability.cost)) {
        const eff = deck.leader.ability.effect;
        if (eff.type === 'shield' || eff.type === 'hp_boost' || eff.type === 'hide') {
          targeting.activateAbility = true;
        }
      }
      break;
    }

    case 'random':
    default: {
      // Random swap 20% of the time
      if (Math.random() < 0.2 && deck.hand.length > 0) {
        const randomHand = deck.hand[Math.floor(Math.random() * deck.hand.length)];
        targeting.swapLeaderInstanceId = randomHand.instanceId;
      }
      // Random ability 40% of the time
      if (deck.leader.ability && canAffordAbility(deck.magick, deck.leader.ability.cost) && Math.random() < 0.4) {
        targeting.activateAbility = true;
      }
      break;
    }
  }

  return targeting;
}

// ============================================================
// TOURNAMENT MATCH SIMULATION
// ============================================================

export interface TournamentMatchResult {
  winner: 1 | 2;
  roundCount: number;
  combatSummary: string[];
  survivingCards: number;
}

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

    // Both sides use autobot strategy
    const targeting1 = resolveAutobotTargeting(strategy1, battle.deck1, battle.deck2);

    battle = simulateBattleRound(battle, combatConfig, targeting1, abilitiesConfig);

    // Collect notable events
    if (battle.roundEvents) {
      for (const event of battle.roundEvents) {
        if (event.defenderDestroyed) {
          summary.push(`Turn ${battle.turn - 1}: ${event.attackerName} destroyed ${event.defenderName}`);
        }
        if (event.excessDamage && event.excessDamage > 0) {
          summary.push(`Turn ${battle.turn - 1}: ${event.excessDamage} excess damage to player`);
        }
      }
    }
  }

  if (battle.winner === null) {
    const hp1 = battle.deck1.playerHp;
    const hp2 = battle.deck2.playerHp;
    battle.winner = hp1 >= hp2 ? 1 : 2;
    summary.push(`Match decided by HP: ${battle.deck1.ownerName} (${hp1}) vs ${battle.deck2.ownerName} (${hp2})`);
  }

  const winnerDeck = battle.winner === 1 ? battle.deck1 : battle.deck2;
  const survivingCards = (winnerDeck.leader ? 1 : 0) + winnerDeck.hand.length;

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
