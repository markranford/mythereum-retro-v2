import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Tournament, TournamentConfig, TournamentParticipant, TournamentMatch, TournamentStatus } from '../types/tournaments';
import { useHeroes } from './HeroesContext';
import { useEconomy } from './EconomyContext';
import { useGameConfig } from './GameConfigContext';

interface TournamentsContextType {
  tournaments: Tournament[];
  createTournament: (config: TournamentConfig) => { success: boolean; error?: string; tournamentId?: string };
  joinTournament: (tournamentId: string, deckId: string) => { success: boolean; error?: string };
  startTournament: (tournamentId: string) => { success: boolean; error?: string };
  simulateNextRound: (tournamentId: string) => { success: boolean; error?: string };
  getTournamentById: (id: string) => Tournament | undefined;
}

const TournamentsContext = createContext<TournamentsContextType | undefined>(undefined);

const STORAGE_KEY = 'retro-mythereum-tournaments-v1';

function generateId(): string {
  return `tournament_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateParticipantId(): string {
  return `participant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateMatchId(): string {
  return `match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Defensive validation: ensure data is always an array
function validateTournamentsArray(data: any): Tournament[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    // If it's an object, try to extract array values
    const values = Object.values(data);
    if (values.length > 0 && Array.isArray(values)) {
      return values.filter((item): item is Tournament => 
        item !== null && typeof item === 'object' && 'id' in item
      );
    }
  }
  console.warn('[TournamentsContext] Invalid tournaments data, returning empty array:', data);
  return [];
}

export function TournamentsProvider({ children }: { children: React.ReactNode }) {
  const { getDeckPower } = useHeroes();
  const { canAffordMythex, spendMythex } = useEconomy();
  const { tournamentDefaults: tournCfg } = useGameConfig();
  const tournCfgRef = useRef(tournCfg);
  useEffect(() => { tournCfgRef.current = tournCfg; }, [tournCfg]);

  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = validateTournamentsArray(parsed);
        if (validated.length > 0) {
          console.log('[TournamentsContext] Loaded tournaments from storage:', validated.length);
          return validated;
        }
      }
    } catch (error) {
      console.error('[TournamentsContext] Failed to load tournaments:', error);
    }
    
    // Create default tournaments from config presets
    const cfg = tournCfgRef.current;
    const defaultTournaments: Tournament[] = cfg.presets.map((preset, idx) => ({
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

    console.log('[TournamentsContext] Initialized with', defaultTournaments.length, 'default tournaments from config');
    return defaultTournaments;
  });

  useEffect(() => {
    try {
      // Validate before saving
      const validated = validateTournamentsArray(tournaments);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    } catch (error) {
      console.error('[TournamentsContext] Failed to save tournaments:', error);
    }
  }, [tournaments]);

  const createTournament = useCallback((config: TournamentConfig): { success: boolean; error?: string; tournamentId?: string } => {
    try {
      const newTournament: Tournament = {
        id: generateId(),
        name: config.name,
        config,
        status: 'upcoming',
        participants: [],
        matches: [],
        currentRound: 0,
        championId: undefined,
        createdAt: Date.now(),
      };

      setTournaments(prev => {
        const validated = validateTournamentsArray(prev);
        return [...validated, newTournament];
      });
      return { success: true, tournamentId: newTournament.id };
    } catch (error) {
      console.error('[TournamentsContext] Failed to create tournament:', error);
      return { success: false, error: 'Failed to create tournament' };
    }
  }, []);

  const joinTournament = useCallback((tournamentId: string, deckId: string): { success: boolean; error?: string } => {
    try {
      const validated = validateTournamentsArray(tournaments);
      const tournament = validated.find(t => t.id === tournamentId);
      if (!tournament) {
        return { success: false, error: 'Tournament not found' };
      }

      if (tournament.status !== 'registration' && tournament.status !== 'upcoming') {
        return { success: false, error: 'Tournament is not accepting registrations' };
      }

      if (tournament.participants.length >= tournament.config.maxParticipants) {
        return { success: false, error: 'Tournament is full' };
      }

      const alreadyJoined = tournament.participants.some(p => !p.isAI);
      if (alreadyJoined) {
        return { success: false, error: 'You have already joined this tournament' };
      }

      if (!canAffordMythex(tournament.config.entryFee)) {
        return { success: false, error: 'Insufficient Mythex for entry fee' };
      }

      const deckPower = getDeckPower(deckId);
      if (deckPower === 0) {
        return { success: false, error: 'Invalid deck or deck has no power' };
      }

      const success = spendMythex(tournament.config.entryFee, `Tournament Entry: ${tournament.name}`);
      if (!success) {
        return { success: false, error: 'Failed to deduct entry fee' };
      }

      const newParticipant: TournamentParticipant = {
        id: generateParticipantId(),
        name: 'Player',
        deckId,
        deckPower,
        isAI: false,
        eliminated: false,
      };

      setTournaments(prev => {
        const validated = validateTournamentsArray(prev);
        return validated.map(t => {
          if (t.id === tournamentId) {
            return {
              ...t,
              participants: [...t.participants, newParticipant],
              status: 'registration' as TournamentStatus,
            };
          }
          return t;
        });
      });

      return { success: true };
    } catch (error) {
      console.error('[TournamentsContext] Failed to join tournament:', error);
      return { success: false, error: 'Failed to join tournament' };
    }
  }, [tournaments, canAffordMythex, spendMythex, getDeckPower]);

  const startTournament = useCallback((tournamentId: string): { success: boolean; error?: string } => {
    try {
      const validated = validateTournamentsArray(tournaments);
      const tournament = validated.find(t => t.id === tournamentId);
      if (!tournament) {
        return { success: false, error: 'Tournament not found' };
      }

      if (tournament.status !== 'registration' && tournament.status !== 'upcoming') {
        return { success: false, error: 'Tournament cannot be started' };
      }

      let participants = [...tournament.participants];
      
      while (participants.length < tournament.config.maxParticipants) {
        const aiParticipant: TournamentParticipant = {
          id: generateParticipantId(),
          name: `AI Opponent ${participants.length + 1}`,
          deckId: `ai_deck_${participants.length}`,
          deckPower: Math.floor(Math.random() * 200) + 100,
          isAI: true,
          eliminated: false,
        };
        participants.push(aiParticipant);
      }

      const firstRoundMatches: TournamentMatch[] = [];
      for (let i = 0; i < participants.length; i += 2) {
        firstRoundMatches.push({
          id: generateMatchId(),
          round: 1,
          participant1Id: participants[i].id,
          participant2Id: participants[i + 1].id,
          winnerId: undefined,
          completed: false,
        });
      }

      setTournaments(prev => {
        const validated = validateTournamentsArray(prev);
        return validated.map(t => {
          if (t.id === tournamentId) {
            return {
              ...t,
              status: 'active' as TournamentStatus,
              participants,
              matches: firstRoundMatches,
              currentRound: 1,
            };
          }
          return t;
        });
      });

      return { success: true };
    } catch (error) {
      console.error('[TournamentsContext] Failed to start tournament:', error);
      return { success: false, error: 'Failed to start tournament' };
    }
  }, [tournaments]);

  const simulateNextRound = useCallback((tournamentId: string): { success: boolean; error?: string } => {
    try {
      const validated = validateTournamentsArray(tournaments);
      const tournament = validated.find(t => t.id === tournamentId);
      if (!tournament) {
        return { success: false, error: 'Tournament not found' };
      }

      if (tournament.status !== 'active') {
        return { success: false, error: 'Tournament is not active' };
      }

      const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound && !m.completed);
      
      if (currentRoundMatches.length === 0) {
        return { success: false, error: 'No matches to simulate in current round' };
      }

      const updatedMatches = tournament.matches.map(match => {
        if (match.round === tournament.currentRound && !match.completed) {
          const p1 = tournament.participants.find(p => p.id === match.participant1Id);
          const p2 = tournament.participants.find(p => p.id === match.participant2Id);
          
          if (!p1 || !p2) return match;

          const p1WinChance = p1.deckPower / (p1.deckPower + p2.deckPower);
          const winnerId = Math.random() < p1WinChance ? p1.id : p2.id;

          return {
            ...match,
            winnerId,
            completed: true,
          };
        }
        return match;
      });

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

      if (winners.length === 1) {
        setTournaments(prev => {
          const validated = validateTournamentsArray(prev);
          return validated.map(t => {
            if (t.id === tournamentId) {
              return {
                ...t,
                status: 'completed' as TournamentStatus,
                matches: updatedMatches,
                participants: updatedParticipants,
                championId: winners[0],
              };
            }
            return t;
          });
        });
        return { success: true };
      }

      const nextRoundMatches: TournamentMatch[] = [];
      for (let i = 0; i < winners.length; i += 2) {
        nextRoundMatches.push({
          id: generateMatchId(),
          round: tournament.currentRound + 1,
          participant1Id: winners[i],
          participant2Id: winners[i + 1],
          winnerId: undefined,
          completed: false,
        });
      }

      setTournaments(prev => {
        const validated = validateTournamentsArray(prev);
        return validated.map(t => {
          if (t.id === tournamentId) {
            return {
              ...t,
              matches: [...updatedMatches, ...nextRoundMatches],
              participants: updatedParticipants,
              currentRound: tournament.currentRound + 1,
            };
          }
          return t;
        });
      });

      return { success: true };
    } catch (error) {
      console.error('[TournamentsContext] Failed to simulate round:', error);
      return { success: false, error: 'Failed to simulate round' };
    }
  }, [tournaments]);

  const getTournamentById = useCallback((id: string): Tournament | undefined => {
    const validated = validateTournamentsArray(tournaments);
    return validated.find(t => t.id === id);
  }, [tournaments]);

  return (
    <TournamentsContext.Provider
      value={{
        tournaments: validateTournamentsArray(tournaments),
        createTournament,
        joinTournament,
        startTournament,
        simulateNextRound,
        getTournamentById,
      }}
    >
      {children}
    </TournamentsContext.Provider>
  );
}

export function useTournaments() {
  const context = useContext(TournamentsContext);
  if (!context) {
    throw new Error('useTournaments must be used within TournamentsProvider');
  }
  return context;
}
