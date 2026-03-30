# Architecture Overview: Mythereum Retro V2

## System Architecture

Mythereum Retro V2 is a strategic card battle game built on the Internet Computer Protocol (ICP). Players collect heroes, build strongholds, form decks ("bands"), and compete in PvE battles and tournaments.

```
+-----------------------------------------------------+
|                     Frontend (React)                 |
|  Pages: Home, Strongholds, Heroes, Battlegrounds,   |
|         Tournaments, Market, Forge, Profile          |
+-----------------------------------------------------+
|              Context Layer (State Management)         |
|  Account | Economy | Heroes | Stronghold | Progress  |
|  Market  | Telemetry | Balancer | Tournaments        |
+-----------------------------------------------------+
|              Hooks Layer (IC Integration)             |
|  useActor | useInternetIdentity | useQueries         |
+-----------------------------------------------------+
|              ICP Backend (Motoko Canister)            |
|  User profiles, battle results, cards, tournaments   |
+-----------------------------------------------------+
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Styling | TailwindCSS + Shadcn/ui |
| State | React Context (local) + React Query (canister) |
| Auth | Internet Identity (passkeys) |
| Backend | ICP Motoko canister |
| Build | Vite + Caffeine AI deployment |

## Frontend Source Structure

```
frontend/src/
  App.tsx                    # Root component, provider tree, routing
  main.tsx                   # Entry point, React Query + II setup
  config.ts                  # Canister IDs, environment config

  context/                   # Application state (9 contexts)
    AccountContext.tsx        # Guest/II account identity
    EconomyContext.tsx        # Mythex currency + resources wallet
    HeroesContext.tsx         # Hero collection + deck management
    StrongholdContext.tsx     # Base building + production + raids
    ProgressContext.tsx       # Layer unlock progression
    TelemetryContext.tsx      # Card win/loss tracking for balancer
    BalancerContext.tsx       # Dynamic mana cost adjustments
    MarketContext.tsx         # NPC shop + player listings
    TournamentsContext.tsx    # Tournament lifecycle

  pages/                     # Route-level components (10 pages)
    HomePage.tsx             # Welcome + quick-start cards
    StrongholdsPage.tsx      # HQ, Production, Commerce, War Room, Alliances
    HeroesPage.tsx           # Deck Manager (explorer, active deck, collection)
    BattlegroundsPage.tsx    # Battle lobby + active battle host
    TournamentsPage.tsx      # Tournament registration + brackets
    MarketPage.tsx           # NPC Guild Market + player listings
    ForgePage.tsx            # Fusion + Refinement
    ProfilePage.tsx          # Player stats + achievements
    ProfileSettingsPage.tsx  # Account settings
    AdminBalancerLabPage.tsx # Dev-only card balance tuning

  components/
    battle/
      GameBoard.tsx          # Battle UI: 3-column layout, turn controls
      BattleLog.tsx          # Scrolling combat log
    heroes/
      DeckExplorer.tsx       # Deck sidebar list
      ActiveDeckPane.tsx     # Current deck stats + card list
      MyCollectionPane.tsx   # Filterable card grid
      GameCard.tsx           # Individual card render
    strongholds/
      StrongholdMap.tsx      # Hex grid map
      HexTile.tsx            # Individual hex tile
      BuildingCard.tsx       # Building info card
      ResourceBar.tsx        # Top resource display
    tournaments/
      TournamentCard.tsx     # Tournament preview card
      TournamentDetail.tsx   # Full bracket view
    forge/
      FusePanel.tsx          # Card fusion UI
      RefinePanel.tsx        # XP refinement UI
    LayerGate.tsx            # Feature unlock gating
    Layout.tsx               # Nav bar + page wrapper
    ProgressSync.tsx         # Syncs hero count to progression
    WalletSummary.tsx        # Economy display widget

  hooks/
    useActor.ts              # ICP canister actor factory
    useInternetIdentity.ts   # II auth state + login/logout
    useQueries.ts            # React Query wrappers for all canister calls

  lib/
    battleUtils.ts           # Pure battle logic (no React)
    balancerEngine.ts        # Card balance recommendation engine
    mockData.ts              # CARD_LIBRARY static data
    strongholdMockData.ts    # Building templates, NPC raids, alliances
    hexMath.ts               # Hex grid coordinate math

  types/                     # TypeScript interfaces
    account.ts               # PlayerAccount, OnboardingFlags
    battle.ts                # BattleCard, BattleDeck, Battle
    economy.ts               # SoftWallet, ResourceAmount, HeroListing
    game.ts                  # CardData, TimerOption
    heroes.ts                # OwnedHeroCard, Deck, DeckWithPower
    progression.ts           # PlayerProgress, GameLayer
    balancer.ts              # TelemetrySummary, BalanceEngineParams
    strongholds.ts           # Stronghold, BuildingInstance, Resources
    tournaments.ts           # Tournament, TournamentMatch
```

## Context Provider Tree

Contexts are nested in a specific order due to dependencies:

```
AccountProvider              # No dependencies
  EconomyProvider            # Depends on: Account
    ProgressProvider         # Depends on: Account
      StrongholdProvider     # Depends on: Economy
        HeroesProvider       # Depends on: Account
          MarketProvider     # Depends on: Heroes, Economy
            TournamentsProvider  # Depends on: Heroes, Economy
              TelemetryProvider  # Depends on: Heroes
                BalancerProvider # Depends on: Telemetry
                  AppContent     # All contexts available
                  ProgressSync   # Syncs Heroes -> Progress
```

### Context Stability Pattern

All context providers follow these rules to prevent infinite render loops:

1. **Provider values are memoized** with `useMemo` to prevent unnecessary consumer re-renders
2. **Mutation callbacks use `[]` deps** by accessing state through refs (`strongholdRef.current`) or functional state updates (`setProgress(prev => ...)`)
3. **Read-only callbacks may depend on state** (e.g., `canAffordMythex` depends on `wallet`) since they should change when data changes
4. **No cross-context writes** in effects -- contexts communicate via the component tree

## Battle System Architecture

### Flow

```
Player selects deck
  -> BattlegroundsPage snapshots heroes (deep clone)
  -> Creates BattleTab with snapshot + timer config
  -> Renders GameBoard with isolated props

GameBoard mounts
  -> buildBattleDeck(playerDeck)     # Player deck from snapshot
  -> buildAiDeck(size, power)        # Random AI deck from CARD_LIBRARY
  -> initializeBattle(deck1, deck2)  # Deep-cloned initial state

Each turn (manual click or timer):
  -> simulateBattleRound(battle)     # Pure function, returns new state
     Phase 1: Deck1 random card attacks Deck2 random card
     Phase 2: Deck2 surviving cards counterattack Deck1
  -> Check victory (all cards on one side destroyed)
  -> If complete: fire onBattleEnd exactly once (ref guard)

Battle completion:
  -> Award XP to player's heroes
  -> Grant Mythex + resources
  -> Record telemetry (card win/loss stats)
  -> Register battle result in progression
  -> Move tab to "finished" after 2s delay
```

### Key Design Decisions

- **Pure battle logic**: `battleUtils.ts` has zero React imports. All functions are pure (same input = same output) and return deep-cloned state.
- **Snapshot isolation**: Heroes are deep-cloned at battle creation. Live hero changes (XP, forge) don't affect in-progress battles.
- **Exactly-once completion**: `battleEndedRef` + `battleCompletionGuardRef` ensure rewards fire once per battle.
- **Bidirectional combat**: Both decks attack each round. Deck1 attacks first, then Deck2 counterattacks with surviving cards.

### Combat Math

```
damage = max(1, attacker.attack - floor(defender.defense / 2))
```

- Minimum 1 damage guarantees battles always terminate
- Defense provides 50% mitigation
- Card destroyed when `currentDefense <= 0`
- Victory when all opponent cards have `currentDefense <= 0`

## Economy System

| Currency | Source | Use |
|----------|--------|-----|
| Mythex (soft) | Battles, tournaments | Market purchases, tournament entry |
| Gold/Stone/Lumber/Iron/Food | Stronghold production, battles | Building upgrades, NPC trades |
| Mana | Stronghold (Mana Well) | Future: card casting costs |
| XP | Battles | Hero leveling (100 XP per level, max 50) |

## Layer Progression

Features unlock in layers (currently all unlocked by default):

| Layer | Feature | Requirements |
|-------|---------|-------------|
| 1 | Strongholds | Default unlocked |
| 2 | Heroes & Bands | Default unlocked |
| 3 | Battlegrounds | Default unlocked |
| 4 | Tournaments | Default unlocked |

## Data Persistence

- **Local state**: All context data persists to `localStorage` with debounced writes (300ms)
- **Canister state**: Battle results, user profiles, cards stored on ICP canister
- **Key prefixes**: `retro-mythereum-heroes-`, `retro-mythereum-economy-v1`, etc.

## ICP Integration

The backend Motoko canister provides:
- `getCallerUserProfile()` / `saveCallerUserProfile()` -- Identity-linked profiles
- `getAllBattleResults()` / `recordBattle()` -- On-chain battle history
- `getAllTournaments()` / `joinTournament()` -- Tournament management
- `getMyCards()` / `createCard()` -- NFT-ready card storage
- `getAllMarketListings()` / `completePurchase()` -- Decentralized market

Auth uses Internet Identity for passwordless login via passkeys.
