import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
}
export interface Card {
    id: bigint;
    xp?: bigint;
    nftEligible?: boolean;
    edition?: string;
    owner: Principal;
    cardType: string;
    name: string;
    tags?: Array<string>;
    lastForgedAt?: bigint;
    level?: bigint;
    marketLocked?: boolean;
    cardClass?: string;
    rarity?: string;
    power: bigint;
    forgeTier?: bigint;
}
export interface Tournament {
    id: bigint;
    participants: Array<Principal>;
    rankings: Array<Principal>;
    name: string;
    isActive: boolean;
}
export interface BattleResult {
    id: bigint;
    winner: Principal;
    player1: Principal;
    player2: Principal;
    timestamp: bigint;
}
export interface MarketTransaction {
    id: bigint;
    itemId: bigint;
    isCompleted: boolean;
    seller: Principal;
    itemType: string;
    buyer?: Principal;
    price: bigint;
}
export interface PlayerAccount {
    owner: Principal;
    name: string;
    level: bigint;
    experience: bigint;
}
export interface Stronghold {
    assignedDefenceDeckId?: bigint;
    owner: Principal;
    upgrades: Array<string>;
    level: bigint;
    assignedRaidDeckId?: bigint;
}
export interface Deck {
    id: bigint;
    owner: Principal;
    name: string;
    cardIds: Array<bigint>;
    power: bigint;
}
export interface SoftWallet {
    owner: Principal;
    food: bigint;
    gold: bigint;
    iron: bigint;
    mana: bigint;
    stone: bigint;
    mythex: bigint;
    lumber: bigint;
}
export interface CraftingRecipe {
    id: bigint;
    name: string;
    materials: Array<string>;
    resultItem: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignDefenceDeck(deckId: bigint): Promise<void>;
    assignRaidDeck(deckId: bigint): Promise<void>;
    awardXpToCard(cardId: bigint, xpAmount: bigint): Promise<void>;
    cancelMarketListing(transactionId: bigint): Promise<void>;
    collectStarterResources(): Promise<void>;
    completePurchase(transactionId: bigint): Promise<void>;
    craftItem(recipeId: bigint): Promise<string>;
    createCard(name: string, power: bigint, cardType: string): Promise<bigint>;
    createCraftingRecipe(name: string, materials: Array<string>, resultItem: string): Promise<bigint>;
    createDeck(name: string, cardIds: Array<bigint>): Promise<bigint>;
    createMarketListing(itemType: string, itemId: bigint, price: bigint): Promise<bigint>;
    createPlayerAccount(name: string): Promise<bigint>;
    createStronghold(): Promise<void>;
    createTournament(name: string): Promise<bigint>;
    earnMythex(amount: bigint): Promise<void>;
    earnResources(gold: bigint, stone: bigint, lumber: bigint, iron: bigint, food: bigint, mana: bigint): Promise<void>;
    forgeCards(targetCardId: bigint, sacrificeCardIds: Array<bigint>): Promise<void>;
    getAllBattleResults(): Promise<Array<BattleResult>>;
    getAllCraftingRecipes(): Promise<Array<CraftingRecipe>>;
    getAllMarketListings(): Promise<Array<MarketTransaction>>;
    getAllTournaments(): Promise<Array<Tournament>>;
    getBattleResult(id: bigint): Promise<BattleResult | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCard(id: bigint): Promise<Card | null>;
    getCraftingRecipe(id: bigint): Promise<CraftingRecipe | null>;
    getDeck(id: bigint): Promise<Deck | null>;
    getMarketListing(id: bigint): Promise<MarketTransaction | null>;
    getMyCards(): Promise<Array<Card>>;
    getMyDecks(): Promise<Array<Deck>>;
    getMyMarketListings(): Promise<Array<MarketTransaction>>;
    getMyPlayerAccount(): Promise<PlayerAccount | null>;
    getMySoftWallet(): Promise<SoftWallet | null>;
    getMyStronghold(): Promise<Stronghold | null>;
    getMythexBalance(): Promise<bigint>;
    getPlayerAccount(id: bigint): Promise<PlayerAccount | null>;
    getPlayerCards(owner: Principal): Promise<Array<Card>>;
    getPlayerDecks(owner: Principal): Promise<Array<Deck>>;
    getSoftWallet(owner: Principal): Promise<SoftWallet | null>;
    getStronghold(owner: Principal): Promise<Stronghold | null>;
    getTournament(id: bigint): Promise<Tournament | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    grantBattleRewards(player: Principal, isWin: boolean): Promise<void>;
    grantCardToPlayer(player: Principal, name: string, power: bigint, cardType: string): Promise<bigint>;
    grantTournamentRewards(player: Principal, placement: bigint): Promise<void>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    joinTournament(tournamentId: bigint): Promise<void>;
    recordBattle(player1: Principal, player2: Principal, winner: Principal): Promise<bigint>;
    removeCard(cardId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    spendMythex(amount: bigint): Promise<void>;
    spendResources(gold: bigint, stone: bigint, lumber: bigint, iron: bigint, food: bigint, mana: bigint): Promise<void>;
    updateCard(cardId: bigint, level: bigint | null, xp: bigint | null, forgeTier: bigint | null, nftEligible: boolean | null, lastForgedAt: bigint | null, marketLocked: boolean | null): Promise<void>;
    updateDeck(deckId: bigint, name: string, cardIds: Array<bigint>): Promise<void>;
    updatePlayerAccount(level: bigint, experience: bigint): Promise<void>;
    updateTournamentRankings(tournamentId: bigint, rankings: Array<Principal>): Promise<void>;
    upgradeStronghold(newLevel: bigint, newUpgrades: Array<string>): Promise<void>;
}
