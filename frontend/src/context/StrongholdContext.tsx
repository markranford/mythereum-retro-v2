import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Stronghold, Resources, BuildingInstance } from '../types/strongholds';
import { createStarterStronghold, BUILDING_TEMPLATES, NPC_RAID_TARGETS } from '../lib/strongholdMockData';
import { getZoneFromIndex } from '../lib/hexMath';
import { useEconomy } from './EconomyContext';

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

export function StrongholdProvider({ children }: { children: React.ReactNode }) {
  const { earnResources: economyEarnResources } = useEconomy();
  
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

  // Save to localStorage whenever stronghold changes
  useEffect(() => {
    if (stronghold) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stronghold));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [stronghold]);

  // Phase 10: Calculate accumulated production
  const getAccumulatedProduction = useCallback((): Resources => {
    if (!stronghold) {
      return { gold: 0, stone: 0, lumber: 0, iron: 0, food: 0, mana: 0 };
    }

    const now = Date.now();
    const lastCollection = stronghold.lastProductionCollection || stronghold.lastTickTime;
    const hoursElapsed = (now - lastCollection) / (1000 * 60 * 60);

    const production: Resources = { gold: 0, stone: 0, lumber: 0, iron: 0, food: 0, mana: 0 };
    
    Object.entries(stronghold.buildings).forEach(([, building]) => {
      const template = BUILDING_TEMPLATES[building.templateId];
      if (template.baseProduction) {
        Object.entries(template.baseProduction).forEach(([resource, baseAmount]) => {
          if (baseAmount) {
            const amount = baseAmount * building.level * hoursElapsed;
            production[resource as keyof Resources] += Math.floor(amount);
          }
        });
      }
    });

    return production;
  }, [stronghold]);

  // Phase 10: Collect production and add to economy
  const collectProduction = useCallback(() => {
    if (!stronghold) return;

    const production = getAccumulatedProduction();
    const now = Date.now();

    // Add to economy context
    economyEarnResources(production, 'Building Production');

    // Update last collection time
    setStronghold({
      ...stronghold,
      lastProductionCollection: now,
      activityLog: [
        {
          timestamp: now,
          type: 'production',
          message: `Production collected! +${production.gold}g, +${production.stone}s, +${production.lumber}l, +${production.iron}i, +${production.food}f, +${production.mana}m`,
        },
        ...stronghold.activityLog.slice(0, 19),
      ],
    });
  }, [stronghold, getAccumulatedProduction, economyEarnResources]);

  // Calculate resource production based on elapsed time
  const applyTickNow = useCallback(() => {
    if (!stronghold) return;

    const now = Date.now();
    const hoursElapsed = (now - stronghold.lastTickTime) / (1000 * 60 * 60);

    const newResources = { ...stronghold.resources };
    
    Object.entries(stronghold.buildings).forEach(([, building]) => {
      const template = BUILDING_TEMPLATES[building.templateId];
      if (template.baseProduction) {
        Object.entries(template.baseProduction).forEach(([resource, baseAmount]) => {
          if (baseAmount) {
            const production = baseAmount * building.level * hoursElapsed;
            newResources[resource as keyof Resources] += Math.floor(production);
          }
        });
      }
    });

    setStronghold({
      ...stronghold,
      resources: newResources,
      lastTickTime: now,
      activityLog: [
        {
          timestamp: now,
          type: 'production',
          message: `Resources collected! +${Math.floor(hoursElapsed * 60)} minutes of production`,
        },
        ...stronghold.activityLog.slice(0, 19),
      ],
    });
  }, [stronghold]);

  // Start building upgrade
  const startUpgrade = useCallback((buildingId: string): boolean => {
    if (!stronghold) return false;

    const building = stronghold.buildings[buildingId];
    if (!building || building.upgrading) return false;

    const template = BUILDING_TEMPLATES[building.templateId];
    const cost = template.upgradeCost;

    // Check if player has enough resources in economy
    const canAfford = Object.entries(cost).every(
      ([resource, amount]) => stronghold.resources[resource as keyof Resources] >= amount
    );

    if (!canAfford) return false;

    const now = Date.now();
    const upgradeCompleteTime = now + template.upgradeTime * 60 * 60 * 1000;

    // Deduct resources
    const newResources = { ...stronghold.resources };
    Object.entries(cost).forEach(([resource, amount]) => {
      newResources[resource as keyof Resources] -= amount;
    });

    setStronghold({
      ...stronghold,
      resources: newResources,
      buildings: {
        ...stronghold.buildings,
        [buildingId]: {
          ...building,
          upgrading: true,
          upgradeStartTime: now,
          upgradeCompleteTime,
        },
      },
      activityLog: [
        {
          timestamp: now,
          type: 'upgrade',
          message: `Started upgrading ${template.name} to level ${building.level + 1}`,
        },
        ...stronghold.activityLog.slice(0, 19),
      ],
    });

    return true;
  }, [stronghold]);

  // Finish ready upgrades
  const finishReadyUpgrades = useCallback(() => {
    if (!stronghold) return;

    const now = Date.now();
    let updated = false;
    const newBuildings = { ...stronghold.buildings };
    const newLogs = [...stronghold.activityLog];

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

    if (updated) {
      setStronghold({
        ...stronghold,
        buildings: newBuildings,
        activityLog: newLogs.slice(0, 20),
      });
    }
  }, [stronghold]);

  // NPC Trade
  const performTradeWithNpc = useCallback((offerId: string) => {
    if (!stronghold) return;

    const now = Date.now();
    const trades = [
      { id: 'trade1', give: { gold: 50 }, receive: { stone: 100 } },
      { id: 'trade2', give: { stone: 80 }, receive: { lumber: 120 } },
      { id: 'trade3', give: { lumber: 60 }, receive: { iron: 80 } },
    ];

    const trade = trades.find(t => t.id === offerId);
    if (!trade) return;

    // Check if can afford
    const canAfford = Object.entries(trade.give).every(
      ([resource, amount]) => stronghold.resources[resource as keyof Resources] >= amount
    );

    if (!canAfford) return;

    const newResources = { ...stronghold.resources };
    Object.entries(trade.give).forEach(([resource, amount]) => {
      newResources[resource as keyof Resources] -= amount;
    });
    Object.entries(trade.receive).forEach(([resource, amount]) => {
      newResources[resource as keyof Resources] += amount;
    });

    setStronghold({
      ...stronghold,
      resources: newResources,
      activityLog: [
        {
          timestamp: now,
          type: 'trade',
          message: `Trade completed with NPC merchant`,
        },
        ...stronghold.activityLog.slice(0, 19),
      ],
    });
  }, [stronghold]);

  // Launch Raid with deck power integration
  const launchRaid = useCallback((targetId: string, raidDeckPower?: number) => {
    if (!stronghold) return;

    const target = NPC_RAID_TARGETS.find(t => t.id === targetId);
    if (!target) return;

    const now = Date.now();
    
    // Calculate stronghold level (sum of all building levels)
    const strongholdLevel = Object.values(stronghold.buildings).reduce((sum, b) => sum + b.level, 0);
    
    // Calculate military building levels
    const militaryLevels = Object.values(stronghold.buildings)
      .filter(b => BUILDING_TEMPLATES[b.templateId].category === 'military')
      .reduce((sum, b) => sum + b.level, 0);
    
    // Calculate effective power with deck bonus
    const deckBonus = raidDeckPower ? Math.floor(raidDeckPower / 40) : 0;
    const effectivePower = strongholdLevel + militaryLevels + deckBonus;
    
    // Use threat level from target
    const threatLevel = target.threatLevel || 10;
    
    // Calculate win chance (clamped between 20% and 90%)
    const rawWinChance = effectivePower / (effectivePower + threatLevel);
    const winChance = Math.max(0.2, Math.min(0.9, rawWinChance));
    
    const success = Math.random() < winChance;

    if (success) {
      const newResources = { ...stronghold.resources };
      Object.entries(target.rewards).forEach(([resource, amount]) => {
        if (amount) {
          newResources[resource as keyof Resources] += amount;
        }
      });

      setStronghold({
        ...stronghold,
        resources: newResources,
        activityLog: [
          {
            timestamp: now,
            type: 'raid',
            message: `Raid on ${target.name} successful! Plundered resources.${raidDeckPower ? ` (Band Power: ${raidDeckPower})` : ''}`,
          },
          ...stronghold.activityLog.slice(0, 19),
        ],
      });
    } else {
      setStronghold({
        ...stronghold,
        activityLog: [
          {
            timestamp: now,
            type: 'raid',
            message: `Raid on ${target.name} failed. Better luck next time.${raidDeckPower ? ` (Band Power: ${raidDeckPower})` : ''}`,
          },
          ...stronghold.activityLog.slice(0, 19),
        ],
      });
    }
  }, [stronghold]);

  // Alliance management
  const joinAlliance = useCallback((allianceId: string) => {
    if (!stronghold) return;

    const now = Date.now();
    setStronghold({
      ...stronghold,
      allianceId,
      activityLog: [
        {
          timestamp: now,
          type: 'alliance',
          message: `Joined alliance!`,
        },
        ...stronghold.activityLog.slice(0, 19),
      ],
    });
  }, [stronghold]);

  const leaveAlliance = useCallback(() => {
    if (!stronghold) return;

    const now = Date.now();
    setStronghold({
      ...stronghold,
      allianceId: null,
      activityLog: [
        {
          timestamp: now,
          type: 'alliance',
          message: `Left alliance`,
        },
        ...stronghold.activityLog.slice(0, 19),
      ],
    });
  }, [stronghold]);

  // Assign raid deck
  const assignRaidDeck = useCallback((deckId: string) => {
    if (!stronghold) return;

    setStronghold({
      ...stronghold,
      assignedRaidDeckId: deckId,
    });
  }, [stronghold]);

  // Assign defence deck
  const assignDefenceDeck = useCallback((deckId: string) => {
    if (!stronghold) return;

    setStronghold({
      ...stronghold,
      assignedDefenceDeckId: deckId,
    });
  }, [stronghold]);

  // Place new building
  const placeBuilding = useCallback((templateId: string, positionIndex: number) => {
    if (!stronghold) return;

    const template = BUILDING_TEMPLATES[templateId];
    if (!template) return;

    // Validate zone
    const zone = getZoneFromIndex(positionIndex);
    if (!template.allowedZones.includes(zone)) return;

    // Check if position is occupied
    const occupied = Object.values(stronghold.buildings).some(b => b.positionIndex === positionIndex);
    if (occupied) return;

    const now = Date.now();
    const buildingId = `${templateId}_${now}`;

    const newBuilding: BuildingInstance = {
      templateId,
      level: 1,
      upgrading: false,
      positionIndex,
    };

    setStronghold({
      ...stronghold,
      buildings: {
        ...stronghold.buildings,
        [buildingId]: newBuilding,
      },
      activityLog: [
        {
          timestamp: now,
          type: 'production',
          message: `${template.name} constructed at ${zone} zone`,
        },
        ...stronghold.activityLog.slice(0, 19),
      ],
    });
  }, [stronghold]);

  // Move existing building
  const moveBuilding = useCallback((buildingId: string, newPositionIndex: number) => {
    if (!stronghold) return;

    const building = stronghold.buildings[buildingId];
    if (!building) return;

    const template = BUILDING_TEMPLATES[building.templateId];
    if (!template) return;

    // Validate zone
    const zone = getZoneFromIndex(newPositionIndex);
    if (!template.allowedZones.includes(zone)) return;

    // Check if position is occupied by another building
    const occupied = Object.entries(stronghold.buildings).some(
      ([id, b]) => b.positionIndex === newPositionIndex && id !== buildingId
    );
    if (occupied) return;

    const now = Date.now();

    setStronghold({
      ...stronghold,
      buildings: {
        ...stronghold.buildings,
        [buildingId]: {
          ...building,
          positionIndex: newPositionIndex,
        },
      },
      activityLog: [
        {
          timestamp: now,
          type: 'production',
          message: `${template.name} relocated to ${zone} zone`,
        },
        ...stronghold.activityLog.slice(0, 19),
      ],
    });
  }, [stronghold]);

  // Phase 4: Get Soft Mythex balance
  const getSoftMythexBalance = useCallback((): number => {
    return stronghold?.softMythex || 0;
  }, [stronghold]);

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
    if (!stronghold) return;

    const now = Date.now();
    const currentBalance = stronghold.softMythex || 0;
    const newBalance = currentBalance + rewards.mythex;

    const newResources = { ...stronghold.resources };
    if (rewards.resources) {
      Object.entries(rewards.resources).forEach(([resource, amount]) => {
        if (amount) {
          newResources[resource as keyof Resources] += amount;
        }
      });
    }

    setStronghold({
      ...stronghold,
      softMythex: newBalance,
      resources: newResources,
      activityLog: [
        {
          timestamp: now,
          type: 'raid',
          message: `Battle rewards: +${rewards.mythex} Soft Mythex${rewards.resources ? ', +resources' : ''}`,
        },
        ...stronghold.activityLog.slice(0, 19),
      ],
    });
  }, [stronghold]);

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

  // Periodic tick
  useEffect(() => {
    if (!stronghold) return;

    const interval = setInterval(() => {
      applyTickNow();
      finishReadyUpgrades();
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [stronghold, applyTickNow, finishReadyUpgrades]);

  return (
    <StrongholdContext.Provider
      value={{
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
      }}
    >
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
