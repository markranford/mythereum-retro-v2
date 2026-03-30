# Mythereum Retro V2

## Overview
Mythereum Retro V2 is a retro-themed card battle game application that provides a comprehensive gaming experience with multiple interconnected systems for player progression, battles, and economy.

## Core Features

### Navigation Structure
The application features a top navigation bar with the following sections:
- Home - Main dashboard and game overview
- Strongholds - Player base management and upgrades
- Heroes - Character collection and management
- Battlegrounds - Combat arena for battles
- Tournaments - Competitive events and rankings
- Market - Trading and purchasing system
- Forge - Card crafting and enhancement
- Profile - Player statistics and settings
- Notifications - Game alerts and updates
- Admin - Developer-only administrative tools including Balancer Lab

### Phase 1: Strongholds Layer 1 Implementation

#### Domain Model
The application includes comprehensive type definitions for the strongholds system:
- Resource types (Gold, Stone, Lumber, Iron, Food, Mana)
- Building templates with upgrade costs and production rates
- Alliance system with member management
- Activity logs for tracking stronghold events
- Complete Stronghold entity with all properties
- Spatial awareness system with ZoneType enumeration (keep, citadel, bailey, wilds)
- Building positioning with positionIndex and allowedZones for placement restrictions
- BuildingInstance includes positionIndex property for hex map placement

#### Stronghold Data and Templates
The system provides predefined templates and data:
- Building templates for 8 core buildings: Gold Mine, Stone Quarry, Lumber Yard, Iron Mine, Farmstead, Watchtower, Barracks, Town Hall, AlchemistLab
- AlchemistLab (category: alchemy) replaces MagickMine for distilling raw resources into Mana and research
- Building templates include spatial constraints with allowedZones for each building type
- Default alliance configurations with 3 example alliances
- NPC raid targets for combat interactions
- Starter stronghold factory function that creates new strongholds with level 1 economy and civic buildings, 200 basic resources, and proper initialization with spatial positioning

#### Unified Zoned Citadel Layout
The stronghold features a spatial layout system:
- 37 hexagonal positions arranged in concentric rings with radii [0, 120, 240, 360] pixels
- Four distinct zones: keep (center), citadel (inner ring), bailey (middle ring), wilds (outer ring)
- Geometric helper functions for position calculation and zone mapping with getPosition function returning left, top coordinates and zone type
- Building placement restrictions based on zone types and building requirements
- Immersive top-down fortress view with medieval fantasy fortress background image overlay beneath the hex grid
- Hex transparency preserved with golden-glow aesthetics maintained

#### State Management System
The strongholds feature includes persistent state management:
- Local storage persistence using key `retro-mythereum-stronghold-v1`
- Automatic tick system for resource production based on elapsed time and building levels
- Building upgrade management with start and completion tracking
- Building placement and relocation system with spatial validation
- Commerce system with NPC trading using RNG mechanics
- War Room functionality for launching raids against NPC targets
- Alliance management including join, leave, and creation operations
- Periodic tick intervals running approximately every 30 seconds
- Soft Mythex currency management with balance tracking and transaction functions

#### Strongholds User Interface
The Strongholds page handles two distinct states:
- **No Stronghold State**: Displays stronghold creation interface
- **Active Stronghold State**: Tabbed interface with five sections:
  - **HQ Tab**: Shows population, buildings overview, upgrade buttons, and manual tick trigger
  - **Production Tab**: Features interactive hex map (800x800px) with Unified Zoned Citadel layout, visual building placement, construction modes (view, build, manage, move), and building interaction modals
  - **Commerce Tab**: Shows mock NPC trade offers and transaction history
  - **War Room Tab**: Lists available NPC raid targets and battle result logs
  - **Alliances Tab**: Shows available alliances with join/leave functionality

#### Stronghold Components
The system includes specialized UI components:
- Resource bar component displaying current resource balances with appropriate icons including Mana
- Building card component showing individual building information, current level, upgrade status, and upgrade controls
- HexTile component with CSS clip-path polygon styling, displaying building icons, names, level badges, and interactive states with zone-based styling
- StrongholdMap component as main spatial interface with medieval fantasy fortress background overlay beneath hex grid, absolute positioning for 37 hex tiles, and interaction modes (normal, build, manage, move)
- Hex tile hover and selection effects with state-based styling for occupied, move-target, and empty positions
- BuildModal for zone-filtered building selection during build mode
- BuildingDetailModal for upgrades and move options during manage mode

#### Home Page Integration
The Home page dynamically updates its main call-to-action based on stronghold state:
- If stronghold exists: "Enter Stronghold" button
- If no stronghold: "Start as Warlord" button
- Both buttons navigate to the strongholds page

### Phase 2: Heroes and Decks (Bands) Integration

#### Extended Card System
The core card data includes optional fields for progression and classification:
- Level and experience points for card advancement
- Edition and rarity classifications
- Class and tag categorization for filtering and gameplay mechanics
- Expanded card library with comprehensive hero collection across all 5 classes (Warrior, Mage, Ranger, Healer, Rogue)
- Balanced attack, defense, mana, and magick stats for all cards following original Mythereum v0.8 specifications
- Enhanced MyCollection with variety across classes, balanced power levels, mana costs, and rarity distributions

#### Hero Collection Management
The heroes system provides comprehensive card collection features:
- Owned hero cards with individual progression tracking
- Deck creation and management with power calculations
- Hero source tracking for acquisition methods
- Deck role assignments for different gameplay scenarios
- Enhanced initial hero collection with expanded canonical card library featuring diverse classes and balanced stats

#### Heroes Context and State Management
The heroes feature includes persistent state management:
- Local storage persistence using key `retro-mythereum-heroes-v1`
- Automatic starter collection generation from expanded canonical card library
- Deck creation, editing, and card assignment functionality
- Power calculation system for deck effectiveness ratings
- getDeckById function exposed for battle system integration
- getDeckWithHeroIdsById function returning full deck with power and heroIds array
- getCardIdByOwnedHeroId helper function for telemetry integration

#### Heroes User Interface
The Heroes page provides comprehensive collection management:
- Grid display of owned hero cards with visual representation
- Filtering system by Edition, Rarity, Class, and Level range
- Right sidebar for deck management including creation, editing, and card assignment
- Toggle functionality for adding and removing cards from decks
- Automatic starter setup for new players with expanded card collection

#### Stronghold-Heroes Integration
The stronghold system integrates with hero decks for enhanced combat:
- Raid deck assignment for offensive operations
- Defence deck assignment for stronghold protection
- Enhanced raid power calculation incorporating deck strength
- Deck power contributes to effective combat power using formula: effectivePower = stronghold.level + totalMilitaryBuildingLevels + Math.floor((raidDeckPower ?? 0) / 40)
- Win chance calculation: winChance = clamp(0.2, 0.9, effectivePower / (effectivePower + target.threatLevel))

#### Updated War Room Interface
The War Room tab in Strongholds includes deck integration:
- Raid Band dropdown selector for choosing offensive deck
- Defence Band selector for stronghold protection
- Selected deck summary display with power ratings
- Deck selection persistence across sessions
- Enhanced raid logging with deck information

### Phase 3: Battlegrounds & Tactical Battles MVP - Fully Stabilized Event-Driven Architecture

#### Battle System Domain Model
The battle system extends the core game types with:
- MagickCost interface for spell and ability costs
- TimerOption enumeration for turn timing mechanics
- Optional battle-related fields in existing card definitions
- Enhanced BattleCard interface with comprehensive documentation for id (string|number), attack, defense, hp, and other battle-specific fields with clarified semantics
- BattlePlayerState tracking health, mana, hand, and battlefield
- BattleState managing complete battle session data with proper type aliasing and comprehensive documentation
- Improved BattleDeck interface with refined semantics for live combatants and future field documentation
- BattleInstance interface for lobby management with battle ID, participants, status, and configuration

#### Card Library Enhancement
The card library includes complete battle statistics:
- Attack and defense values for all cards
- Mana cost requirements for card deployment
- Magick requirements for special abilities
- Export of CARD_LIBRARY for battle system access
- Expanded card library with comprehensive hero collection across all 5 classes

#### Battle Utilities and Logic - Fully Deterministic Implementation
The battle system provides comprehensive combat mechanics with fully deterministic, pure operations:
- Pure functions with no React imports, hooks, or state mutation
- Deep copy state mutations instead of shallow copying to prevent React state corruption
- Refactored buildBattleDeck function that properly populates attack, defense, and hp from card data with deep copying
- Accurate totalPower recomputation from attack plus defense values
- Pure, deep-copy variant of simulateBattleRound using logical attack versus defense-based combat resolution
- Logical battle ending when all cards on one side are defeated with damage exchanges recorded in lastEvent
- Deck building and validation utilities with proper state immutability
- Card shuffling and draw mechanics with deep state copying
- HP calculation based on deck composition using formula: HP = clamp(100, 250, deckPower * 2.5)
- Mana and magick regeneration systems with proper turn-based progression
- Turn structure implementation with draw, upkeep, mana replenishment, and combat resolution phases
- Leader/hand/reserve mechanics with deterministic draw order and proper reinitialization at battle start
- Magick gating system enforcing manaRequirement and 4-color magick costs
- Combat resolution with attack minus defense damage calculation
- Helper functions for combat resolution including resolveCombat and computeDeckHP
- Time distortion flag implementation for UI visual effects when timer < 5 seconds
- Accurate mana/magick system with cost checks and recharge per turn
- Distinct turn phases (mana restore, leader act, combat resolution, upkeep)
- Authentic v0.8 pacing with clearer visual feedback (logs, animations, and timers)

#### Fully Stabilized Lobby System - Race-Free Implementation
The battlegrounds feature includes comprehensive lobby management with race-free state updates:
- Rich lobby interface with title banner and create-battle button
- Tabbed navigation system: Waiting, Ongoing, Finished, and dynamic "Battle #ID" tabs
- Create Battle dialog with deck selection (minimum 7 cards), timer selection, and AI/PvP toggle
- Battle list population with safe, guarded rendering
- Local practice battle support for offline mode with direct GameBoard mounting
- Tab-based flow replacing simple boolean state for displaying GameBoard instances
- Race-free useEffect patterns with controlled dependencies for data refresh
- Memoized handler functions using useCallback to prevent recursive re-renders
- Memoized derived data using useMemo to stop continuous render-triggering updates
- Guarded state setters that verify state values before calling setters
- Battle creation guard using useRef to prevent multiple battle creation calls
- Stable battle auto-refresh using single setInterval with proper cleanup
- Isolated battle state management preventing cross-context contamination

#### Fully Stabilized Event-Driven GameBoard Component - Complete Architectural Refactor
The battle interface features a completely refactored GameBoard component with fully stabilized, event-driven architecture:
- **Single Mount-Only Initialization Effect**: One clean useEffect with empty dependency array `[]` for battle setup (deck initialization, health calculation, magick setup, and timer configuration) that runs only on component mount with no recursive dependencies or state-dependent re-runs
- **Isolated Timer Management**: Timer loop managed via useRef with setInterval, including proper cleanup on component unmount, ensuring no recursive state updates or cross-context interference with timer events handled through pure event handlers
- **Pure Event Handlers**: All battle actions consolidated into pure event handlers (handleEndTurn, performAITurn, performAttack, handlePlayCard, handleUseAbility) with no internal useEffects triggering on derived state changes or context updates
- **Complete State Isolation**: No useEffects running on battle, player, or opponent state that immediately call setState on those same values, preventing recursive render loops and context interference
- **Single Battle End Invocation**: onBattleEnd callback invoked only once after victory/defeat detection via explicit checkGameOver logic within event handlers, not in any looping effect or context update
- **Full Context Isolation**: GameBoard component operates independently from external contexts, receiving all necessary data through props with no direct context subscriptions during battle operations
- **Preserved Mythereum Styling**: All existing medieval fantasy UI elements, card displays, battle log, and visual hierarchy maintained
- **Pure Event-Driven Gameplay**: Turn progression, combat resolution, and game state changes triggered only by explicit user actions (button clicks) or controlled timer events with no automatic context reactions or cascading effects
- **Race-Free State Transitions**: Deterministic state changes without cascading effects, circular dependencies, or cross-context contamination
- **Clean Component Lifecycle**: Proper initialization with mount-only effect, controlled updates through event handlers exclusively, and clean unmounting without memory leaks or recursive context updates
- **Stable Ref Guards**: Use of useRef flags to prevent duplicate battle end callbacks and ensure single execution of critical operations
- **Comprehensive Cleanup**: All timers, intervals, and event listeners properly cleaned up on component unmount to prevent residual re-renders or memory leaks

#### Pure Presentational BattleLog Component
The battle log system includes a pure presentational component:
- Pure presentational BattleLog component with no hooks or effects
- Props-based rendering of battle events and messages
- Color-coded message categories for enhanced readability
- Medieval fantasy styling consistent with application theme
- No state management or side effects within the component

#### Battle System Stability and Initialization
The battle system includes robust battle management with race-free architecture:
- Stable battle state management with proper BattleInstance typing
- Enhanced lobby initialization with battle list management and tab navigation
- Fixed battle creation flow with deck validation and configuration options
- Battle session management with proper lifecycle handling from lobby to completion
- Restart Battle functionality integrated within lobby tab system
- Single-execution battle setup with enhanced lobby-to-battle transitions
- Battle completion handling with automatic return to lobby interface
- Enhanced error boundaries with graceful recovery and lobby navigation
- Component unmount cleanup with proper battle session termination
- Race-free battle state synchronization with lobby management integration
- Context isolation preventing battle system from triggering external context updates

#### Battlegrounds User Interface - Fully Stabilized Implementation
The Battlegrounds page provides comprehensive lobby and battle management with fully stabilized architecture:
- Rich lobby interface replacing simple "Practice Battle" layout
- Title banner with "Battlegrounds" heading and prominent create-battle button
- Tabbed navigation system for battle organization and management
- Create Battle dialog with comprehensive battle configuration options
- Battle list integration with race-free data fetching hooks
- Safe, guarded rendering to prevent infinite re-render issues
- LayerGate wrapper maintenance with Internet Identity login flow
- Local practice battle support with direct GameBoard integration
- Tab-based GameBoard display system replacing boolean state management
- Race-free useEffect patterns with controlled dependencies for lobby data refresh
- Integration with existing contexts: useHeroes, useEconomy, useTelemetry, useProgress, useInternetIdentity with isolation guards
- Medieval fantasy styling consistent with application theme
- Memoized handler functions and derived data to prevent recursive updates
- Guarded state setters and battle creation guards with race condition prevention
- Stable battle auto-refresh with proper cleanup and context isolation
- Mount-only initialization effects with empty dependency arrays to prevent recursive renders
- Event-driven battle creation and management without cascading state updates

### Phase 4: Forge & Market (Off-Chain Hero Economy)

#### Economy Domain Model
The economy system extends hero management with:
- Forge tier progression tracking for hero enhancement
- NFT eligibility marking for advanced heroes
- Market locking mechanism for listed heroes
- Forge recipe definitions for hero combination requirements
- Hero listing system with pricing and status tracking
- NPC hero offers for market diversity
- Listing status enumeration for market management

#### Hero Enhancement System
The forge system provides hero progression mechanics:
- Forge tier advancement through duplicate combination (maximum tier 3)
- Experience point awards for forging activities (150 XP per forge)
- NFT eligibility requirements (tier 2+ and level 5+)
- Market lock prevention for listed heroes
- Duplicate detection and management for forging materials

#### Market Economy System
The market system includes comprehensive trading features:
- NPC guild market with static hero offers
- Player-to-player hero listings with Soft Mythex pricing
- Listing creation, cancellation, and purchase mechanics
- Market persistence using local storage
- Hero ownership validation for market transactions
- Mythex balance integration for purchase validation with functional purchase buttons
- Error notifications for insufficient Mythex during purchase attempts

#### Forge User Interface
The Forge page provides two main enhancement systems:
- **Fusion Panel**: Combine duplicate heroes to increase forge tier and grant experience
- **Refinement Panel**: Spend Soft Mythex currency to directly award hero experience points
- Target hero selection with sacrifice hero management
- Cost calculation and resource validation
- Medieval fantasy styling consistent with application theme

#### Market User Interface
The Market page includes two trading sections:
- **NPC Guild Market**: Browse and purchase heroes from static NPC offers with functional purchase buttons
- **Your Listings**: Create, manage, and cancel personal hero listings
- Mythex balance display and transaction validation
- Hero eligibility checking for listing creation
- Market status tracking and listing management
- Error notifications for insufficient funds or failed transactions

#### Battle Rewards Integration
The battle system connects to the economy through:
- Battle completion callbacks triggering reward distribution
- Experience point awards based on battle outcomes (50 XP for wins, 10 XP for losses)
- Soft Mythex currency rewards for successful battles
- Resource rewards integrated with stronghold economy
- Hero progression tracking through battle participation

### Phase 5: Tournaments & Ladder MVP (Off-Chain, Single-Player)

#### Tournament Domain Model
The tournament system includes comprehensive type definitions:
- Tournament interface with configuration, participants, matches, and rewards
- TournamentConfig defining entry requirements, format, and prize structure
- TournamentParticipant tracking player and AI opponent data
- TournamentMatch representing bracket progression and results
- TournamentRewards specifying prize distribution
- Tournament status enumeration (upcoming, registration, active, completed)
- Tournament format enumeration (single-elimination, double-elimination, round-robin)

#### Tournament Management System
The tournaments feature includes persistent state management:
- Local storage persistence using key `retro-mythereum-tournaments-v1`
- Automatic seeding of sample tournaments on first load
- Tournament lifecycle management from registration through completion
- AI opponent generation and bracket population
- Match simulation and progression mechanics
- Prize distribution and reward calculation

#### Tournament Context and State Management
The tournament system provides comprehensive tournament operations:
- ensureSeedTournaments function for initial tournament population
- joinTournament function validating entry fees and populating AI opponents with proper error handling and state updates
- startTournament function generating initial bracket matches
- simulateNextRound function resolving matches and determining champions
- Tournament state persistence and retrieval from local storage
- Integration with stronghold economy for entry fees and rewards
- Comprehensive error handling for all tournament operations including registration, starting, and simulation
- Toast notification system for displaying success and error messages to users
- Defensive array validation to prevent crashes from malformed tournament data

#### Heroes Context Integration
The heroes system extends to support tournament functionality:
- getDeckWithHeroIdsById function returning complete deck data with heroIds array
- DeckWithPower interface enhanced with heroIds property for tournament deck tracking
- Deck power calculation integration for tournament match simulation
- Hero collection validation for tournament participation

#### Stronghold Context Integration
The stronghold system integrates with tournament economy:
- canPayEntryFee function validating sufficient Soft Mythex balance
- payEntryFee function deducting tournament entry costs
- grantTournamentRewards function crediting prize winnings to player resources
- Tournament reward integration with existing Soft Mythex management

#### Tournament Components
The tournament system includes specialized UI components:
- TournamentCard component for tournament list display with status, format, and entry requirements
- TournamentDetail component providing comprehensive tournament management with tabbed interface
- Tournament overview tab displaying configuration, participants, and bracket structure
- Tournament progress tab showing match results and advancement tracking
- Tournament rewards tab detailing prize structure and distribution
- Tournament simulation controls for match progression and completion
- Toast notification system integrated throughout tournament components for user feedback

#### Tournaments User Interface
The Tournaments page provides comprehensive tournament management:
- Tournament categorization by status (Upcoming, Ongoing, Completed)
- Deck selection interface for tournament participation
- Tournament detail view with tabbed navigation
- Tournament joining functionality with entry fee validation and error handling
- Tournament starting controls for registered tournaments with proper error feedback
- Round simulation interface for active tournaments with error handling
- Prize claiming system for completed tournaments
- Toast notification system for displaying registration success, errors, and other tournament-related messages

#### Tournament Provider Integration
The tournament system integrates with existing application providers:
- TournamentsProvider nested beneath MarketProvider in provider hierarchy
- Tournament context access throughout application components
- Tournament data persistence and state management
- Integration with heroes and stronghold contexts for complete functionality
- Toast notification system integration for consistent user feedback across all tournament operations

### Phase 6: Telemetry & Balancer Lab (Off-Chain Oracle Prototype)

#### Telemetry Domain Model
The telemetry system includes comprehensive type definitions for data collection and balance analysis:
- CardTelemetryCounters interface tracking games seen, wins, losses, and usage statistics per card
- TelemetrySummary interface aggregating telemetry data across all tracked cards
- BalanceEngineParams interface defining target winrate thresholds and adjustment sensitivity
- DynamicCardBalance interface for mana cost overrides and balance adjustments
- BalanceRecommendation interface providing suggested mana adjustments with rationale

#### Balance Engine System
The balance engine provides pure computational functions for card balance analysis:
- computeBalanceRecommendations function generating mana adjustment suggestions based on telemetry data
- Helper functions including clamp and getCurrentManaForCard for balance calculations
- Target winrate threshold enforcement for identifying overpowered and underpowered cards
- Mana adjustment algorithms based on card performance statistics
- Balance recommendation generation with detailed reasoning and impact analysis

#### Telemetry Context and State Management
The telemetry system includes persistent state management:
- Local storage persistence using key `retro-mythereum-telemetry-v1`
- Automatic telemetry data collection and aggregation
- Battle outcome recording with card usage tracking
- Engine parameter configuration and adjustment
- Telemetry reset and data management functionality
- Integration with heroes context for card identification
- Defensive guards against mutual context update loops with balancer system
- useEffect with proper dependency arrays and useRef flags for localStorage synchronization

#### Balancer Context and State Management
The balancer system provides dynamic card balance management:
- DynamicCardBalance overlay system for mana cost adjustments
- Balance recommendation computation and application
- Persistent balance override storage using local storage
- BALANCER_IMMUTABLE flag for development control
- Integration with telemetry context for data-driven balance decisions
- getManaForCard function providing dynamic mana costs for battle system
- Defensive guards against mutual context update loops with telemetry system
- useEffect with proper dependency arrays and useRef flags for localStorage synchronization

#### Battle System Integration
The battle system integrates with telemetry and balancer systems:
- Dynamic mana cost application through balancer context integration
- Battle outcome recording with card usage tracking for telemetry
- BattleId and usedHeroOwnedIds tracking for comprehensive telemetry data
- Single battle outcome recording per battle session using useRef

#### Battlegrounds Integration
The Battlegrounds page integrates telemetry recording:
- Battle completion callback integration with telemetry context
- Automatic battle outcome recording alongside existing reward systems
- Telemetry data collection for balance analysis and recommendations

#### Admin Balancer Lab Interface
The Admin Balancer Lab page provides a comprehensive developer-only panel:
- Tracked battles count display and telemetry overview
- Engine parameter sliders for target winrate threshold adjustment
- Balance recommendation computation and application controls
- Top 10 cards by games seen with current mana, suggested mana, and winrate display
- Per-card balance recommendation application with individual Apply buttons
- Bulk balance application and reset functionality
- Medieval fantasy styling consistent with application theme
- Access restricted to users with developer/admin privileges using access control system
- Dedicated page at `frontend/src/pages/AdminBalancerLabPage.tsx`
- Admin navigation includes "Balancer Lab (Developers Only)" link to the dedicated page

#### Provider Integration
The telemetry and balancer systems integrate with existing application providers:
- TelemetryProvider integration within application provider hierarchy
- BalancerProvider integration with telemetry context dependency
- Context access throughout application components for telemetry and balance functionality
- Persistent data storage and state management across application sessions
- Defensive guards against nested context interactions causing repeated updates
- All contexts use proper dependency arrays and useRef flags for localStorage synchronization to break circular updates

### Phase 7: Player Accounts, Guest Onboarding and Wallet-Ready Architecture

#### Account Domain Model
The account system includes comprehensive type definitions for player management:
- PlayerAccount interface defining account ID, display name, email, creation timestamp, and linked wallet information
- LinkedWalletInfo interface for future wallet integration with address and connection status
- OnboardingFlags interface tracking first-time user experience completion states

#### Account Context and State Management
The account system provides persistent player account management:
- Local storage persistence using key `retro-mythereum-account-v1`
- Automatic guest account creation with unique account ID generation
- Display name and optional email management
- Onboarding flag tracking for first-time user experience
- Referral link generation and management
- Account initialization with enhanced starting balance: 1000 Soft Mythex and 100 Mythex
- useEffect with proper dependency arrays and useRef flags for localStorage synchronization

#### Welcome Modal System
The onboarding system includes first-time user experience:
- WelcomeModal component presenting "Play as Guest" option for immediate access
- Inactive "Link Wallet" button placeholder for future wallet integration
- Onboarding flag management to show modal only on first launch
- Medieval fantasy styling consistent with application theme

#### Profile Settings Integration
The profile system extends to include account management:
- Display name editing and persistence
- Optional email address management
- Account ID display for player identification
- Referral link generation and sharing functionality
- Account creation timestamp display

#### Player Initialization Enhancement
The player initialization system includes enhanced starting resources:
- New players start with 1000 Soft Mythex and 100 Mythex balance for immediate tournament participation and market purchases
- Starter stronghold creation with enhanced resource allocation
- Hero collection initialization with starter deck configuration
- Account creation integrated with existing game system initialization

#### Provider Integration
The account system integrates with existing application providers:
- AccountProvider integration at the top level of provider hierarchy
- Account context access throughout application components
- Integration with stronghold context for enhanced starting balance initialization
- Seamless integration with existing heroes, market, and tournament systems
- useEffect with proper dependency arrays and useRef flags for localStorage synchronization

### Phase 8: Startup Initialization & Provider Safety

#### Provider Hierarchy and Safety
The application includes robust provider initialization and error handling:
- Proper provider nesting order with dependency management
- Context provider safety guards to prevent "must be used within Provider" crashes
- Detailed error messaging and logging throughout startup sequence
- Non-blocking error notices for mis-nested providers or failed data loads
- Runtime guard logs for context initialization failures
- Safe mounting of ProgressSync and StrongholdContext dependencies
- Proper initialization order for all battle-related contexts and providers
- Enhanced provider safety specifically for battle system components with comprehensive initialization guards
- Battle context isolation to prevent cross-provider state contamination and recursive updates
- All contexts use proper dependency arrays and useRef flags for localStorage synchronization to break circular updates

#### Error Handling and Logging
The startup system includes comprehensive error management:
- Detailed error messaging in App.tsx for provider tree issues
- Context initialization failure detection and reporting
- Missing provider identification and logging
- Safe fallback mechanisms for failed context loads
- User-friendly error messages for initialization problems
- Battle-specific error boundaries with recovery mechanisms for maximum update depth exceeded errors
- Enhanced logging for battle initialization issues with diagnostic information and reload instructions
- LayerGate includes mount guards with useEffect(..., []) to prevent repeated state updates during render

### Phase 9: Soft Economy (Mythex & Resources) + Rewards

#### Economy Domain Model
The economy system includes comprehensive type definitions for resource management:
- ResourceType enumeration defining all game resources (Gold, Stone, Lumber, Iron, Food, Mana, Mythex)
- ResourceAmount interface for quantity tracking with resource type and amount
- SoftWallet interface managing per-account resource balances with Mythex and traditional resources

#### Economy Context and State Management
The economy system provides persistent resource management:
- Local storage persistence using key `retro-mythereum-economy-v1` with per-account data
- Automatic wallet initialization for new accounts with enhanced starter resources: 1000 Soft Mythex and 100 Mythex
- Helper methods for earning and spending resources with validation
- Resource balance tracking and transaction history
- Integration with account system for per-player wallet management
- Mythex and resource reward distribution functions
- useEffect with proper dependency arrays and useRef flags for localStorage synchronization

#### Wallet Summary Component
The economy system includes wallet display components:
- WalletSummary component with inline and panel display variants
- Mythex balance display with appropriate icon and formatting
- Key resource balance display (Gold, Stone, Lumber, Iron, Food, Mana)
- Responsive design for different layout contexts
- Medieval fantasy styling consistent with application theme

#### Strongholds Economy Integration
The strongholds system integrates with the economy system:
- Wallet summary display on strongholds page
- "Collect Starter Resources" button functionality for new players
- Resource collection and distribution through economy context
- Integration with existing stronghold resource management

#### Battle Rewards Integration
The battlegrounds system integrates with economy rewards:
- Battle completion callbacks triggering Mythex and resource rewards
- Win/loss reward differentiation with appropriate payouts
- Resource reward distribution based on battle outcomes
- Integration with existing battle completion handling

#### Tournament Rewards Integration
The tournaments system integrates with economy rewards:
- Tournament completion rewards based on placement and outcomes
- Mythex and resource prize distribution for tournament winners
- Integration with existing tournament reward systems
- Enhanced prize structures including economy resources

#### Profile Economy Overview
The profile system includes economy management:
- "Economy Overview" section in profile settings
- Read-only wallet summary display for account resource tracking
- Resource balance history and transaction overview
- Integration with existing profile management features

#### Provider Integration
The economy system integrates with existing application providers:
- EconomyProvider positioned after AccountProvider and before ProgressProvider in hierarchy
- Economy context access throughout application components
- Per-account resource persistence and management
- Integration with all existing game systems for reward distribution
- useEffect with proper dependency arrays and useRef flags for localStorage synchronization

### Phase 10: Stronghold Buildings & Hero Recruitment Loop

#### Stronghold Buildings System
The stronghold buildings system provides comprehensive building management:
- Extended building type definitions with production rates and upgrade costs
- Building state management with production timers and upgrade tracking
- Resource collection mechanics integrated with economy system
- Building upgrade functionality with resource cost validation
- Per-account stronghold persistence and state management

#### Hero Recruitment Integration
The stronghold system integrates with hero recruitment:
- Hero recruitment functionality accessible through stronghold interface
- Random hero recruitment using available hero pool from expanded card library
- Resource cost requirements for hero recruitment operations
- Integration with heroes context for adding recruited heroes to collection
- Recruitment mechanics balanced with existing game economy

#### Stronghold User Interface Enhancement
The strongholds page includes enhanced building management:
- Building list display with current levels and upgrade options
- Production collection interface for gathering resources
- Hero recruitment section with recruitment controls and cost display
- Integration with existing "Collect Starter Resources" functionality
- Resource cost validation and user feedback for all operations

#### Heroes Context Enhancement
The heroes system extends to support recruitment:
- recruitRandomHero function for adding random heroes to collection
- Integration with stronghold recruitment mechanics
- Hero source tracking for recruitment method identification
- Seamless integration with existing hero collection management

#### DecksView Information Enhancement
The DecksView page includes recruitment guidance:
- Informational section explaining hero recruitment through strongholds
- Clear navigation guidance directing players to stronghold recruitment
- Integration with existing deck management functionality
- User education about hero acquisition methods

#### Context Integration and Safety
The stronghold buildings system includes robust integration:
- Safe integration with existing stronghold context and state management
- Non-breaking additions to existing stronghold functionality
- Consistent use of existing localStorage keys and data structures
- Integration with economy context for resource operations
- Defensive programming to prevent data corruption or system crashes

### Progress System Updates

#### Layer Unlock Requirements
The progress system includes updated unlock requirements for streamlined player progression:
- Layer 1 (Strongholds): Unlocked by default
- Layer 2 (Heroes): Unlocked by default (no hero acquisition requirement)
- Layer 3 (Battlegrounds): Unlocked automatically (no battle win requirement)
- Layer 4 (Tournaments): Unlocked automatically (no tournament win requirement)
- Layer 5 (Forge & Market): Unlocked by default
- Layer 6 (Telemetry & Balancer): Unlocked by default for admin users

#### Progress Context Integration
The progress system integrates with existing application features:
- Automatic layer unlocking without progression barriers
- Simplified onboarding experience for new players
- Integration with account system for progress tracking
- Persistent progress state management
- useEffect with proper dependency arrays and useRef flags for localStorage synchronization

### Admin Access Control System

#### Access Control Requirements
The application includes an access control system for administrative features:
- Developer/admin privilege checking using `useAccessControl` or equivalent permissions context
- Restricted access to Balancer Lab functionality for authorized users only
- Admin navigation visibility controlled by user permissions
- Secure routing to prevent unauthorized access to admin pages

#### Admin Navigation Structure
The admin section includes developer-only tools:
- Balancer Lab page accessible only to users with appropriate privileges
- Admin navigation menu with "Balancer Lab (Developers Only)" link
- Access control integration in layout components for conditional navigation display

### Toast Notification System

#### Notification Requirements
The application includes a comprehensive toast notification system:
- Success and error message display for tournament operations
- User feedback for registration, starting, and simulation actions
- Contextual error messages for failed operations (already joined, tournament full, not active)
- Market purchase error notifications for insufficient Mythex
- Consistent notification styling with medieval fantasy theme
- Toast positioning at top of screen or in appropriate context areas

#### Tournament Error Handling
The tournament system provides comprehensive error handling:
- Registration validation with friendly error messages
- Tournament state validation before operations
- Entry fee validation with clear feedback
- Deck selection validation for tournament participation
- Error message display through toast notification system
- Defensive array validation to prevent crashes from malformed tournament data

#### Market Error Handling
The market system provides comprehensive error handling:
- Purchase validation with Mythex balance checking
- Error notifications for insufficient funds during hero purchases
- Transaction failure handling with user-friendly messages
- Market listing validation and error feedback

### Architectural Roadmap for Render-Loop Stability and Context Isolation

#### Phase A: Immediate Priority - UI Render Loop Stability

##### BattlegroundsPage Render Loop Audit
The BattlegroundsPage requires comprehensive audit and refactoring for render loop stability:
- Strict separation between render state and event-driven effects with no useEffect dependencies on derived state
- Memoization of all battle-related handlers using useCallback with stable dependency arrays
- Mount-only initialization effects with empty dependency arrays `[]` to prevent recursive renders
- Developer-only debug logging for render cycle detection and React profiler instrumentation
- Elimination of cascading state updates that trigger additional renders

##### Context Callback Stabilization
All context providers require callback stabilization:
- Memoize `handleStartBattle`, `handleBattleComplete`, and all context callbacks with useCallback
- Ensure stable dependency arrays for all useEffect calls across battle-related components
- Implement useRef flags to prevent duplicate callback executions
- Add render cycle detection logging for development environments

##### React useEffect Dependency Management
Comprehensive useEffect audit across all battle-related components:
- Convert all useEffect calls to use stable dependency arrays or mount-only initialization
- Eliminate useEffect calls that depend on frequently changing state values
- Implement useRef-based state management for values that don't require re-renders
- Add development-mode warnings for unstable dependencies

##### Developer Debug Instrumentation
Enhanced debugging capabilities for render loop detection:
- Optional React profiler integration for performance monitoring
- Debug logging for context update cycles and render frequency
- Development-mode render count tracking and warnings
- Diagnostic tooltips showing context update frequency during UI interactions

#### Phase B: High Priority - Context Isolation and Performance

##### Provider Splitting and Optimization
Large providers require splitting into minimal read/write subcontexts:
- Split Economy, Progress, and Heroes providers into read and write contexts
- Implement derived selectors using React Query or Zustand-style patterns
- Reduce shared reactivity between contexts to prevent cascading updates
- Create isolated context boundaries for battle-related state

##### Computed Data Memoization
Heavy computed data requires comprehensive memoization:
- Implement useMemo for deck power calculations, resource summaries, and tournament filters
- Create derived selectors for non-reactive computed data
- Prevent cascading updates through proper memoization strategies
- Optimize context value calculations to reduce re-render frequency

##### Context Isolation Architecture
Enhanced context isolation to prevent cross-context contamination:
- Implement context boundaries between major application layers
- Create isolated state management for battle operations
- Prevent context updates from triggering unrelated component re-renders
- Establish clear data flow patterns between contexts

#### Phase C: Medium Priority - Monitoring, Testing, and Safety

##### Automated E2E Testing
Comprehensive testing infrastructure for render loop detection:
- Automated E2E tests specifically targeting battle creation workflows
- Maximum update depth regression testing
- Performance benchmarking for context update cycles
- Continuous integration testing for render loop stability

##### Error Boundary Implementation
Enhanced error boundaries for each major application layer:
- Stronghold, Heroes, Battle, Market, and Tournament error boundaries
- Structured log outputs for debugging render loop issues
- Graceful recovery mechanisms for maximum update depth errors
- User-friendly error messages with recovery instructions

##### Diagnostic and Monitoring Tools
Per-phase diagnostic capabilities for development:
- Developer mode tooltips visualizing context update frequency
- Real-time monitoring of render cycles and context interactions
- Performance metrics dashboard for context update patterns
- Automated alerts for render loop detection

#### Phase D: Long-term - Backend Modularization and Scalability

##### Domain-Specific Canister Architecture
Backend refactoring into modular, domain-specific canisters:
- AccessControl canister for user permissions and authentication
- PlayerAccounts canister for account management and profiles
- Battles canister for battle state and combat resolution
- Market canister for trading and economy operations
- Tournaments canister for tournament management and brackets

##### Error Handling and Resilience
Enhanced backend error handling and resilience:
- Replace Debug.trap with error variant returns for recoverable issues
- Implement graceful degradation for canister communication failures
- Add retry mechanisms for transient errors
- Prevent canister halt from recoverable logic issues

##### Performance Monitoring and Metrics
Comprehensive backend performance monitoring:
- Canister health metrics including cycle usage and query latency
- Update success rate monitoring and alerting
- Performance benchmarking for critical operations
- Automated scaling and resource management

### Design System and Visual Theme

#### Mythereum Classic Medieval Fantasy Style
The application strictly adheres to classic Mythereum design principles:
- Dark browns, gold, crimson, and parchment color palette with complete elimination of purple, neon, or space tones
- Medieval fantasy aesthetic throughout all components with dragons, wizards, castles, and ancient stones imagery
- Dark fantasy parchment backgrounds for battle interfaces
- Gold borders and strong contrast for text visibility
- Battle event logging with enhanced readability using color-coded message categories
- Fortress-map painterly backgrounds as visual foundation for layout components
- Forge and market interfaces styled with medieval crafting and trading aesthetics
- Tournament interfaces with medieval tournament and competition themes
- Telemetry and balancer interfaces with medieval laboratory and alchemical themes
- Admin Balancer Lab interface with medieval laboratory styling and developer-focused design
- Account and onboarding interfaces with medieval welcome and profile themes
- Economy and wallet interfaces with medieval treasury and resource management themes
- Stronghold buildings interfaces with medieval construction and recruitment themes
- Advanced battlegrounds lobby interface with medieval arena and combat themes

#### Updated Color Palette and Theme Assets
All frontend components use the classic Mythereum color scheme:
- Primary backgrounds: dark browns and parchment tones
- Accent colors: molten gold and crimson highlights
- Text colors: high contrast for readability
- Border elements: gold and bronze styling
- Button styling: gold/bronze with appropriate hover states
- Global background assets featuring medieval fantasy imagery
- StrongholdMap painterly fortress background layer beneath hex grid with proper transparency
- Forge and market components with consistent medieval fantasy styling
- Tournament components with medieval competition and arena themes
- Telemetry and balancer components with medieval laboratory and research themes
- Account and profile components with medieval welcome and character themes
- Economy and wallet components with medieval treasury and resource management themes
- Stronghold buildings components with medieval construction and recruitment themes
- Advanced battlegrounds lobby components with medieval arena and combat themes
- Toast notification styling with medieval fantasy theme and appropriate positioning

### Frontend Requirements
- Single-page React application with TypeScript
- TailwindCSS styling updated for classic Mythereum theme with medieval fantasy color palette
- Custom CSS classes for consistent medieval fantasy styling
- Background elements following classic Mythereum design with dragons, wizards, castles, and ancient stones
- Card containers with medieval-themed borders and effects
- Hex tile styling with golden borders and medieval aesthetics
- Hover effects and transitions maintaining fantasy theme
- React Router for navigation between pages including admin routes
- Lucide React icons for UI elements and building types
- Responsive design with consistent medieval fantasy tone
- Heroes Provider integration with battle system support and telemetry integration
- Market Provider integration with economy system and functional purchase buttons
- Tournaments Provider integration with tournament system and error handling including defensive array validation
- Telemetry Provider integration with battle outcome tracking
- Balancer Provider integration with dynamic card balance management
- Account Provider integration with guest onboarding and profile management
- Economy Provider integration with resource management and rewards
- Progress Provider integration with updated unlock requirements
- Access control system for admin features and navigation
- Toast notification system for user feedback and error handling including market purchase errors
- Hex geometry calculations using hexMath utility
- Layout components using fortress-map and medieval fantasy assets as visual foundation
- Forge and market components with medieval crafting and trading themes
- Tournament components with medieval tournament and competition styling with error handling
- Telemetry and balancer components with medieval laboratory and alchemical styling
- Account and profile components with medieval welcome and character styling
- Economy and wallet components with medieval treasury and resource management styling
- Stronghold buildings components with medieval construction and recruitment styling
- Admin Balancer Lab page with restricted access and developer-focused interface
- Provider safety guards and error handling throughout startup sequence
- **Fully Stabilized Event-Driven GameBoard Component**: Complete architectural refactor with single mount-only initialization useEffect with empty dependency array `[]` for battle setup (deck initialization, health calculation, magick setup, timer configuration) that runs only on component mount with no recursive dependencies or state-dependent re-runs, isolated timer loop managed via useRef with setInterval and proper cleanup on unmount preventing cross-context interference, all battle actions consolidated into pure event handlers (handleEndTurn, performAITurn, performAttack, handlePlayCard, handleUseAbility) with no internal useEffects triggering on derived state changes or context updates, complete state isolation with no useEffects running on battle/player/opponent state that call setState on those values preventing recursive render loops and context interference, single onBattleEnd invocation via explicit checkGameOver logic within event handlers not in looping effects or context updates, full context isolation with GameBoard operating independently receiving data through props with no direct context subscriptions during battle, preserved Mythereum styling and UI elements with pure event-driven gameplay and race-free state transitions without cascading effects or cross-context contamination, stable ref guards using useRef flags to prevent duplicate battle end callbacks and ensure single execution of critical operations, comprehensive cleanup of all timers, intervals, and event listeners on component unmount to prevent residual re-renders or memory leaks
- **Race-Free Timer Management**: Timer controlled via useRef with setInterval, proper cleanup on unmount, no recursive state updates from timer events, complete isolation from context updates with timer events handled through pure event handlers
- **Complete Context Isolation**: GameBoard operates independently from external contexts, receiving all data through props, no cascading effects or circular dependencies, no cross-context contamination during battle operations
- **Pure Event-Driven Architecture**: Turn progression, combat resolution, and game state changes triggered only by explicit user actions (button clicks) or controlled timer events, not automatic effects or context reactions
- **Race-Free Component Lifecycle**: Proper initialization with mount-only useEffect with empty dependency array, controlled updates through event handlers exclusively, clean unmounting without memory leaks or recursive context updates
- **Fully Stabilized BattlegroundsPage**: Complete refactor with mount-only initialization effects using empty dependency arrays to prevent recursive renders, event-driven battle creation and management without cascading state updates, race-free useEffect patterns with controlled dependencies for lobby data refresh, memoized handler functions and derived data to prevent recursive updates, guarded state setters and battle creation guards with race condition prevention, stable battle auto-refresh with proper cleanup and context isolation
- **Architectural Roadmap Implementation**: Systematic implementation of render loop stability improvements, context isolation enhancements, monitoring and testing infrastructure, and backend modularization following the prioritized roadmap phases
- **Development-Only Diagnostic Hooks**: Render tracking hooks for key contexts and Battlegrounds components with console.debug logging for phase tracking and render cycle detection
- **E2E Testing Integration**: Lightweight E2E hooks and logging markers for verifying one-render-per-event behavior with mock battle creation test cases
- **Context Update Isolation**: EconomyContext, HeroesContext, ProgressContext, and TelemetryContext refactored to remove cross-context direct updates with emit-style event dispatches and memoized derived states
- **useRef Guards Implementation**: Consistent isUpdatingRef guards across all contexts to prevent mutual update recursion
- **Debounced localStorage Optimization**: Consistent debounced intervals (300-500ms) for localStorage writes with strict dependency isolation on accountId only

### Backend Data Storage
The backend must store:
- Player account information including account ID, display name, email, and creation timestamp
- Linked wallet information for future wallet integration
- Onboarding flags and first-time user experience tracking
- Player progression and account statistics
- Soft wallet data with enhanced Mythex and resource balances per account (1000 Soft Mythex, 100 Mythex starting balance)
- Resource transaction history and earning/spending logs
- Stronghold configurations and upgrades
- Building states, upgrade timers, and spatial positions with positionIndex
- Building placement history and relocation records
- Resource production and consumption logs including Mana
- Soft Mythex currency balances and transaction history with enhanced starting balance
- Alliance memberships and configurations
- NPC interaction results and trading history
- Hero card collections with individual progression data including forge tiers and NFT eligibility
- Deck compositions and power ratings
- Deck assignment records for stronghold operations
- Card acquisition history and sources including recruitment methods
- Forge transaction logs and hero enhancement records
- Market listings and trading history with functional purchase transactions
- Hero experience point progression and level advancement
- Battle results and statistics including tactical combat data
- Battle session logs and player performance metrics
- Battle instance data for lobby management including battle ID, participants, status, and configuration
- Tournament data and rankings with defensive array validation
- Tournament participation history and results
- Tournament bracket progression and match outcomes
- Tournament reward distribution and prize claiming
- Market transactions and economy data
- Crafting recipes and forge operations
- Card telemetry data and usage statistics
- Balance engine parameters and recommendations
- Dynamic card balance overrides and adjustments
- Telemetry aggregation and analysis results
- Admin access control and user permissions
- Referral system data and tracking
- Economy reward distribution and resource management
- Stronghold building management and hero recruitment records
- Render loop monitoring and performance metrics
- Context update cycle tracking and analysis
- Error boundary logs and recovery statistics
- **Domain-Specific Canister Architecture**: Backend prepared for sharding with domain boundaries mapped (Economy, Battle, Tournament) in comments and type stubs
- **Structured Error Types**: Replace Debug.trap calls with Result<Ok, Err> pattern for improved debug visibility
- **Performance Diagnostics**: Placeholder cycle and memory diagnostic functions for canister health monitoring

### Technical Requirements
- React with TypeScript for type safety
- TailwindCSS for styling with updated medieval fantasy theme
- Responsive design for various screen sizes
- Local development setup with package manager support
- Clear project structure and file organization
- Local storage integration for persistent game state
- Heroes context provider integration with battle system support and telemetry integration
- Market context provider for economy management with functional purchase buttons
- Tournaments context provider for tournament system management with error handling and defensive array validation
- Telemetry context provider for battle outcome tracking and data collection
- Balancer context provider for dynamic card balance management
- Account context provider for guest onboarding and profile management
- Economy context provider for resource management and rewards with enhanced starting balance
- Progress context provider with updated unlock requirements
- Access control context provider for admin features
- Toast notification system for user feedback including market purchase errors
- Provider safety guards and initialization error handling
- Hexagonal geometry calculations and spatial validation with hexMath utility
- CSS styling for medieval fantasy hex tiles and battle interfaces
- Battle system integration with existing contexts and localStorage persistence
- Forge and market system integration with hero and stronghold contexts
- Tournament system integration with heroes and stronghold contexts including error handling
- Telemetry system integration with battle and heroes contexts
- Balancer system integration with telemetry and battle contexts
- Account system integration with all existing contexts and enhanced player initialization
- Economy system integration with all game systems for reward distribution
- Admin system integration with access control and restricted routing
- Startup initialization safety and error recovery mechanisms
- Stronghold buildings system integration with economy and heroes contexts
- **Fully Stabilized Event-Driven GameBoard Architecture**: Complete refactor with single mount-only initialization useEffect with empty dependency array `[]` for battle setup (deck initialization, health calculation, magick setup, timer configuration) that runs only on component mount with no recursive dependencies or state-dependent re-runs, isolated timer loop managed via useRef with setInterval and proper cleanup on unmount preventing cross-context interference, all battle actions consolidated into pure event handlers (handleEndTurn, performAITurn, performAttack, handlePlayCard, handleUseAbility) with no internal useEffects triggering on derived state changes or context updates, complete state isolation with no useEffects running on battle/player/opponent state that call setState on those values preventing recursive render loops and context interference, single onBattleEnd invocation via explicit checkGameOver logic within event handlers not in looping effects or context updates, full context isolation with GameBoard operating independently receiving data through props with no direct context subscriptions during battle, preserved Mythereum styling and UI elements with pure event-driven gameplay and race-free state transitions without cascading effects or cross-context contamination, stable ref guards using useRef flags to prevent duplicate battle end callbacks and ensure single execution of critical operations, comprehensive cleanup of all timers, intervals, and event listeners on component unmount to prevent residual re-renders or memory leaks
- **Race-Free Timer Implementation**: Timer managed via useRef with controlled setInterval, proper cleanup on component unmount, ensuring no recursive state updates from timer events and complete isolation from context updates with timer events handled through pure event handlers
- **Complete State Isolation**: GameBoard component operates independently from external contexts, receiving all necessary data through props, no cascading effects or circular dependencies, no cross-context contamination during battle operations
- **Pure Event-Driven Gameplay**: Turn progression, combat resolution, and game state changes triggered only by explicit user actions (button clicks) or controlled timer events, not automatic effects or context reactions
- **Race-Free Component Lifecycle**: Proper initialization with mount-only useEffect with empty dependency array, controlled updates through event handlers exclusively, clean unmounting without memory leaks or recursive context updates
- **Fully Stabilized BattlegroundsPage**: Complete refactor with mount-only initialization effects using empty dependency arrays to prevent recursive renders, event-driven battle creation and management without cascading state updates, race-free useEffect patterns with controlled dependencies for lobby data refresh, memoized handler functions and derived data to prevent recursive updates, guarded state setters and battle creation guards with race condition prevention, stable battle auto-refresh with proper cleanup and context isolation
- **Architectural Roadmap Implementation**: Systematic implementation of render loop stability improvements including BattlegroundsPage audit, context callback stabilization, useEffect dependency management, developer debug instrumentation, provider splitting and optimization, computed data memoization, context isolation architecture, automated E2E testing, error boundary implementation, diagnostic and monitoring tools, domain-specific canister architecture, enhanced error handling and resilience, and performance monitoring and metrics
- **Development-Only Diagnostic System**: Render tracking hooks for key contexts and Battlegrounds components with console.debug logging for phase tracking, render cycle detection, and React profiler integration
- **E2E Testing Infrastructure**: Lightweight E2E hooks and logging markers for verifying one-render-per-event behavior with mock battle creation test cases for render loop stability validation
- **Context Isolation Refactoring**: EconomyContext, HeroesContext, ProgressContext, and TelemetryContext refactored to remove cross-context direct updates with emit-style event dispatches, memoized derived states, and useRef guards for mutual update recursion prevention
- **localStorage Optimization**: Consistent debounced intervals (300-500ms) for localStorage writes with strict dependency isolation on accountId only across all contexts

### Development Setup
The project should include:
- Installation instructions for dependencies
- Local development server setup (`pnpm dev`)
- Build and deployment configuration
- Development assumptions and setup notes
- Reset instructions for localStorage data:
  - Reset heroes/decks: `localStorage.removeItem('retro-mythereum-heroes-v1')`
  - Reset stronghold: `localStorage.removeItem('retro-mythereum-stronghold-v1')`
  - Reset market: `localStorage.removeItem('retro-mythereum-market-v1')`
  - Reset tournaments: `localStorage.removeItem('retro-mythereum-tournaments-v1')`
  - Reset telemetry: `localStorage.removeItem('retro-mythereum-telemetry-v1')`
  - Reset balancer: `localStorage.removeItem('retro-mythereum-balancer-v1')`
  - Reset account: `localStorage.removeItem('retro-mythereum-account-v1')`
  - Reset economy: `localStorage.removeItem('retro-mythereum-economy-v1')`
