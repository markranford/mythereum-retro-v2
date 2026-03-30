import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { useMemo } from 'react';
import type { UserProfile, PlayerAccount, Stronghold, Card, BattleResult, Tournament, MarketTransaction, CraftingRecipe } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Player Account Queries
export function useGetMyPlayerAccount() {
  const { actor, isFetching } = useActor();

  return useQuery<PlayerAccount | null>({
    queryKey: ['myPlayerAccount'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyPlayerAccount();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePlayerAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createPlayerAccount(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPlayerAccount'] });
    },
  });
}

export function useUpdatePlayerAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ level, experience }: { level: bigint; experience: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePlayerAccount(level, experience);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPlayerAccount'] });
    },
  });
}

// Stronghold Queries
export function useGetMyStronghold() {
  const { actor, isFetching } = useActor();

  return useQuery<Stronghold | null>({
    queryKey: ['myStronghold'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyStronghold();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateStronghold() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.createStronghold();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myStronghold'] });
    },
  });
}

export function useUpgradeStronghold() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ level, upgrades }: { level: bigint; upgrades: string[] }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.upgradeStronghold(level, upgrades);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myStronghold'] });
    },
  });
}

// Card Queries
export function useGetMyCards() {
  const { actor, isFetching } = useActor();

  return useQuery<Card[]>({
    queryKey: ['myCards'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyCards();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCard() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, power, cardType }: { name: string; power: bigint; cardType: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createCard(name, power, cardType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCards'] });
    },
  });
}

// Battle Queries with memoization to prevent refetch loops
export function useGetAllBattleResults() {
  const { actor, isFetching } = useActor();

  const query = useQuery<BattleResult[]>({
    queryKey: ['battleResults'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllBattleResults();
    },
    enabled: !!actor && !isFetching,
    staleTime: 5000, // Cache for 5 seconds to prevent excessive refetching
  });

  // Memoize the data to prevent downstream re-renders
  const memoizedData = useMemo(() => query.data || [], [query.data]);

  return {
    ...query,
    data: memoizedData,
  };
}

export function useRecordBattle() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opponent, winner }: { opponent: Principal; winner: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      if (!identity) throw new Error('Identity not available');
      const player1 = identity.getPrincipal();
      return actor.recordBattle(player1, opponent, winner);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battleResults'] });
    },
  });
}

/**
 * Submit an AI battle result to the canister.
 * Records the battle on-chain and grants on-chain wallet rewards.
 * Falls back gracefully if the canister call fails (local rewards already granted).
 */
export function useSubmitAiBattleResult() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (victory: boolean) => {
      if (!actor) throw new Error('Actor not available');
      return actor.submitAiBattleResult(victory);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battleResults'] });
      queryClient.invalidateQueries({ queryKey: ['myPlayerAccount'] });
    },
  });
}

// Tournament Queries
export function useGetAllTournaments() {
  const { actor, isFetching } = useActor();

  return useQuery<Tournament[]>({
    queryKey: ['tournaments'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTournaments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useJoinTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.joinTournament(tournamentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

// Market Queries
export function useGetAllMarketListings() {
  const { actor, isFetching } = useActor();

  return useQuery<MarketTransaction[]>({
    queryKey: ['marketListings'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMarketListings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateMarketListing() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemType, itemId, price }: { itemType: string; itemId: bigint; price: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createMarketListing(itemType, itemId, price);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketListings'] });
    },
  });
}

export function useCompletePurchase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.completePurchase(transactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketListings'] });
      queryClient.invalidateQueries({ queryKey: ['myCards'] });
    },
  });
}

// Crafting Queries
export function useGetAllCraftingRecipes() {
  const { actor, isFetching } = useActor();

  return useQuery<CraftingRecipe[]>({
    queryKey: ['craftingRecipes'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCraftingRecipes();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCraftItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.craftItem(recipeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCards'] });
    },
  });
}
