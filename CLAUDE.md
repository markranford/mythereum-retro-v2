# Mythereum Retro V2 - Developer Guide

## Project Overview

Strategic card battle game on the Internet Computer. React 19 + TypeScript frontend, Motoko canister backend, deployed via Caffeine AI.

**Live URL**: `entire-teal-993-draft.caffeine.xyz`

## Quick Reference

### Key Files for Battle System
- `frontend/src/lib/battleUtils.ts` -- Pure battle logic (no React)
- `frontend/src/pages/BattlegroundsPage.tsx` -- Lobby + battle orchestration
- `frontend/src/components/battle/GameBoard.tsx` -- Battle UI + turn controls
- `frontend/src/types/battle.ts` -- BattleCard, BattleDeck, Battle types

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
