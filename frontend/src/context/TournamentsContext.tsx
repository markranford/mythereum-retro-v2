import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Tournament, TournamentConfig, TournamentParticipant, TournamentMatch,
  TournamentStatus, AutobotStrategy,
} from '../types/tournaments';
import { useHeroes } from './HeroesContext';
import { useEconomy } from './EconomyContext';
import { useGameConfig } from './GameConfigContext';
import {
  buildBattleDeck, buildAiDeck, simulateTournamentMatch,
} from '../lib/battleUtils';
import { OwnedHeroCard } from '../types/heroes';
import { CARD_LIBRARY } from '../lib/mockData';

interface TournamentsContextType {
  tournaments: Tournament[];
  createTournament: (config: TournamentConfig) => { success: boolean; error?: string; tournamentId?: string };
  joinTournament: (tournamentId: string, deckId: string, strategy: AutobotStrategy) => { success: boolean; error?: string };
  startTournament: (tournamentId: string) => { success: boolean; error?: string };
  simulateNextRound: (tournamentId: string) => { success: boolean; error?: string };
  getTournamentById: (id: string) => Tournament | undefined;
}

const TournamentsContext = createContext<TournamentsContextType | undefined>(undefined);

const STORAGE_KEY = 'retro-mythereum-tournaments-v1';

const AI_NAMES = [
  'Iron Vanguard Bot', 'Shadow Striker', 'Arcane Sentinel', 'Forest Warden',
  'Divine Crusader', 'Frost Commander', 'Storm Bringer', 'Blood Reaver',
  'Crystal Guardian', 'Doom Harbinger', 'Swift Phantom', 'Holy Bastion',
  'Venom Fang', 'Thunder Lord', 'Bone Collector', 'Star Forger',
];

const AI_STRATEGIES: AutobotStrategy[] = ['random', 'focus-weakest', 'focus-strongest', 'spread-damage', 'protect-healer'];

function generateId(prefix = 'tournament'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function validateTournamentsArray(data: any): Tournament[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const values = Object.values(data);
    return values.filter((item): item is Tournament =>
      item !== null && typeof item === 'object' && 'id' in item
    );
  }
  return [];
}

export function TournamentsProvider({ children }: { children: React.ReactNode }) {
  const { getDeckPower, heroes, decksWithPower } = useHeroes();
  const { canAffordMythex, spendMythex } = useEconomy();
  const { tournamentDefaults: tournCfg, combat: combatCfg, classAbilities: abilitiesCfg } = useGameConfig();

  // Refs for stable callbacks
  const tournCfgRef = useRef(tournCfg);
  const combatCfgRef = useRef(combatCfg);
  const abilitiesCfgRef = useRef(abilitiesCfg);
  const heroesRef = useRef(heroes);
  const decksRef = useRef(decksWithPower);

  useEffect(() => { tournCfgRef.current = tournCfg; }, [tournCfg]);
  useEffect(() => { combatCfgRef.current = combatCfg; }, [combatCfg]);
  useEffect(() => { abilitiesCfgRef.current = abilitiesCfg; }, [abilitiesCfg]);
  useEffect(() => { heroesRef.current = heroes; }, [heroes]);
  useEffect(() => { decksRef.current = decksWithPower; }, [decksWithPower]);

  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = validateTournamentsArray(parsed);
        if (validated.length > 0) return validated;
      }
    } catch (error) {
      console.error('[TournamentsContext] Failed to load:', error);
    }

    // Create defaults from config presets
    const cfg = tournCfgRef.current;
    return cfg.presets.map((preset, idx) => ({
      id: generateId(),
      name: preset.name,
      config: {
        name: preset.name,
        format: preset.format,
        maxParticipants: preset.maxParticipants,
        entryFee: preset.entryFee,
        startTime: Date.now() + preset.startDelayHours * 60 * 60 * 1000,
      },
      status: (idx === 0 ? 'registration' : 'upcoming') as TournamentStatus,
      participants: [],
      matches: [],
      currentRound: 0,
      rewards: preset.rewards,
      championId: undefined,
      createdAt: Date.now(),
    }));
  });

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validateTournamentsArray(tournaments)));
    } catch (error) {
      console.error('[TournamentsContext] Failed to save:', error);
    }
  }, [tournaments]);

  // === CREATE TOURNAMENT ===
  const createTournament = useCallback((config: TournamentConfig): { success: boolean; error?: string; tournamentId?: string } => {
    try {
      const newTournament: Tournament = {
        id: generateId(),
        name: config.name,
        config,
        status: 'registration',
        participants: [],
        matches: [],
        currentRound: 0,
        createdAt: Date.now(),
      };

      setTournaments(prev => [...validateTournamentsArray(prev), newTournament]);
      return { success: true, tournamentId: newTournament.id };
    } catch (error) {
      console.error('[TournamentsContext] Failed to create:', error);
      return { success: false, error: 'Failed to create tournament' };
    }
  }, []);

  // === JOIN TOURNAMENT ===
  const joinTournament = useCallback((
    tournamentId: string, deckId: string, strategy: AutobotStrategy
  ): { success: boolean; error?: string } => {
    try {
      const validated = validateTournamentsArray(tournaments);
      const tournament = validated.find(t => t.id === tournamentId);
      if (!tournament) return { success: false, error: 'Tournament not found' };

      if (tournament.status !== 'registration' && tournament.status !== 'upcoming') {
        return { success: false, error: 'Tournament is not accepting registrations' };
      }
      if (tournament.participants.length >= tournament.config.maxParticipants) {
        return { success: false, error: 'Tournament is full' };
      }
      if (tournament.participants.some(p => !p.isAI)) {
        return { success: false, error: 'You have already joined this tournament' };
      }
      if (!canAffordMythex(tournament.config.entryFee)) {
        return { success: false, error: 'Insufficient Mythex for entry fee' };
      }

      const deckPower = getDeckPower(deckId);
      if (deckPower === 0) return { success: false, error: 'Invalid deck or deck has no power' };

      const success = spendMythex(tournament.config.entryFee, `Tournament Entry: ${tournament.name}`);
      if (!success) return { success: false, error: 'Failed to deduct entry fee' };

      // Get the deck's card instance IDs for combat
      const deck = decksRef.current.find(d => d.id === deckId);
      const deckCardIds = deck?.cardInstanceIds || [];

      const newParticipant: TournamentParticipant = {
        id: generateId('player'),
        name: 'You',
        deckId,
        deckPower,
        isAI: false,
        eliminated: false,
        strategy,
        deckCardIds,
      };

      setTournaments(prev =>
        validateTournamentsArray(prev).map(t =>
          t.id === tournamentId
            ? { ...t, participants: [...t.participants, newParticipant], status: 'registration' as TournamentStatus }
            : t
        )
      );

      return { success: true };
    } catch (error) {
      console.error('[TournamentsContext] Failed to join:', error);
      return { success: false, error: 'Failed to join tournament' };
    }
  }, [tournaments, canAffordMythex, spendMythex, getDeckPower]);

  // === START TOURNAMENT ===
  const startTournament = useCallback((tournamentId: string): { success: boolean; error?: string } => {
    try {
      const validated = validateTournamentsArray(tournaments);
      const tournament = validated.find(t => t.id === tournamentId);
      if (!tournament) return { success: false, error: 'Tournament not found' };

      if (tournament.status !== 'registration' && tournament.status !== 'upcoming') {
        return { success: false, error: 'Tournament cannot be started' };
      }

      let participants = [...tournament.participants];
      let aiIndex = participants.length;

      // Fill remaining slots with AI competitors
      while (participants.length < tournament.config.maxParticipants) {
        const aiName = AI_NAMES[aiIndex % AI_NAMES.length];
        const aiStrategy = AI_STRATEGIES[Math.floor(Math.random() * AI_STRATEGIES.length)];

        // Build a real AI deck from the card library (5 cards: 1 leader + 4 hand)
        const deckSize = 5;
        const availableCards = CARD_LIBRARY.filter(c => c.cardType === 'Hero');
        const aiCardIds: string[] = [];
        for (let j = 0; j < deckSize; j++) {
          const card = availableCards[Math.floor(Math.random() * availableCards.length)];
          aiCardIds.push(card.id);
        }
        const aiPower = aiCardIds.reduce((sum, id) => {
          const card = CARD_LIBRARY.find(c => c.id === id);
          return sum + (card ? (card.attack || 0) + (card.defense || 0) : 10);
        }, 0);

        const aiParticipant: TournamentParticipant = {
          id: generateId('ai'),
          name: aiName,
          deckId: `ai_deck_${aiIndex}`,
          deckPower: aiPower,
          isAI: true,
          eliminated: false,
          strategy: aiStrategy,
          deckCardIds: aiCardIds,
        };
        participants.push(aiParticipant);
        aiIndex++;
      }

      // Shuffle participants for random seeding
      for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
      }

      // Generate first round bracket
      const firstRoundMatches: TournamentMatch[] = [];
      for (let i = 0; i < participants.length; i += 2) {
        firstRoundMatches.push({
          id: generateId('match'),
          round: 1,
          participant1Id: participants[i].id,
          participant2Id: participants[i + 1].id,
          completed: false,
        });
      }

      setTournaments(prev =>
        validateTournamentsArray(prev).map(t =>
          t.id === tournamentId
            ? { ...t, status: 'active' as TournamentStatus, participants, matches: firstRoundMatches, currentRound: 1 }
            : t
        )
      );

      return { success: true };
    } catch (error) {
      console.error('[TournamentsContext] Failed to start:', error);
      return { success: false, error: 'Failed to start tournament' };
    }
  }, [tournaments]);

  // === SIMULATE NEXT ROUND (real combat!) ===
  const simulateNextRound = useCallback((tournamentId: string): { success: boolean; error?: string } => {
    try {
      const validated = validateTournamentsArray(tournaments);
      const tournament = validated.find(t => t.id === tournamentId);
      if (!tournament) return { success: false, error: 'Tournament not found' };
      if (tournament.status !== 'active') return { success: false, error: 'Tournament is not active' };

      const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound && !m.completed);
      if (currentRoundMatches.length === 0) return { success: false, error: 'No matches to simulate' };

      const combatConfig = combatCfgRef.current;
      const abilitiesConfig = abilitiesCfgRef.current;
      const currentHeroes = heroesRef.current;

      // Simulate each match with real card combat
      const updatedMatches = tournament.matches.map(match => {
        if (match.round !== tournament.currentRound || match.completed) return match;

        const p1 = tournament.participants.find(p => p.id === match.participant1Id);
        const p2 = tournament.participants.find(p => p.id === match.participant2Id);
        if (!p1 || !p2) return match;

        // Build deck 1
        const deck1 = buildParticipantDeck(p1, currentHeroes);
        // Build deck 2
        const deck2 = buildParticipantDeck(p2, currentHeroes);

        // Run full automated match
        const result = simulateTournamentMatch(
          deck1, deck2,
          p1.strategy, p2.strategy,
          combatConfig, abilitiesConfig,
        );

        const winnerId = result.winner === 1 ? p1.id : p2.id;

        return {
          ...match,
          winnerId,
          completed: true,
          roundCount: result.roundCount,
          combatSummary: result.combatSummary,
          participant1Score: result.winner === 1 ? result.survivingCards : 0,
          participant2Score: result.winner === 2 ? result.survivingCards : 0,
        };
      });

      // Determine winners and losers
      const winners = updatedMatches
        .filter(m => m.round === tournament.currentRound)
        .map(m => m.winnerId)
        .filter((id): id is string => id !== undefined);

      const losers = updatedMatches
        .filter(m => m.round === tournament.currentRound)
        .map(m => [m.participant1Id, m.participant2Id])
        .flat()
        .filter(id => !winners.includes(id));

      const updatedParticipants = tournament.participants.map(p => ({
        ...p,
        eliminated: losers.includes(p.id) ? true : p.eliminated,
      }));

      // Check if tournament is complete (1 winner left)
      if (winners.length === 1) {
        setTournaments(prev =>
          validateTournamentsArray(prev).map(t =>
            t.id === tournamentId
              ? { ...t, status: 'completed' as TournamentStatus, matches: updatedMatches, participants: updatedParticipants, championId: winners[0] }
              : t
          )
        );
        return { success: true };
      }

      // Generate next round matches
      const nextRoundMatches: TournamentMatch[] = [];
      for (let i = 0; i < winners.length; i += 2) {
        nextRoundMatches.push({
          id: generateId('match'),
          round: tournament.currentRound + 1,
          participant1Id: winners[i],
          participant2Id: winners[i + 1] || winners[i], // Handle odd numbers (bye)
          completed: false,
        });
      }

      setTournaments(prev =>
        validateTournamentsArray(prev).map(t =>
          t.id === tournamentId
            ? { ...t, matches: [...updatedMatches, ...nextRoundMatches], participants: updatedParticipants, currentRound: tournament.currentRound + 1 }
            : t
        )
      );

      return { success: true };
    } catch (error) {
      console.error('[TournamentsContext] Failed to simulate:', error);
      return { success: false, error: 'Failed to simulate round' };
    }
  }, [tournaments]);

  const getTournamentById = useCallback((id: string): Tournament | undefined => {
    return validateTournamentsArray(tournaments).find(t => t.id === id);
  }, [tournaments]);

  const value = useMemo(() => ({
    tournaments: validateTournamentsArray(tournaments),
    createTournament,
    joinTournament,
    startTournament,
    simulateNextRound,
    getTournamentById,
  }), [tournaments, createTournament, joinTournament, startTournament, simulateNextRound, getTournamentById]);

  return (
    <TournamentsContext.Provider value={value}>
      {children}
    </TournamentsContext.Provider>
  );
}

// === Helper: Build a BattleDeck from a participant ===

function buildParticipantDeck(participant: TournamentParticipant, allHeroes: OwnedHeroCard[]) {
  if (participant.isAI) {
    // AI: build deck from their stored card IDs
    return buildAiDeck(
      participant.deckCardIds?.length || 5,
      participant.deckPower,
      participant.name,
    );
  }

  // Player: build from their actual hero cards
  const deckHeroes = allHeroes.filter(h =>
    participant.deckCardIds?.includes(h.instanceId)
  );

  if (deckHeroes.length === 0) {
    // Fallback: build AI-style deck if heroes aren't available
    return buildAiDeck(5, participant.deckPower, participant.name);
  }

  return buildBattleDeck(deckHeroes, participant.name);
}

export function useTournaments() {
  const context = useContext(TournamentsContext);
  if (!context) {
    throw new Error('useTournaments must be used within TournamentsProvider');
  }
  return context;
}
