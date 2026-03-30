import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Migration "migration";

(with migration = Migration.run)
persistent actor Main {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside assignRole
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type UserProfile = {
    name : Text;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  var userProfiles = principalMap.empty<UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // Storage for file/blob management
  let storage = Storage.new();
  include MixinStorage(storage);

  // Player account information (identity and progression only)
  public type PlayerAccount = {
    owner : Principal;
    name : Text;
    level : Nat;
    experience : Nat;
  };

  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);
  var playerAccounts = natMap.empty<PlayerAccount>();
  var playerAccountsByPrincipal = principalMap.empty<Nat>();
  var nextPlayerAccountId : Nat = 0;

  public shared ({ caller }) func createPlayerAccount(name : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create player accounts");
    };

    switch (principalMap.get(playerAccountsByPrincipal, caller)) {
      case (?_) { Debug.trap("Player account already exists for this user") };
      case null {
        let id = nextPlayerAccountId;
        nextPlayerAccountId += 1;

        let account : PlayerAccount = {
          owner = caller;
          name;
          level = 1;
          experience = 0;
        };

        playerAccounts := natMap.put(playerAccounts, id, account);
        playerAccountsByPrincipal := principalMap.put(playerAccountsByPrincipal, caller, id);

        // Initialize economy wallet with starter resources
        let wallet : SoftWallet = {
          owner = caller;
          mythex = 1000;
          gold = 200;
          stone = 200;
          lumber = 200;
          iron = 200;
          food = 200;
          mana = 0;
        };
        softWallets := principalMap.put(softWallets, caller, wallet);

        id;
      };
    };
  };

  public query ({ caller }) func getPlayerAccount(id : Nat) : async ?PlayerAccount {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view player accounts");
    };

    switch (natMap.get(playerAccounts, id)) {
      case (?account) {
        // Allow viewing own account or admin viewing any account
        if (account.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Can only view your own account");
        };
        ?account;
      };
      case null { null };
    };
  };

  public query ({ caller }) func getMyPlayerAccount() : async ?PlayerAccount {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their account");
    };

    switch (principalMap.get(playerAccountsByPrincipal, caller)) {
      case (?id) { natMap.get(playerAccounts, id) };
      case null { null };
    };
  };

  public shared ({ caller }) func updatePlayerAccount(level : Nat, experience : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update player accounts");
    };

    switch (principalMap.get(playerAccountsByPrincipal, caller)) {
      case (?id) {
        switch (natMap.get(playerAccounts, id)) {
          case (?account) {
            if (account.owner != caller) {
              Debug.trap("Unauthorized: Can only update your own account");
            };

            let updated : PlayerAccount = {
              owner = account.owner;
              name = account.name;
              level;
              experience;
            };
            playerAccounts := natMap.put(playerAccounts, id, updated);
          };
          case null { Debug.trap("Player account not found") };
        };
      };
      case null { Debug.trap("No player account for this user") };
    };
  };

  // Phase 9: Soft Economy (Mythex & Resources)
  public type SoftWallet = {
    owner : Principal;
    mythex : Nat;
    gold : Nat;
    stone : Nat;
    lumber : Nat;
    iron : Nat;
    food : Nat;
    mana : Nat;
  };

  var softWallets = principalMap.empty<SoftWallet>();

  public query ({ caller }) func getMySoftWallet() : async ?SoftWallet {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their wallet");
    };
    principalMap.get(softWallets, caller);
  };

  public query ({ caller }) func getSoftWallet(owner : Principal) : async ?SoftWallet {
    // SECURITY: Wallet balances are private financial information
    // Only allow viewing own wallet or admin viewing any wallet
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view wallets");
    };

    if (caller != owner and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own wallet");
    };

    principalMap.get(softWallets, owner);
  };

  public query ({ caller }) func getMythexBalance() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their balance");
    };

    switch (principalMap.get(softWallets, caller)) {
      case (?wallet) { wallet.mythex };
      case null { 0 };
    };
  };

  public shared ({ caller }) func earnMythex(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can earn Mythex");
    };

    if (amount == 0) {
      Debug.trap("Amount must be greater than zero");
    };

    switch (principalMap.get(softWallets, caller)) {
      case (?wallet) {
        let updated : SoftWallet = {
          owner = wallet.owner;
          mythex = wallet.mythex + amount;
          gold = wallet.gold;
          stone = wallet.stone;
          lumber = wallet.lumber;
          iron = wallet.iron;
          food = wallet.food;
          mana = wallet.mana;
        };
        softWallets := principalMap.put(softWallets, caller, updated);
      };
      case null { Debug.trap("Wallet not found") };
    };
  };

  public shared ({ caller }) func spendMythex(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can spend Mythex");
    };

    if (amount == 0) {
      Debug.trap("Amount must be greater than zero");
    };

    switch (principalMap.get(softWallets, caller)) {
      case (?wallet) {
        if (wallet.mythex < amount) {
          Debug.trap("Insufficient Mythex balance");
        };

        let updated : SoftWallet = {
          owner = wallet.owner;
          mythex = wallet.mythex - amount;
          gold = wallet.gold;
          stone = wallet.stone;
          lumber = wallet.lumber;
          iron = wallet.iron;
          food = wallet.food;
          mana = wallet.mana;
        };
        softWallets := principalMap.put(softWallets, caller, updated);
      };
      case null { Debug.trap("Wallet not found") };
    };
  };

  public shared ({ caller }) func earnResources(gold : Nat, stone : Nat, lumber : Nat, iron : Nat, food : Nat, mana : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can earn resources");
    };

    switch (principalMap.get(softWallets, caller)) {
      case (?wallet) {
        let updated : SoftWallet = {
          owner = wallet.owner;
          mythex = wallet.mythex;
          gold = wallet.gold + gold;
          stone = wallet.stone + stone;
          lumber = wallet.lumber + lumber;
          iron = wallet.iron + iron;
          food = wallet.food + food;
          mana = wallet.mana + mana;
        };
        softWallets := principalMap.put(softWallets, caller, updated);
      };
      case null { Debug.trap("Wallet not found") };
    };
  };

  public shared ({ caller }) func spendResources(gold : Nat, stone : Nat, lumber : Nat, iron : Nat, food : Nat, mana : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can spend resources");
    };

    switch (principalMap.get(softWallets, caller)) {
      case (?wallet) {
        if (wallet.gold < gold or wallet.stone < stone or wallet.lumber < lumber or 
            wallet.iron < iron or wallet.food < food or wallet.mana < mana) {
          Debug.trap("Insufficient resources");
        };

        let updated : SoftWallet = {
          owner = wallet.owner;
          mythex = wallet.mythex;
          gold = wallet.gold - gold;
          stone = wallet.stone - stone;
          lumber = wallet.lumber - lumber;
          iron = wallet.iron - iron;
          food = wallet.food - food;
          mana = wallet.mana - mana;
        };
        softWallets := principalMap.put(softWallets, caller, updated);
      };
      case null { Debug.trap("Wallet not found") };
    };
  };

  public shared ({ caller }) func grantBattleRewards(player : Principal, isWin : Bool) : async () {
    // Only admins (battle engine) can grant rewards
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only the battle engine can grant rewards");
    };

    switch (principalMap.get(softWallets, player)) {
      case (?wallet) {
        let mythexReward = if (isWin) { 50 } else { 10 };
        let resourceReward = if (isWin) { 25 } else { 5 };

        let updated : SoftWallet = {
          owner = wallet.owner;
          mythex = wallet.mythex + mythexReward;
          gold = wallet.gold + resourceReward;
          stone = wallet.stone + resourceReward;
          lumber = wallet.lumber + resourceReward;
          iron = wallet.iron + resourceReward;
          food = wallet.food + resourceReward;
          mana = wallet.mana;
        };
        softWallets := principalMap.put(softWallets, player, updated);
      };
      case null { Debug.trap("Player wallet not found") };
    };
  };

  public shared ({ caller }) func grantTournamentRewards(player : Principal, placement : Nat) : async () {
    // Only admins (tournament engine) can grant rewards
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only the tournament engine can grant rewards");
    };

    switch (principalMap.get(softWallets, player)) {
      case (?wallet) {
        let mythexReward = if (placement == 1) { 500 } else if (placement == 2) { 300 } else if (placement == 3) { 150 } else { 50 };
        let resourceReward = if (placement == 1) { 100 } else if (placement == 2) { 60 } else if (placement == 3) { 30 } else { 10 };

        let updated : SoftWallet = {
          owner = wallet.owner;
          mythex = wallet.mythex + mythexReward;
          gold = wallet.gold + resourceReward;
          stone = wallet.stone + resourceReward;
          lumber = wallet.lumber + resourceReward;
          iron = wallet.iron + resourceReward;
          food = wallet.food + resourceReward;
          mana = wallet.mana;
        };
        softWallets := principalMap.put(softWallets, player, updated);
      };
      case null { Debug.trap("Player wallet not found") };
    };
  };

  public shared ({ caller }) func collectStarterResources() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can collect starter resources");
    };

    switch (principalMap.get(softWallets, caller)) {
      case (?wallet) {
        let updated : SoftWallet = {
          owner = wallet.owner;
          mythex = wallet.mythex;
          gold = wallet.gold + 500;
          stone = wallet.stone + 500;
          lumber = wallet.lumber + 500;
          iron = wallet.iron + 500;
          food = wallet.food + 500;
          mana = wallet.mana + 100;
        };
        softWallets := principalMap.put(softWallets, caller, updated);
      };
      case null { Debug.trap("Wallet not found") };
    };
  };

  // Stronghold configurations and upgrades
  public type Stronghold = {
    owner : Principal;
    level : Nat;
    upgrades : [Text];
    assignedRaidDeckId : ?Nat;
    assignedDefenceDeckId : ?Nat;
  };

  var strongholds = principalMap.empty<Stronghold>();

  public shared ({ caller }) func createStronghold() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create strongholds");
    };

    switch (principalMap.get(strongholds, caller)) {
      case (?_) { Debug.trap("Stronghold already exists for this user") };
      case null {
        let stronghold : Stronghold = {
          owner = caller;
          level = 1;
          upgrades = [];
          assignedRaidDeckId = null;
          assignedDefenceDeckId = null;
        };
        strongholds := principalMap.put(strongholds, caller, stronghold);
      };
    };
  };

  public query ({ caller }) func getMyStronghold() : async ?Stronghold {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view strongholds");
    };
    principalMap.get(strongholds, caller);
  };

  public query ({ caller }) func getStronghold(owner : Principal) : async ?Stronghold {
    // SECURITY FIX: Stronghold data contains private strategic information
    // Only allow viewing own stronghold or admin viewing any stronghold
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view strongholds");
    };

    if (caller != owner and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own stronghold");
    };

    principalMap.get(strongholds, owner);
  };

  public shared ({ caller }) func upgradeStronghold(newLevel : Nat, newUpgrades : [Text]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can upgrade strongholds");
    };

    switch (principalMap.get(strongholds, caller)) {
      case (?stronghold) {
        let updated : Stronghold = {
          owner = stronghold.owner;
          level = newLevel;
          upgrades = newUpgrades;
          assignedRaidDeckId = stronghold.assignedRaidDeckId;
          assignedDefenceDeckId = stronghold.assignedDefenceDeckId;
        };
        strongholds := principalMap.put(strongholds, caller, updated);
      };
      case null { Debug.trap("No stronghold found for this user") };
    };
  };

  public shared ({ caller }) func assignRaidDeck(deckId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can assign raid decks");
    };

    // Verify caller owns the deck
    switch (natMap.get(decks, deckId)) {
      case (?deck) {
        if (deck.owner != caller) {
          Debug.trap("Unauthorized: You don't own this deck");
        };
      };
      case null { Debug.trap("Deck not found") };
    };

    switch (principalMap.get(strongholds, caller)) {
      case (?stronghold) {
        let updated : Stronghold = {
          owner = stronghold.owner;
          level = stronghold.level;
          upgrades = stronghold.upgrades;
          assignedRaidDeckId = ?deckId;
          assignedDefenceDeckId = stronghold.assignedDefenceDeckId;
        };
        strongholds := principalMap.put(strongholds, caller, updated);
      };
      case null { Debug.trap("No stronghold found for this user") };
    };
  };

  public shared ({ caller }) func assignDefenceDeck(deckId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can assign defence decks");
    };

    // Verify caller owns the deck
    switch (natMap.get(decks, deckId)) {
      case (?deck) {
        if (deck.owner != caller) {
          Debug.trap("Unauthorized: You don't own this deck");
        };
      };
      case null { Debug.trap("Deck not found") };
    };

    switch (principalMap.get(strongholds, caller)) {
      case (?stronghold) {
        let updated : Stronghold = {
          owner = stronghold.owner;
          level = stronghold.level;
          upgrades = stronghold.upgrades;
          assignedRaidDeckId = stronghold.assignedRaidDeckId;
          assignedDefenceDeckId = ?deckId;
        };
        strongholds := principalMap.put(strongholds, caller, updated);
      };
      case null { Debug.trap("No stronghold found for this user") };
    };
  };

  // Card collections and deck compositions
  public type Card = {
    id : Nat;
    owner : Principal;
    name : Text;
    power : Nat;
    cardType : Text;
    level : ?Nat;
    xp : ?Nat;
    edition : ?Text;
    rarity : ?Text;
    cardClass : ?Text;
    tags : ?[Text];
    forgeTier : ?Nat;
    nftEligible : ?Bool;
    lastForgedAt : ?Nat;
    marketLocked : ?Bool;
  };

  var cards = natMap.empty<Card>();
  var cardsByOwner = principalMap.empty<[Nat]>();
  var nextCardId : Nat = 0;

  public shared ({ caller }) func createCard(name : Text, power : Nat, cardType : Text) : async Nat {
    // Only admins can create cards directly (for game rewards, drops, etc.)
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can create cards");
    };

    let id = nextCardId;
    nextCardId += 1;

    let card : Card = {
      id;
      owner = caller;
      name;
      power;
      cardType;
      level = ?1;
      xp = ?0;
      edition = null;
      rarity = null;
      cardClass = null;
      tags = null;
      forgeTier = ?0;
      nftEligible = ?false;
      lastForgedAt = null;
      marketLocked = ?false;
    };

    cards := natMap.put(cards, id, card);

    let ownerCards = switch (principalMap.get(cardsByOwner, caller)) {
      case (?existing) { existing };
      case null { [] };
    };

    let updatedOwnerCards = Array.append(ownerCards, [id]);
    cardsByOwner := principalMap.put(cardsByOwner, caller, updatedOwnerCards);

    id;
  };

  public shared ({ caller }) func grantCardToPlayer(player : Principal, name : Text, power : Nat, cardType : Text) : async Nat {
    // Only admins can grant cards to players (for rewards, events, etc.)
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can grant cards");
    };

    let id = nextCardId;
    nextCardId += 1;

    let card : Card = {
      id;
      owner = player;
      name;
      power;
      cardType;
      level = ?1;
      xp = ?0;
      edition = null;
      rarity = null;
      cardClass = null;
      tags = null;
      forgeTier = ?0;
      nftEligible = ?false;
      lastForgedAt = null;
      marketLocked = ?false;
    };

    cards := natMap.put(cards, id, card);

    let ownerCards = switch (principalMap.get(cardsByOwner, player)) {
      case (?existing) { existing };
      case null { [] };
    };

    let updatedOwnerCards = Array.append(ownerCards, [id]);
    cardsByOwner := principalMap.put(cardsByOwner, player, updatedOwnerCards);

    id;
  };

  public query ({ caller }) func getCard(id : Nat) : async ?Card {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view cards");
    };

    switch (natMap.get(cards, id)) {
      case (?card) {
        // Allow viewing own cards or admin viewing any card
        if (card.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Can only view your own cards");
        };
        ?card;
      };
      case null { null };
    };
  };

  public query ({ caller }) func getMyCards() : async [Card] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their cards");
    };

    switch (principalMap.get(cardsByOwner, caller)) {
      case (?cardIds) {
        Array.mapFilter<Nat, Card>(cardIds, func(id) { natMap.get(cards, id) });
      };
      case null { [] };
    };
  };

  public query ({ caller }) func getPlayerCards(owner : Principal) : async [Card] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view card collections");
    };

    // Only allow viewing own collection or admin viewing any collection
    if (caller != owner and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own card collection");
    };

    switch (principalMap.get(cardsByOwner, owner)) {
      case (?cardIds) {
        Array.mapFilter<Nat, Card>(cardIds, func(id) { natMap.get(cards, id) });
      };
      case null { [] };
    };
  };

  public shared ({ caller }) func updateCard(
    cardId : Nat,
    level : ?Nat,
    xp : ?Nat,
    forgeTier : ?Nat,
    nftEligible : ?Bool,
    lastForgedAt : ?Nat,
    marketLocked : ?Bool
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update cards");
    };

    switch (natMap.get(cards, cardId)) {
      case (?card) {
        // Verify caller owns this card
        if (card.owner != caller) {
          Debug.trap("Unauthorized: You don't own this card");
        };

        let updated : Card = {
          id = card.id;
          owner = card.owner;
          name = card.name;
          power = card.power;
          cardType = card.cardType;
          level;
          xp;
          edition = card.edition;
          rarity = card.rarity;
          cardClass = card.cardClass;
          tags = card.tags;
          forgeTier;
          nftEligible;
          lastForgedAt;
          marketLocked;
        };

        cards := natMap.put(cards, cardId, updated);
      };
      case null { Debug.trap("Card not found") };
    };
  };

  public shared ({ caller }) func awardXpToCard(cardId : Nat, xpAmount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can award XP");
    };

    switch (natMap.get(cards, cardId)) {
      case (?card) {
        // Verify caller owns this card
        if (card.owner != caller) {
          Debug.trap("Unauthorized: You don't own this card");
        };

        let currentXp = Option.get(card.xp, 0);
        let currentLevel = Option.get(card.level, 1);
        let newXp = currentXp + xpAmount;
        let newLevel = Nat.min(50, 1 + (newXp / 100));

        let currentForgeTier = Option.get(card.forgeTier, 0);
        let newNftEligible = currentForgeTier >= 2 and newLevel >= 5;

        let updated : Card = {
          id = card.id;
          owner = card.owner;
          name = card.name;
          power = card.power;
          cardType = card.cardType;
          level = ?newLevel;
          xp = ?newXp;
          edition = card.edition;
          rarity = card.rarity;
          cardClass = card.cardClass;
          tags = card.tags;
          forgeTier = card.forgeTier;
          nftEligible = ?newNftEligible;
          lastForgedAt = card.lastForgedAt;
          marketLocked = card.marketLocked;
        };

        cards := natMap.put(cards, cardId, updated);
      };
      case null { Debug.trap("Card not found") };
    };
  };

  public shared ({ caller }) func forgeCards(targetCardId : Nat, sacrificeCardIds : [Nat]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can forge cards");
    };

    // Verify target card exists and is owned by caller
    let targetCard = switch (natMap.get(cards, targetCardId)) {
      case (?card) {
        if (card.owner != caller) {
          Debug.trap("Unauthorized: You don't own the target card");
        };
        if (Option.get(card.marketLocked, false)) {
          Debug.trap("Cannot forge: Target card is locked in market");
        };
        card;
      };
      case null { Debug.trap("Target card not found") };
    };

    // Verify all sacrifice cards exist, are owned by caller, and match target card
    for (sacrificeId in sacrificeCardIds.vals()) {
      switch (natMap.get(cards, sacrificeId)) {
        case (?card) {
          if (card.owner != caller) {
            Debug.trap("Unauthorized: You don't own sacrifice card " # Nat.toText(sacrificeId));
          };
          if (Option.get(card.marketLocked, false)) {
            Debug.trap("Cannot forge: Sacrifice card " # Nat.toText(sacrificeId) # " is locked in market");
          };
          if (card.name != targetCard.name) {
            Debug.trap("Cannot forge: Sacrifice card must match target card name");
          };
        };
        case null { Debug.trap("Sacrifice card not found: " # Nat.toText(sacrificeId)) };
      };
    };

    // Update target card: increment forgeTier, award XP
    let currentForgeTier = Option.get(targetCard.forgeTier, 0);
    let newForgeTier = Nat.min(3, currentForgeTier + 1);
    let currentXp = Option.get(targetCard.xp, 0);
    let newXp = currentXp + 150;
    let currentLevel = Option.get(targetCard.level, 1);
    let newLevel = Nat.min(50, 1 + (newXp / 100));
    let newNftEligible = newForgeTier >= 2 and newLevel >= 5;

    let updatedTarget : Card = {
      id = targetCard.id;
      owner = targetCard.owner;
      name = targetCard.name;
      power = targetCard.power;
      cardType = targetCard.cardType;
      level = ?newLevel;
      xp = ?newXp;
      edition = targetCard.edition;
      rarity = targetCard.rarity;
      cardClass = targetCard.cardClass;
      tags = targetCard.tags;
      forgeTier = ?newForgeTier;
      nftEligible = ?newNftEligible;
      lastForgedAt = ?0;
      marketLocked = targetCard.marketLocked;
    };

    cards := natMap.put(cards, targetCardId, updatedTarget);

    // Remove sacrifice cards
    for (sacrificeId in sacrificeCardIds.vals()) {
      cards := natMap.delete(cards, sacrificeId);
    };

    // Update owner's card list
    switch (principalMap.get(cardsByOwner, caller)) {
      case (?ownerCards) {
        let filteredCards = Array.filter<Nat>(ownerCards, func(id) {
          switch (Array.find<Nat>(sacrificeCardIds, func(sId) { sId == id })) {
            case (?_) { false };
            case null { true };
          };
        });
        cardsByOwner := principalMap.put(cardsByOwner, caller, filteredCards);
      };
      case null {};
    };
  };

  public shared ({ caller }) func removeCard(cardId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can remove cards");
    };

    switch (natMap.get(cards, cardId)) {
      case (?card) {
        // Verify caller owns this card
        if (card.owner != caller) {
          Debug.trap("Unauthorized: You don't own this card");
        };

        if (Option.get(card.marketLocked, false)) {
          Debug.trap("Cannot remove: Card is locked in market");
        };

        cards := natMap.delete(cards, cardId);

        // Update owner's card list
        switch (principalMap.get(cardsByOwner, caller)) {
          case (?ownerCards) {
            let filteredCards = Array.filter<Nat>(ownerCards, func(id) { id != cardId });
            cardsByOwner := principalMap.put(cardsByOwner, caller, filteredCards);
          };
          case null {};
        };
      };
      case null { Debug.trap("Card not found") };
    };
  };

  // Deck management
  public type Deck = {
    id : Nat;
    owner : Principal;
    name : Text;
    cardIds : [Nat];
    power : Nat;
  };

  var decks = natMap.empty<Deck>();
  var decksByOwner = principalMap.empty<[Nat]>();
  var nextDeckId : Nat = 0;

  public shared ({ caller }) func createDeck(name : Text, cardIds : [Nat]) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create decks");
    };

    // Verify caller owns all cards in the deck
    for (cardId in cardIds.vals()) {
      switch (natMap.get(cards, cardId)) {
        case (?card) {
          if (card.owner != caller) {
            Debug.trap("Unauthorized: You don't own all cards in this deck");
          };
        };
        case null { Debug.trap("Card not found: " # Nat.toText(cardId)) };
      };
    };

    let id = nextDeckId;
    nextDeckId += 1;

    let totalPower = Array.foldLeft<Nat, Nat>(cardIds, 0, func(acc, cardId) {
      switch (natMap.get(cards, cardId)) {
        case (?card) { acc + card.power };
        case null { acc };
      };
    });

    let deck : Deck = {
      id;
      owner = caller;
      name;
      cardIds;
      power = totalPower;
    };

    decks := natMap.put(decks, id, deck);

    let ownerDecks = switch (principalMap.get(decksByOwner, caller)) {
      case (?existing) { existing };
      case null { [] };
    };

    let updatedOwnerDecks = Array.append(ownerDecks, [id]);
    decksByOwner := principalMap.put(decksByOwner, caller, updatedOwnerDecks);

    id;
  };

  public shared ({ caller }) func updateDeck(deckId : Nat, name : Text, cardIds : [Nat]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update decks");
    };

    switch (natMap.get(decks, deckId)) {
      case (?deck) {
        // Verify caller owns the deck
        if (deck.owner != caller) {
          Debug.trap("Unauthorized: You don't own this deck");
        };

        // Verify caller owns all cards in the updated deck
        for (cardId in cardIds.vals()) {
          switch (natMap.get(cards, cardId)) {
            case (?card) {
              if (card.owner != caller) {
                Debug.trap("Unauthorized: You don't own all cards in this deck");
              };
            };
            case null { Debug.trap("Card not found: " # Nat.toText(cardId)) };
          };
        };

        let totalPower = Array.foldLeft<Nat, Nat>(cardIds, 0, func(acc, cardId) {
          switch (natMap.get(cards, cardId)) {
            case (?card) { acc + card.power };
            case null { acc };
          };
        });

        let updated : Deck = {
          id = deck.id;
          owner = deck.owner;
          name;
          cardIds;
          power = totalPower;
        };

        decks := natMap.put(decks, deckId, updated);
      };
      case null { Debug.trap("Deck not found") };
    };
  };

  public query ({ caller }) func getDeck(id : Nat) : async ?Deck {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view decks");
    };

    switch (natMap.get(decks, id)) {
      case (?deck) {
        // Allow viewing own decks or admin viewing any deck
        if (deck.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Can only view your own decks");
        };
        ?deck;
      };
      case null { null };
    };
  };

  public query ({ caller }) func getMyDecks() : async [Deck] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their decks");
    };

    switch (principalMap.get(decksByOwner, caller)) {
      case (?deckIds) {
        Array.mapFilter<Nat, Deck>(deckIds, func(id) { natMap.get(decks, id) });
      };
      case null { [] };
    };
  };

  public query ({ caller }) func getPlayerDecks(owner : Principal) : async [Deck] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view deck collections");
    };

    // Only allow viewing own decks or admin viewing any decks
    if (caller != owner and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own deck collection");
    };

    switch (principalMap.get(decksByOwner, owner)) {
      case (?deckIds) {
        Array.mapFilter<Nat, Deck>(deckIds, func(id) { natMap.get(decks, id) });
      };
      case null { [] };
    };
  };

  // Battle results and statistics
  public type BattleResult = {
    id : Nat;
    player1 : Principal;
    player2 : Principal;
    winner : Principal;
    timestamp : Nat;
  };

  var battleResults = natMap.empty<BattleResult>();
  var nextBattleId : Nat = 0;

  public shared ({ caller }) func recordBattle(player1 : Principal, player2 : Principal, winner : Principal) : async Nat {
    // Only admins can record battles (should be called by battle engine)
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only the battle engine (admin) can record battles");
    };

    // Verify winner is one of the participants
    if (winner != player1 and winner != player2) {
      Debug.trap("Invalid battle: Winner must be one of the participants");
    };

    let id = nextBattleId;
    nextBattleId += 1;

    let result : BattleResult = {
      id;
      player1;
      player2;
      winner;
      timestamp = 0;
    };

    battleResults := natMap.put(battleResults, id, result);
    id;
  };

  public query ({ caller }) func getBattleResult(id : Nat) : async ?BattleResult {
    // SECURITY: Battle results contain strategic information about player performance
    // Only allow viewing battles where caller participated or admin viewing any battle
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view battle results");
    };

    switch (natMap.get(battleResults, id)) {
      case (?result) {
        if (caller != result.player1 and caller != result.player2 and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Can only view battles you participated in");
        };
        ?result;
      };
      case null { null };
    };
  };

  public query ({ caller }) func getAllBattleResults() : async [BattleResult] {
    // SECURITY: Only allow viewing own battle history or admin viewing all
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view battle results");
    };

    let entries = natMap.entries(battleResults);
    let entriesArray = Iter.toArray(entries);
    let allResults = Array.map<(Nat, BattleResult), BattleResult>(entriesArray, func(entry) { entry.1 });

    if (AccessControl.isAdmin(accessControlState, caller)) {
      // Admins can see all battles
      allResults;
    } else {
      // Regular users can only see their own battles
      Array.filter<BattleResult>(allResults, func(result) {
        result.player1 == caller or result.player2 == caller;
      });
    };
  };

  // Tournament data and rankings
  public type Tournament = {
    id : Nat;
    name : Text;
    participants : [Principal];
    rankings : [Principal];
    isActive : Bool;
  };

  var tournaments = natMap.empty<Tournament>();
  var nextTournamentId : Nat = 0;

  public shared ({ caller }) func createTournament(name : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can create tournaments");
    };

    let id = nextTournamentId;
    nextTournamentId += 1;

    let tournament : Tournament = {
      id;
      name;
      participants = [];
      rankings = [];
      isActive = true;
    };

    tournaments := natMap.put(tournaments, id, tournament);
    id;
  };

  public shared ({ caller }) func joinTournament(tournamentId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can join tournaments");
    };

    switch (natMap.get(tournaments, tournamentId)) {
      case (?tournament) {
        if (not tournament.isActive) {
          Debug.trap("Tournament is not active");
        };

        // Check if already joined to prevent duplicates
        let alreadyJoined = Array.find<Principal>(tournament.participants, func(p) { p == caller });
        switch (alreadyJoined) {
          case (?_) { Debug.trap("Already joined this tournament") };
          case null {
            let updatedParticipants = Array.append(tournament.participants, [caller]);
            let updated : Tournament = {
              id = tournament.id;
              name = tournament.name;
              participants = updatedParticipants;
              rankings = tournament.rankings;
              isActive = tournament.isActive;
            };
            tournaments := natMap.put(tournaments, tournamentId, updated);
          };
        };
      };
      case null { Debug.trap("Tournament not found") };
    };
  };

  public query ({ caller }) func getTournament(id : Nat) : async ?Tournament {
    // Tournaments are public for viewing and participation
    // No authorization check needed - this is intentionally public for game mechanics
    natMap.get(tournaments, id);
  };

  public query ({ caller }) func getAllTournaments() : async [Tournament] {
    // Tournaments are public for browsing and participation
    // No authorization check needed - this is intentionally public for game mechanics
    let entries = natMap.entries(tournaments);
    let entriesArray = Iter.toArray(entries);
    Array.map<(Nat, Tournament), Tournament>(entriesArray, func(entry) { entry.1 });
  };

  public shared ({ caller }) func updateTournamentRankings(tournamentId : Nat, rankings : [Principal]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can update tournament rankings");
    };

    switch (natMap.get(tournaments, tournamentId)) {
      case (?tournament) {
        let updated : Tournament = {
          id = tournament.id;
          name = tournament.name;
          participants = tournament.participants;
          rankings;
          isActive = tournament.isActive;
        };
        tournaments := natMap.put(tournaments, tournamentId, updated);
      };
      case null { Debug.trap("Tournament not found") };
    };
  };

  // Market transactions and economy data
  public type MarketTransaction = {
    id : Nat;
    seller : Principal;
    buyer : ?Principal;
    itemType : Text;
    itemId : Nat;
    price : Nat;
    isCompleted : Bool;
  };

  var marketTransactions = natMap.empty<MarketTransaction>();
  var nextTransactionId : Nat = 0;

  public shared ({ caller }) func createMarketListing(itemType : Text, itemId : Nat, price : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create market listings");
    };

    // Verify ownership of the item being listed
    if (itemType == "card") {
      switch (natMap.get(cards, itemId)) {
        case (?card) {
          if (card.owner != caller) {
            Debug.trap("Unauthorized: You don't own this card");
          };
          if (Option.get(card.marketLocked, false)) {
            Debug.trap("Card is already listed in the market");
          };

          // Lock the card in the market
          let updated : Card = {
            id = card.id;
            owner = card.owner;
            name = card.name;
            power = card.power;
            cardType = card.cardType;
            level = card.level;
            xp = card.xp;
            edition = card.edition;
            rarity = card.rarity;
            cardClass = card.cardClass;
            tags = card.tags;
            forgeTier = card.forgeTier;
            nftEligible = card.nftEligible;
            lastForgedAt = card.lastForgedAt;
            marketLocked = ?true;
          };
          cards := natMap.put(cards, itemId, updated);
        };
        case null { Debug.trap("Card not found") };
      };
    } else {
      Debug.trap("Unsupported item type for market listing");
    };

    let id = nextTransactionId;
    nextTransactionId += 1;

    let transaction : MarketTransaction = {
      id;
      seller = caller;
      buyer = null;
      itemType;
      itemId;
      price;
      isCompleted = false;
    };

    marketTransactions := natMap.put(marketTransactions, id, transaction);
    id;
  };

  public shared ({ caller }) func cancelMarketListing(transactionId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can cancel listings");
    };

    switch (natMap.get(marketTransactions, transactionId)) {
      case (?transaction) {
        if (transaction.seller != caller) {
          Debug.trap("Unauthorized: You don't own this listing");
        };

        if (transaction.isCompleted) {
          Debug.trap("Cannot cancel completed transaction");
        };

        // Unlock the card
        if (transaction.itemType == "card") {
          switch (natMap.get(cards, transaction.itemId)) {
            case (?card) {
              let updated : Card = {
                id = card.id;
                owner = card.owner;
                name = card.name;
                power = card.power;
                cardType = card.cardType;
                level = card.level;
                xp = card.xp;
                edition = card.edition;
                rarity = card.rarity;
                cardClass = card.cardClass;
                tags = card.tags;
                forgeTier = card.forgeTier;
                nftEligible = card.nftEligible;
                lastForgedAt = card.lastForgedAt;
                marketLocked = ?false;
              };
              cards := natMap.put(cards, transaction.itemId, updated);
            };
            case null {};
          };
        };

        // Remove the transaction
        marketTransactions := natMap.delete(marketTransactions, transactionId);
      };
      case null { Debug.trap("Transaction not found") };
    };
  };

  public shared ({ caller }) func completePurchase(transactionId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can complete purchases");
    };

    switch (natMap.get(marketTransactions, transactionId)) {
      case (?transaction) {
        if (transaction.isCompleted) {
          Debug.trap("Transaction already completed");
        };

        if (transaction.seller == caller) {
          Debug.trap("Cannot buy your own listing");
        };

        // Verify buyer has sufficient Mythex
        switch (principalMap.get(softWallets, caller)) {
          case (?buyerWallet) {
            if (buyerWallet.mythex < transaction.price) {
              Debug.trap("Insufficient Mythex balance");
            };

            // Deduct from buyer
            let updatedBuyer : SoftWallet = {
              owner = buyerWallet.owner;
              mythex = buyerWallet.mythex - transaction.price;
              gold = buyerWallet.gold;
              stone = buyerWallet.stone;
              lumber = buyerWallet.lumber;
              iron = buyerWallet.iron;
              food = buyerWallet.food;
              mana = buyerWallet.mana;
            };
            softWallets := principalMap.put(softWallets, caller, updatedBuyer);

            // Add to seller
            switch (principalMap.get(softWallets, transaction.seller)) {
              case (?sellerWallet) {
                let updatedSeller : SoftWallet = {
                  owner = sellerWallet.owner;
                  mythex = sellerWallet.mythex + transaction.price;
                  gold = sellerWallet.gold;
                  stone = sellerWallet.stone;
                  lumber = sellerWallet.lumber;
                  iron = sellerWallet.iron;
                  food = sellerWallet.food;
                  mana = sellerWallet.mana;
                };
                softWallets := principalMap.put(softWallets, transaction.seller, updatedSeller);
              };
              case null { Debug.trap("Seller wallet not found") };
            };
          };
          case null { Debug.trap("Buyer wallet not found") };
        };

        // Transfer ownership of the item
        if (transaction.itemType == "card") {
          switch (natMap.get(cards, transaction.itemId)) {
            case (?card) {
              // Verify seller still owns the card
              if (card.owner != transaction.seller) {
                Debug.trap("Seller no longer owns this card");
              };

              // Update card ownership and unlock
              let updatedCard : Card = {
                id = card.id;
                owner = caller;
                name = card.name;
                power = card.power;
                cardType = card.cardType;
                level = card.level;
                xp = card.xp;
                edition = card.edition;
                rarity = card.rarity;
                cardClass = card.cardClass;
                tags = card.tags;
                forgeTier = card.forgeTier;
                nftEligible = card.nftEligible;
                lastForgedAt = card.lastForgedAt;
                marketLocked = ?false;
              };
              cards := natMap.put(cards, transaction.itemId, updatedCard);

              // Update seller's card list
              switch (principalMap.get(cardsByOwner, transaction.seller)) {
                case (?sellerCards) {
                  let filteredCards = Array.filter<Nat>(sellerCards, func(id) { id != transaction.itemId });
                  cardsByOwner := principalMap.put(cardsByOwner, transaction.seller, filteredCards);
                };
                case null {};
              };

              // Update buyer's card list
              let buyerCards = switch (principalMap.get(cardsByOwner, caller)) {
                case (?existing) { existing };
                case null { [] };
              };
              let updatedBuyerCards = Array.append(buyerCards, [transaction.itemId]);
              cardsByOwner := principalMap.put(cardsByOwner, caller, updatedBuyerCards);
            };
            case null { Debug.trap("Card not found") };
          };
        };

        let updated : MarketTransaction = {
          id = transaction.id;
          seller = transaction.seller;
          buyer = ?caller;
          itemType = transaction.itemType;
          itemId = transaction.itemId;
          price = transaction.price;
          isCompleted = true;
        };
        marketTransactions := natMap.put(marketTransactions, transactionId, updated);
      };
      case null { Debug.trap("Transaction not found") };
    };
  };

  public query ({ caller }) func getMarketListing(id : Nat) : async ?MarketTransaction {
    // Market listings are public for browsing
    // No authorization check needed - this is intentionally public for marketplace functionality
    natMap.get(marketTransactions, id);
  };

  public query ({ caller }) func getAllMarketListings() : async [MarketTransaction] {
    // Market listings are public for browsing
    // No authorization check needed - this is intentionally public for marketplace functionality
    let entries = natMap.entries(marketTransactions);
    let entriesArray = Iter.toArray(entries);
    Array.map<(Nat, MarketTransaction), MarketTransaction>(entriesArray, func(entry) { entry.1 });
  };

  public query ({ caller }) func getMyMarketListings() : async [MarketTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their listings");
    };

    let entries = natMap.entries(marketTransactions);
    let entriesArray = Iter.toArray(entries);
    let allTransactions = Array.map<(Nat, MarketTransaction), MarketTransaction>(entriesArray, func(entry) { entry.1 });
    Array.filter<MarketTransaction>(allTransactions, func(t) { t.seller == caller and not t.isCompleted });
  };

  // Crafting recipes and forge operations
  public type CraftingRecipe = {
    id : Nat;
    name : Text;
    materials : [Text];
    resultItem : Text;
  };

  var craftingRecipes = natMap.empty<CraftingRecipe>();
  var nextRecipeId : Nat = 0;

  public shared ({ caller }) func createCraftingRecipe(name : Text, materials : [Text], resultItem : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can create crafting recipes");
    };

    let id = nextRecipeId;
    nextRecipeId += 1;

    let recipe : CraftingRecipe = {
      id;
      name;
      materials;
      resultItem;
    };

    craftingRecipes := natMap.put(craftingRecipes, id, recipe);
    id;
  };

  public query ({ caller }) func getCraftingRecipe(id : Nat) : async ?CraftingRecipe {
    // Recipes are public knowledge for all players
    // No authorization check needed - this is intentionally public for game mechanics
    natMap.get(craftingRecipes, id);
  };

  public query ({ caller }) func getAllCraftingRecipes() : async [CraftingRecipe] {
    // Recipes are public for all players to view
    // No authorization check needed - this is intentionally public for game mechanics
    let entries = natMap.entries(craftingRecipes);
    let entriesArray = Iter.toArray(entries);
    Array.map<(Nat, CraftingRecipe), CraftingRecipe>(entriesArray, func(entry) { entry.1 });
  };

  public shared ({ caller }) func craftItem(recipeId : Nat) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can craft items");
    };

    // SECURITY: This function is intentionally disabled until proper inventory
    // and material verification is implemented. Allowing crafting without
    // verifying and consuming materials would be a critical exploit.
    Debug.trap("Crafting system not yet implemented - requires inventory and material verification");
  };
};

