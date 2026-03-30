# Mythereum Retro V2 - Developer Guide

## Project Overview

Strategic card battle game on the Internet Computer. React 19 + TypeScript frontend, Motoko canister backend, deployed via Caffeine AI.

**Live URL**: `entire-teal-993-draft.caffeine.xyz`

## Quick Reference

### Key Files for Battle System (Original Mythereum Leader Combat)
- `frontend/src/lib/battleUtils.ts` -- Pure battle logic: leader vs leader, magick, abilities
- `frontend/src/pages/BattlegroundsPage.tsx` -- Lobby + battle orchestration
- `frontend/src/components/battle/GameBoard.tsx` -- Battle UI: leader cards, hand, magick, abilities
- `frontend/src/types/battle.ts` -- BattleCard, BattleDeck (leader+hand+graveyard+playerHp+magick), Battle
- `frontend/src/types/game.ts` -- CardData with MagickGeneration, CardAbility, MagickCost, CardEdition
- `frontend/src/lib/mockData.ts` -- Card library with abilities, magick gen, HP modifiers

### Combat Model (Original Mythereum)
- **Leader system**: 1 leader on field, rest in hand (4 cards). Swap leader each turn.
- **Player HP**: Separate from card HP. Excess damage after leader dies hits player HP. Game over at 0.
- **Magick**: 3 colors (White, Black, Grey). Cards generate magick % per round. Abilities cost magick.
- **Abilities**: Each card has an activated ability (e.g., Hide, Annihilate, Shield Wall, Drain).
- **Editions**: Genesis (red border), Awakening (blue border), Survivor (dark border).
- **Deck size**: 5 cards minimum (1 leader + 4 hand).

### Context Architecture
All 9 contexts follow the **stable callback pattern**:
- Mutation callbacks use `useCallback(() => { setX(prev => ...) }, [])` with refs for guards
- Provider values wrapped in `useMemo`
- No `[state]` in mutation callback dependency arrays

### Common Pitfalls
- **Never put state in mutation callback deps** -- use refs (`stateRef.current`) for guard checks and functional updates (`setState(prev => ...)`) for mutations
- **Always deep-clone battle state** -- use `deepCloneBattle()` before any modification
- **ProgressSync exists** -- it syncs hero count from HeroesContext to ProgressContext. If you add similar cross-context syncs, use the same stable-callback pattern

### Build & Deploy
This project builds on Caffeine AI infrastructure. There is no local `package.json`. To test changes, push to GitHub and redeploy from Caffeine.

```bash
git add -A && git commit -m "description" && git push
```

### Backend (Motoko)
Located in `backend/`. Key canister methods are typed in `frontend/src/backend.d.ts` and wrapped in `frontend/src/hooks/useQueries.ts`.
