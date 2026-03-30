# Mythereum Retro V2 - Architectural Roadmap

## Overview
This document outlines the prioritized architectural improvements focused on render-loop stability and context isolation within the Mythereum Retro V2 system.

---

## ✅ PRIORITY 1: UI Render Loop Stability (COMPLETED)

### Objective
Eliminate cyclical state updates and ensure strict separation between render state and event-driven effects.

### Implemented Improvements

#### BattlegroundsPage Component
- ✅ **Mount-only initialization**: Single `useEffect` with `[]` dependencies
- ✅ **Deep-cloned hero snapshots**: Complete isolation from live hero state
- ✅ **Memoized callbacks**: All handlers wrapped with `useCallback` with stable dependencies
- ✅ **Ref-based guards**: `battleCompletionGuardRef` ensures exactly-once execution
- ✅ **Batched context updates**: All reward operations grouped together
- ✅ **Decoupled state changes**: `setTimeout` used to separate UI updates from context updates
- ✅ **Developer debug logging**: Render count tracking in DEV mode

#### GameBoard Component
- ✅ **Stable initialization**: Single effect with stable deck key
- ✅ **Event-driven turns**: Manual advancement via button click
- ✅ **Functional state updates**: Timer uses functional updates to avoid stale closures
- ✅ **Complete cleanup**: All timers cleared on unmount
- ✅ **Ref-based callback**: `onBattleEndRef` ensures stable reference

#### HeroesContext
- ✅ **Debounced localStorage**: 300ms debounce on all writes
- ✅ **Memoized methods**: All methods wrapped with `useCallback`
- ✅ **Memoized computed data**: `decksWithPower` computed with `useMemo`
- ✅ **No circular dependencies**: Clean separation from other contexts

### Testing Checklist
- [ ] Create battle with 7+ card deck
- [ ] Complete battle and verify rewards granted once
- [ ] Check browser console for render count warnings
- [ ] Verify no "Maximum update depth exceeded" errors
- [ ] Test rapid battle creation/completion cycles

---

## 🔄 PRIORITY 2: Context Isolation and Performance (IN PROGRESS)

### Objective
Split large providers into minimal "read" and "write" subcontexts to reduce shared reactivity.

### Planned Improvements

#### Economy Context Split
