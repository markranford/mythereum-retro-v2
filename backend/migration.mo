import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";

module {
  type OldActor = {
    userProfiles : OrderedMap.Map<Principal, { name : Text }>;
    playerAccounts : OrderedMap.Map<Nat, { owner : Principal; name : Text; level : Nat; experience : Nat }>;
    playerAccountsByPrincipal : OrderedMap.Map<Principal, Nat>;
    nextPlayerAccountId : Nat;
    softWallets : OrderedMap.Map<Principal, { owner : Principal; mythex : Nat; gold : Nat; stone : Nat; lumber : Nat; iron : Nat; food : Nat; mana : Nat }>;
    strongholds : OrderedMap.Map<Principal, { owner : Principal; level : Nat; upgrades : [Text]; assignedRaidDeckId : ?Nat; assignedDefenceDeckId : ?Nat }>;
    cards : OrderedMap.Map<Nat, { id : Nat; owner : Principal; name : Text; power : Nat; cardType : Text; level : ?Nat; xp : ?Nat; edition : ?Text; rarity : ?Text; cardClass : ?Text; tags : ?[Text]; forgeTier : ?Nat; nftEligible : ?Bool; lastForgedAt : ?Nat; marketLocked : ?Bool }>;
    cardsByOwner : OrderedMap.Map<Principal, [Nat]>;
    nextCardId : Nat;
    decks : OrderedMap.Map<Nat, { id : Nat; owner : Principal; name : Text; cardIds : [Nat]; power : Nat }>;
    decksByOwner : OrderedMap.Map<Principal, [Nat]>;
    nextDeckId : Nat;
    battleResults : OrderedMap.Map<Nat, { id : Nat; player1 : Principal; player2 : Principal; winner : Principal; timestamp : Nat }>;
    nextBattleId : Nat;
    tournaments : OrderedMap.Map<Nat, { id : Nat; name : Text; participants : [Principal]; rankings : [Principal]; isActive : Bool }>;
    nextTournamentId : Nat;
    marketTransactions : OrderedMap.Map<Nat, { id : Nat; seller : Principal; buyer : ?Principal; itemType : Text; itemId : Nat; price : Nat; isCompleted : Bool }>;
    nextTransactionId : Nat;
    craftingRecipes : OrderedMap.Map<Nat, { id : Nat; name : Text; materials : [Text]; resultItem : Text }>;
    nextRecipeId : Nat;
  };

  type NewActor = OldActor;

  public func run(old : OldActor) : NewActor {
    old;
  };
};
