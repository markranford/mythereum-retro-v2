import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Stronghold, Resources, BuildingInstance } from '../types/strongholds';
import { createStarterStronghold, BUILDING_TEMPLATES, NPC_RAID_TARGETS } from '../lib/strongholdMockData';
import { getZoneFromIndex } from '../lib/hexMath';
import { useEconomy } from './EconomyContext';
import { useGameConfig } from './GameConfigContext';
import { StrongholdProductionConfig } from '../types/gameConfig';

interface StrongholdContextType {
  stronghold: Stronghold | null;
  createNewStronghold: (name: string) => void;
  applyTickNow: () => void;
  startUpgrade: (buildingId: string) => boolean;
  finishReadyUpgrades: () => void;
  performTradeWithNpc: (offerId: string) => void;
  launchRaid: (targetId: string, raidDeckPower?: number) => void;
  joinAlliance: (allianceId: string) => void;
  leaveAlliance: () => void;
  assignRaidDeck: (deckId: string) => void;
  assignDefenceDeck: (deckId: string) => void;
  placeBuilding: (templateId: string, positionIndex: number) => void;
  moveBuilding: (buildingId: string, newPositionIndex: number) => void;
  // Phase 4 Soft Mythex methods
  getSoftMythexBalance: () => number;
  changeSoftMythex: (delta: number) => void;
  grantBattleRewards: (rewards: { mythex: number; resources?: Partial<Resources> }) => void;
  // Phase 5 Tournament methods
  canPayEntryFee: (fee: number) => boolean;
  payEntryFee: (fee: number) => void;
  grantTournamentRewards: (rewards: { mythex: number; resources?: Partial<Resources> }) => void;
  // Phase 10: Production collection
  collectProduction: () => void;
  getAccumulatedProduction: () => Resources;
}

const StrongholdContext = createContext<StrongholdContextType | undefined>(undefined);

const STORAGE_KEY = 'retro-mythereum-stronghold-v1';
const TICK_INTERVAL = 30000; // 30 seconds

interface ExtendedStronghold extends Stronghold {
  softMythex?: number;
  lastProductionCollection?: number;
}

// Map building templateId to config production rate key
const PRODUCTION_CONFIG_MAP: Record<string, keyof StrongholdProductionConfig> = {
  goldMine: 'goldMineBase',
  stoneQuarry: 'stoneQuarryBase',
  lumberYard: 'lumberYardBase',
  ironMine: 'ironMineBase',
  farmstead: 'farmsteadBase',
  alchemistLab: 'alchemistLabBase',
};

export function StrongholdProvider({ children }: { children: React.ReactNode }) {
  const { earnResources: economyEarnResources } = useEconomy();
  const { strongholdProduction: shCfg, raids: raidsCfg } = useGameConfig();
  const shCfgRef = useRef(shCfg);
  const raidsCfgRef = useRef(raidsCfg);
  
  const [stronghold, setStronghold] = useState<ExtendedStronghold | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old strongholds without mana
      if (parsed.resources && parsed.resources.mana === undefined) {
        parsed.resources.mana = 50;
      }
      // Initialize softMythex if missing (but don't add 1000 here - only on new account creation)
      if (parsed.softMythex === undefined) {
        parsed.softMythex = 0;
      }
      // Initialize lastProductionCollection if missing
      if (parsed.lastProductionCollection === undefined) {
        parsed.lastProductionCollection = Date.now();
      }
      return parsed;
    }
    return null;
  });

  const strongholdRef = useRef(stronghold);
  useEffect(() => { strongholdRef.current = stronghold; }, [stronghold]);
  useEffect(() => { shCfgRef.current = shCfg; }, [shCfg]);
  useEffect(() => { raidsCfgRef.current = raidsCfg; }, [raidsCfg]);

  // Save to localStorage whenever stronghold changes
  useEffect(() => {
    if (stronghold) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stronghold));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [stronghold]);

  // Get config-aware production rate for a building
  const getBuildingProductionRate = useCallback((templateId: string): number => {
    const cfgKey = PRODUCTION_CONFIG_MAP[templateId];
    if (cfgKey) return shCfgRef.current[cfgKey] as number;
    // Fallback to template default
    const template = BUILDING_TEMPLATES[templateId];
    if (template?.baseProduction) {
      const values = Object.values(template.baseProduction).filter(Boolean);
      return values.length > 0 ? values[0]! : 0;
    }
    return 0;
  }, []);

  // Phase 10: Calculate accumulated production
  const getAccumulatedProduction = useCallback((): Resources => {
    const sh = strongholdRef.current;
    if (!sh) {
      return { gold: 0, stone: 0, lumber: 0, iron: 0, food: 0, mana: 0 };
    }

    const now = Date.now();
    const lastCollection = sh.lastProductionCollection || sh.lastTickTime;
    const hoursElapsed = (now - lastCollection) / (1000 * 60 * 60);

    const production: Resources = { gold: 0, stone: 0, lumber: 0, iron: 0, food: 0, mana: 0 };

    Object.entries(sh.buildings).forEach(([, building]) => {
      const template = BUILDING_TEMPLATES[building.templateId];
      if (template.baseProduction) {
        const rate = getBuildingProductionRate(building.templateId);
        Object.keys(template.baseProduction).forEach(resource => {
          const amount = rate * building.level * hoursElapsed;
          production[resource as keyof Resources] += Math.floor(amount);
        });
      }
    });

    return production;
  }, [getBuildingProductionRate]);

  // Phase 10: Collect production and add to economy
  const collectProduction = useCallback(() => {
    if (!strongholdRef.current) return;

    const production = getAccumulatedProduction();
    const now = Date.now();

    // Add to economy context
    economyEarnResources(production, 'Building Production');

    // Update last collection time
    setStronghold(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        lastProductionCollection: now,
        activityLog: [
          {
            timestamp: now,
            type: 'production',
            message: `Production collected! +${production.gold}g, +${production.stone}s, +${production.lumber}l, +${production.iron}i, +${production.food}f, +${production.mana}m`,
          },
          ...prev.activityLog.slice(0, 19),
        ],
      };
    });
  }, [getAccumulatedProduction, economyEarnResources]);

  // Calculate resource production based on elapsed time
  const applyTickNow = useCallback(() => {
    setStronghold(prev => {
      if (!prev) return prev;
      const now = Date.now();
      const hoursElapsed = (now - prev.lastTickTime) / (1000 * 60 * 60);

      const newResources = { ...prev.resources };

      Object.entries(prev.buildings).forEach(([, building]) => {
        const template = BUILDING_TEMPLATES[building.templateId];
        if (template.baseProduction) {
          const rate = getBuildingProductionRate(building.templateId);
          Object.keys(template.baseProduction).forEach(resource => {
            const production = rate * building.level * hoursElapsed;
            newResources[resource as keyof Resources] += Math.floor(production);
          });
        }
      });

      return {
        ...prev,
        resources: newResources,
        lastTickTime: now,
        activityLog: [
          {
            timestamp: now,
            type: 'production',
            message: `Resources collected! +${Math.floor(hoursElapsed * 60)} minutes of production`,
          },
          ...prev.activityLog.slice(0, 19),
        ],
      };
    });
  }, []);

  // Start building upgrade
  const startUpgrade = useCallback((buildingId: string): boolean => {
    const sh = strongholdRef.current;
    if (!sh) return false;

    const building = sh.buildings[buildingId];
    if (!building || building.upgrading) return false;

    const template = BUILDING_TEMPLATES[building.templateId];
    const cost = template.upgradeCost;

    const canAfford = Object.entries(cost).every(
      ([resource, amount]) => sh.resources[resource as keyof Resources] >= amount
    );

    if (!canAfford) return false;

    setStronghold(prev => {
      if (!prev) return prev;
      const b = prev.buildings[buildingId];
      if (!b) return prev;

      const now = Date.now();
      const upgradeCompleteTime = now + template.upgradeTime * 60 * 60 * 1000;
      const newResources = { ...prev.resources };
      Object.entries(cost).forEach(([resource, amount]) => {
        newResources[resource as keyof Resources] -= amount;
      });

      return {
        ...prev,
        resources: newResources,
        buildings: {
          ...prev.buildings,
          [buildingId]: { ...b, upgrading: true, upgradeStartTime: now, upgradeCompleteTime },
        },
        activityLog: [
          { timestamp: now, type: 'upgrade', message: `Started upgrading ${template.name} to level ${b.level + 1}` },
          ...prev.activityLog.slice(0, 19),
        ],
      };
    });

    return true;
  }, []);

  // Finish ready upgrades
  const finishReadyUpgrades = useCallback(() => {
    setStronghold(prev => {
      if (!prev) return prev;
      const now = Date.now();
      let updated = false;
      const newBuildings = { ...prev.buildings };
      const newLogs = [...prev.activityLog];

      Object.entries(newBuildings).forEach(([buildingId, building]) => {
        if (building.upgrading && building.upgradeCompleteTime && building.upgradeCompleteTime <= now) {
          const template = BUILDING_TEMPLATES[building.templateId];
          newBuildings[buildingId] = {
            ...building,
            level: building.level + 1,
            upgrading: false,
            upgradeStartTime: undefined,
            upgradeCompleteTime: undefined,
          };
          newLogs.unshift({
            timestamp: now,
            type: 'upgrade',
            message: `${template.name} upgraded to level ${building.level + 1}!`,
          });
          updated = true;
        }
      });

      if (!updated) return prev;
      return { ...prev, buildings: newBuildings, activityLog: newLogs.slice(0, 20) };
    });
  }, []);

  // NPC Trade
  const performTradeWithNpc = useCallback((offerId: string) => {
    const trades = [
      { id: 'trade1', give: { gold: 50 }, receive: { stone: 100 } },
      { id: 'trade2', give: { stone: 80 }, receive: { lumber: 120 } },
      { id: 'trade3', give: { lumber: 60 }, receive: { iron: 80 } },
    ];

    const trade = trades.find(t => t.id === offerId);
    if (!trade) return;

    setStronghold(prev => {
      if (!prev) return prev;
      const canAfford = Object.entries(trade.give).every(
        ([resource, amount]) => prev.resources[resource as keyof Resources] >= amount
      );
      if (!canAfford) return prev;

      const now = Date.now();
      const newResources = { ...prev.resources };
      Object.entries(trade.give).forEach(([resource, amount]) => {
        newResources[resource as keyof Resources] -= amount;
      });
      Object.entries(trade.receive).forEach(([resource, amount]) => {
        newResources[resource as keyof Resources] += amount;
      });

      return {
        ...prev,
        resources: newResources,
        activityLog: [
          { timestamp: now, type: 'trade', message: `Trade completed with NPC merchant` },
          ...prev.activityLog.slice(0, 19),
        ],
      };
    });
  }, []);

  // Launch Raid with deck power integration
  const launchRaid = useCallback((targetId: string, raidDeckPower?: number) => {
    const target = raidsCfgRef.current.targets.find(t => t.id === targetId);
    if (!target) return;

    setStronghold(prev => {
      if (!prev) return prev;
      const now = Date.now();

      const strongholdLevel = Object.values(prev.buildings).reduce((sum, b) => sum + b.level, 0);
      const militaryLevels = Object.values(prev.buildings)
        .filter(b => BUILDING_TEMPLATES[b.templateId].category === 'military')
        .reduce((sum, b) => sum + b.level, 0);

      const deckBonus = raidDeckPower ? Math.floor(raidDeckPower / 40) : 0;
      const effectivePower = strongholdLevel + militaryLevels + deckBonus;
      const threatLevel = target.threatLevel || 10;
      const rawWinChance = effectivePower / (effectivePower + threatLevel);
      const winChance = Math.max(0.2, Math.min(0.9, rawWinChance));
      const success = Math.random() < winChance;

      if (success) {
        const newResources = { ...prev.resources };
        Object.entries(target.rewards).forEach(([resource, amount]) => {
          if (amount) newResources[resource as keyof Resources] += amount;
        });
        return {
          ...prev,
          resources: newResources,
          activityLog: [
            { timestamp: now, type: 'raid', message: `Raid on ${target.name} successful! Plundered resources.${raidDeckPower ? ` (Band Power: ${raidDeckPower})` : ''}` },
            ...prev.activityLog.slice(0, 19),
          ],
        };
      } else {
        return {
          ...prev,
          activityLog: [
            { timestamp: now, type: 'raid', message: `Raid on ${target.name} failed. Better luck next time.${raidDeckPower ? ` (Band Power: ${raidDeckPower})` : ''}` },
            ...prev.activityLog.slice(0, 19),
          ],
        };
      }
    });
  }, []);

  // Alliance management
  const joinAlliance = useCallback((allianceId: string) => {
    setStronghold(prev => {
      if (!prev) return prev;
      const now = Date.now();
      return {
        ...prev, allianceId,
        activityLog: [{ timestamp: now, type: 'alliance', message: `Joined alliance!` }, ...prev.activityLog.slice(0, 19)],
      };
    });
  }, []);

  const leaveAlliance = useCallback(() => {
    setStronghold(prev => {
      if (!prev) return prev;
      const now = Date.now();
      return {
        ...prev, allianceId: null,
        activityLog: [{ timestamp: now, type: 'alliance', message: `Left alliance` }, ...prev.activityLog.slice(0, 19)],
      };
    });
  }, []);

  // Assign raid deck
  const assignRaidDeck = useCallback((deckId: string) => {
    setStronghold(prev => prev ? { ...prev, assignedRaidDeckId: deckId } : prev);
  }, []);

  // Assign defence deck
  const assignDefenceDeck = useCallback((deckId: string) => {
    setStronghold(prev => prev ? { ...prev, assignedDefenceDeckId: deckId } : prev);
  }, []);

  // Place new building
  const placeBuilding = useCallback((templateId: string, positionIndex: number) => {
    const template = BUILDING_TEMPLATES[templateId];
    if (!template) return;

    const zone = getZoneFromIndex(positionIndex);
    if (!template.allowedZones.includes(zone)) return;

    setStronghold(prev => {
      if (!prev) return prev;
      const occupied = Object.values(prev.buildings).some(b => b.positionIndex === positionIndex);
      if (occupied) return prev;

      const now = Date.now();
      const buildingId = `${templateId}_${now}`;
      const newBuilding: BuildingInstance = { templateId, level: 1, upgrading: false, positionIndex };

      return {
        ...prev,
        buildings: { ...prev.buildings, [buildingId]: newBuilding },
        activityLog: [
          { timestamp: now, type: 'production', message: `${template.name} constructed at ${zone} zone` },
          ...prev.activityLog.slice(0, 19),
        ],
      };
    });
  }, []);

  // Move existing building
  const moveBuilding = useCallback((buildingId: string, newPositionIndex: number) => {
    setStronghold(prev => {
      if (!prev) return prev;
      const building = prev.buildings[buildingId];
      if (!building) return prev;

      const template = BUILDING_TEMPLATES[building.templateId];
      if (!template) return prev;

      const zone = getZoneFromIndex(newPositionIndex);
      if (!template.allowedZones.includes(zone)) return prev;

      const occupied = Object.entries(prev.buildings).some(
        ([id, b]) => b.positionIndex === newPositionIndex && id !== buildingId
      );
      if (occupied) return prev;

      const now = Date.now();
      return {
        ...prev,
        buildings: { ...prev.buildings, [buildingId]: { ...building, positionIndex: newPositionIndex } },
        activityLog: [
          { timestamp: now, type: 'production', message: `${template.name} relocated to ${zone} zone` },
          ...prev.activityLog.slice(0, 19),
        ],
      };
    });
  }, []);

  // Phase 4: Get Soft Mythex balance
  const getSoftMythexBalance = useCallback((): number => {
    return strongholdRef.current?.softMythex || 0;
  }, []);

  // Phase 4: Change Soft Mythex balance
  const changeSoftMythex = useCallback((delta: number) => {
    setStronghold((prev) => {
      if (!prev) {
        // If no stronghold exists yet, create a minimal one with just the balance
        const now = Date.now();
        return {
          id: `temp_${now}`,
          name: '',
          createdAt: now,
          level: 0,
          population: 0,
          resources: { gold: 0, stone: 0, lumber: 0, iron: 0, food: 0, mana: 0 },
          buildings: {},
          lastTickTime: now,
          activityLog: [],
          allianceId: null,
          assignedRaidDeckId: null,
          assignedDefenceDeckId: null,
          softMythex: Math.max(0, delta),
          lastProductionCollection: now,
        };
      }

      const currentBalance = prev.softMythex || 0;
      const newBalance = Math.max(0, currentBalance + delta);

      return {
        ...prev,
        softMythex: newBalance,
      };
    });
  }, []);

  // Phase 4: Grant battle rewards
  const grantBattleRewards = useCallback((rewards: { mythex: number; resources?: Partial<Resources> }) => {
    setStronghold(prev => {
      if (!prev) return prev;
      const now = Date.now();
      const newBalance = (prev.softMythex || 0) + rewards.mythex;
      const newResources = { ...prev.resources };
      if (rewards.resources) {
        Object.entries(rewards.resources).forEach(([resource, amount]) => {
          if (amount) newResources[resource as keyof Resources] += amount;
        });
      }
      return {
        ...prev,
        softMythex: newBalance,
        resources: newResources,
        activityLog: [
          { timestamp: now, type: 'raid', message: `Battle rewards: +${rewards.mythex} Soft Mythex${rewards.resources ? ', +resources' : ''}` },
          ...prev.activityLog.slice(0, 19),
        ],
      };
    });
  }, []);

  // Phase 5: Check if can pay entry fee
  const canPayEntryFee = useCallback((fee: number): boolean => {
    const balance = getSoftMythexBalance();
    return balance >= fee;
  }, [getSoftMythexBalance]);

  // Phase 5: Pay entry fee
  const payEntryFee = useCallback((fee: number) => {
    changeSoftMythex(-fee);
  }, [changeSoftMythex]);

  // Phase 5: Grant tournament rewards
  const grantTournamentRewards = useCallback((rewards: { mythex: number; resources?: Partial<Resources> }) => {
    grantBattleRewards(rewards);
  }, [grantBattleRewards]);

  const createNewStronghold = useCallback((name: string) => {
    const newStronghold = createStarterStronghold(name);
    setStronghold({
      ...newStronghold,
      softMythex: 0, // Don't add balance here - it's added by AccountContext
      lastProductionCollection: Date.now(),
    });
  }, []);

  // Periodic tick - restarts when tick interval config changes
  useEffect(() => {
    const tickMs = shCfgRef.current.tickIntervalMs || 30000;
    const interval = setInterval(() => {
      if (!strongholdRef.current) return;
      applyTickNow();
      finishReadyUpgrades();
    }, tickMs);

    return () => clearInterval(interval);
  }, [applyTickNow, finishReadyUpgrades, shCfg.tickIntervalMs]);

  const contextValue = useMemo(() => ({
    stronghold,
    createNewStronghold,
    applyTickNow,
    startUpgrade,
    finishReadyUpgrades,
    performTradeWithNpc,
    launchRaid,
    joinAlliance,
    leaveAlliance,
    assignRaidDeck,
    assignDefenceDeck,
    placeBuilding,
    moveBuilding,
    getSoftMythexBalance,
    changeSoftMythex,
    grantBattleRewards,
    canPayEntryFee,
    payEntryFee,
    grantTournamentRewards,
    collectProduction,
    getAccumulatedProduction,
  }), [stronghold, createNewStronghold, applyTickNow, startUpgrade, finishReadyUpgrades, performTradeWithNpc, launchRaid, joinAlliance, leaveAlliance, assignRaidDeck, assignDefenceDeck, placeBuilding, moveBuilding, getSoftMythexBalance, changeSoftMythex, grantBattleRewards, canPayEntryFee, payEntryFee, grantTournamentRewards, collectProduction, getAccumulatedProduction]);

  return (
    <StrongholdContext.Provider value={contextValue}>
      {children}
    </StrongholdContext.Provider>
  );
}

export function useStronghold() {
  const context = useContext(StrongholdContext);
  if (!context) {
    throw new Error('useStronghold must be used within StrongholdProvider');
  }
  return context;
}
