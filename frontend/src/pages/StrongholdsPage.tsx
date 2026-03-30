import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useStronghold } from '../context/StrongholdContext';
import { useHeroes } from '../context/HeroesContext';
import { useEconomy } from '../context/EconomyContext';
import LayerGate from '../components/LayerGate';
import WalletSummary from '../components/WalletSummary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import ResourceBar from '../components/strongholds/ResourceBar';
import BuildingCard from '../components/strongholds/BuildingCard';
import StrongholdMap from '../components/strongholds/StrongholdMap';
import { BUILDING_TEMPLATES, DEFAULT_ALLIANCES, NPC_RAID_TARGETS } from '../lib/strongholdMockData';
import { CARD_LIBRARY } from '../lib/mockData';
import { Castle, Users, Swords, Store, RefreshCw, Shield, Gift, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function StrongholdsContent() {
  const { identity } = useInternetIdentity();
  const {
    stronghold,
    createNewStronghold,
    startUpgrade,
    performTradeWithNpc,
    launchRaid,
    joinAlliance,
    leaveAlliance,
    assignRaidDeck,
    assignDefenceDeck,
    placeBuilding,
    moveBuilding,
    collectProduction,
    getAccumulatedProduction,
  } = useStronghold();
  const { decksWithPower, addHero } = useHeroes();
  const { earnResources } = useEconomy();

  const [strongholdName, setStrongholdName] = useState('');
  const [hasCollectedStarter, setHasCollectedStarter] = useState(() => {
    return localStorage.getItem('retro-mythereum-starter-collected') === 'true';
  });

  if (!identity) {
    return (
      <div className="text-center py-12">
        <Castle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Login Required</h2>
        <p className="text-amber-200/70">Please login to access your stronghold.</p>
      </div>
    );
  }

  const handleCollectStarter = () => {
    earnResources(
      {
        gold: 500,
        stone: 500,
        lumber: 500,
        iron: 500,
        food: 500,
        mana: 100,
      },
      'Starter Resources'
    );
    setHasCollectedStarter(true);
    localStorage.setItem('retro-mythereum-starter-collected', 'true');
    toast.success('Starter resources collected!', {
      description: '+500 Gold, Stone, Lumber, Iron, Food and +100 Mana',
    });
  };

  // Phase 10: Hero recruitment
  const handleRecruitHero = () => {
    // Pick a random hero from the card library
    const availableHeroes = CARD_LIBRARY.filter(card => card.cardType === 'Hero');
    if (availableHeroes.length === 0) {
      toast.error('No heroes available for recruitment');
      return;
    }

    const randomHero = availableHeroes[Math.floor(Math.random() * availableHeroes.length)];
    addHero(randomHero.id, 'recruited');
    
    toast.success('Hero recruited!', {
      description: `${randomHero.name} has joined your collection`,
    });
  };

  if (!stronghold) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <Castle className="w-24 h-24 text-amber-400 mx-auto" />
        <h1 className="text-4xl font-bold text-amber-400">Build Your Stronghold</h1>
        <p className="text-xl text-amber-200/80">
          Your stronghold is your base of operations. Build it to unlock resource production, military capabilities, and strengthen your position in Mythereum.
        </p>

        <WalletSummary variant="panel" />

        <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-amber-400">Name Your Stronghold</CardTitle>
            <CardDescription className="text-amber-200/70">
              Choose a name that will strike fear into your enemies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="Enter stronghold name..."
              value={strongholdName}
              onChange={(e) => setStrongholdName(e.target.value)}
              className="bg-slate-900/50 border-amber-500/30 text-amber-200 placeholder:text-amber-200/40"
            />
            <Button
              onClick={() => {
                if (strongholdName.trim()) {
                  createNewStronghold(strongholdName.trim());
                }
              }}
              disabled={!strongholdName.trim()}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold px-8 py-3 text-lg"
            >
              Start as Warlord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canAffordUpgrade = (buildingId: string) => {
    const building = stronghold.buildings[buildingId];
    if (!building) return false;
    const template = BUILDING_TEMPLATES[building.templateId];
    return Object.entries(template.upgradeCost).every(
      ([resource, amount]) => stronghold.resources[resource as keyof typeof stronghold.resources] >= amount
    );
  };

  const currentAlliance = DEFAULT_ALLIANCES.find(a => a.id === stronghold.allianceId);
  
  const selectedRaidDeck = decksWithPower.find(d => d.id === stronghold.assignedRaidDeckId);
  const selectedDefenceDeck = decksWithPower.find(d => d.id === stronghold.assignedDefenceDeckId);

  // Phase 10: Calculate accumulated production
  const accumulatedProduction = getAccumulatedProduction();
  const hasProduction = Object.values(accumulatedProduction).some(v => v > 0);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-amber-400">{stronghold.name}</h1>
        <p className="text-amber-200/80">Population: {stronghold.population}</p>
      </div>

      <WalletSummary variant="inline" />

      <ResourceBar resources={stronghold.resources} />

      {!hasCollectedStarter && (
        <Card className="bg-gradient-to-r from-green-900/40 to-green-800/40 border-2 border-green-500/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 text-green-400" />
                <div>
                  <div className="font-bold text-green-300 text-lg">Starter Resources Available!</div>
                  <div className="text-sm text-green-200/70">
                    Claim +500 Gold, Stone, Lumber, Iron, Food and +100 Mana
                  </div>
                </div>
              </div>
              <Button
                onClick={handleCollectStarter}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold"
              >
                <Gift className="w-4 h-4 mr-2" />
                Collect Starter Resources
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 10: Production Collection Panel */}
      {hasProduction && (
        <Card className="bg-gradient-to-r from-amber-900/40 to-amber-800/40 border-2 border-amber-500/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-amber-400" />
                <div>
                  <div className="font-bold text-amber-300 text-lg">Production Ready!</div>
                  <div className="text-sm text-amber-200/70">
                    +{accumulatedProduction.gold}g, +{accumulatedProduction.stone}s, +{accumulatedProduction.lumber}l, +{accumulatedProduction.iron}i, +{accumulatedProduction.food}f, +{accumulatedProduction.mana}m
                  </div>
                </div>
              </div>
              <Button
                onClick={collectProduction}
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Collect Production
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="hq" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-slate-800/60 border border-amber-500/30">
          <TabsTrigger value="hq" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            HQ
          </TabsTrigger>
          <TabsTrigger value="production" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Production
          </TabsTrigger>
          <TabsTrigger value="commerce" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Commerce
          </TabsTrigger>
          <TabsTrigger value="warroom" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            War Room
          </TabsTrigger>
          <TabsTrigger value="alliances" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Alliances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hq" className="space-y-6">
          <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <Castle className="w-5 h-5" />
                Headquarters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-amber-200/80">
                <div>
                  <div className="text-sm text-amber-300/70">Buildings</div>
                  <div className="text-2xl font-bold text-amber-400">{Object.keys(stronghold.buildings).length}</div>
                </div>
                <div>
                  <div className="text-sm text-amber-300/70">Population</div>
                  <div className="text-2xl font-bold text-amber-400">{stronghold.population}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phase 10: Hero Recruitment Section */}
          <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Hero Recruitment
              </CardTitle>
              <CardDescription className="text-amber-200/70">
                Recruit new heroes to strengthen your bands
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-200/70">
                Your stronghold attracts wandering heroes seeking glory and fortune. Recruit them to expand your collection and build more powerful bands.
              </p>
              <Button
                onClick={handleRecruitHero}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold"
              >
                <Users className="w-4 h-4 mr-2" />
                Recruit Random Hero
              </Button>
              <p className="text-xs text-amber-300/60 text-center">
                Heroes can also be recruited through the Market and earned in battles
              </p>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-xl font-bold text-amber-400 mb-4">All Buildings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stronghold.buildings).map(([buildingId, building]) => (
                <BuildingCard
                  key={buildingId}
                  buildingId={buildingId}
                  building={building}
                  onUpgrade={startUpgrade}
                  canAfford={canAffordUpgrade(buildingId)}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-amber-400 mb-4">Activity Log</h3>
            <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stronghold.activityLog.map((log, index) => (
                    <div key={index} className="text-sm text-amber-200/70 border-b border-amber-500/10 pb-2">
                      <span className="text-amber-400/60">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      {' - '}
                      {log.message}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-amber-400 mb-4 text-center">Stronghold Map</h3>
            <StrongholdMap
              buildings={stronghold.buildings}
              onBuildingPlace={placeBuilding}
              onBuildingMove={moveBuilding}
            />
          </div>
        </TabsContent>

        <TabsContent value="commerce" className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-amber-400 mb-4">NPC Trade Offers</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-amber-400 text-lg">Trade Gold for Stone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-amber-200/70">
                    <div>Give: 50 Gold</div>
                    <div>Receive: 100 Stone</div>
                  </div>
                  <Button
                    onClick={() => performTradeWithNpc('trade1')}
                    disabled={stronghold.resources.gold < 50}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
                    size="sm"
                  >
                    <Store className="w-4 h-4 mr-1" />
                    Trade
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-amber-400 text-lg">Trade Stone for Lumber</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-amber-200/70">
                    <div>Give: 80 Stone</div>
                    <div>Receive: 120 Lumber</div>
                  </div>
                  <Button
                    onClick={() => performTradeWithNpc('trade2')}
                    disabled={stronghold.resources.stone < 80}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
                    size="sm"
                  >
                    <Store className="w-4 h-4 mr-1" />
                    Trade
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-amber-400 text-lg">Trade Lumber for Iron</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-amber-200/70">
                    <div>Give: 60 Lumber</div>
                    <div>Receive: 80 Iron</div>
                  </div>
                  <Button
                    onClick={() => performTradeWithNpc('trade3')}
                    disabled={stronghold.resources.lumber < 60}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
                    size="sm"
                  >
                    <Store className="w-4 h-4 mr-1" />
                    Trade
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="warroom" className="space-y-6">
          <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <Swords className="w-5 h-5" />
                Band Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-amber-300/70 mb-2 block">Raid Band (Offensive)</label>
                  <Select
                    value={stronghold.assignedRaidDeckId || 'none'}
                    onValueChange={(value) => value !== 'none' && assignRaidDeck(value)}
                  >
                    <SelectTrigger className="bg-slate-900/50 border-amber-500/30">
                      <SelectValue placeholder="Select raid band..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No band assigned</SelectItem>
                      {decksWithPower.map(deck => (
                        <SelectItem key={deck.id} value={deck.id}>
                          {deck.name} (⚡ {deck.totalPower})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRaidDeck && (
                    <div className="mt-2 text-sm text-amber-300/80">
                      <div>Cards: {selectedRaidDeck.cardCount}</div>
                      <div>Total Power: ⚡ {selectedRaidDeck.totalPower}</div>
                      <div className="text-xs text-amber-300/60 mt-1">
                        Raid Bonus: +{Math.floor(selectedRaidDeck.totalPower / 40)} effective power
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-amber-300/70 mb-2 block">Defence Band (Defensive)</label>
                  <Select
                    value={stronghold.assignedDefenceDeckId || 'none'}
                    onValueChange={(value) => value !== 'none' && assignDefenceDeck(value)}
                  >
                    <SelectTrigger className="bg-slate-900/50 border-amber-500/30">
                      <SelectValue placeholder="Select defence band..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No band assigned</SelectItem>
                      {decksWithPower.map(deck => (
                        <SelectItem key={deck.id} value={deck.id}>
                          {deck.name} (⚡ {deck.totalPower})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDefenceDeck && (
                    <div className="mt-2 text-sm text-amber-300/80">
                      <div>Cards: {selectedDefenceDeck.cardCount}</div>
                      <div>Total Power: ⚡ {selectedDefenceDeck.totalPower}</div>
                      <div className="text-xs text-amber-300/60 mt-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Protects your stronghold from attacks
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-xl font-bold text-amber-400 mb-4">Available Raid Targets</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {NPC_RAID_TARGETS.map((target) => (
                <Card key={target.id} className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-amber-400 text-lg">{target.name}</CardTitle>
                    <CardDescription className="text-amber-200/70">
                      Difficulty: <span className={
                        target.difficulty === 'easy' ? 'text-green-400' :
                        target.difficulty === 'medium' ? 'text-yellow-400' :
                        'text-red-400'
                      }>{target.difficulty}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-amber-200/70">{target.description}</p>
                    <div className="text-sm text-amber-300/80">
                      <div className="font-semibold">Potential Rewards:</div>
                      <div className="text-xs">
                        {Object.entries(target.rewards).map(([resource, amount]) => (
                          <div key={resource}>{resource}: {amount}</div>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => launchRaid(target.id, selectedRaidDeck?.totalPower)}
                      className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold"
                      size="sm"
                    >
                      <Swords className="w-4 h-4 mr-1" />
                      Launch Raid
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alliances" className="space-y-6">
          {currentAlliance ? (
            <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-amber-400 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Current Alliance: {currentAlliance.name}
                </CardTitle>
                <CardDescription className="text-amber-200/70">
                  {currentAlliance.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-amber-300/70 mb-2">Members: {currentAlliance.memberCount}</div>
                  <div className="text-sm text-amber-300/70 mb-2">Active Bonuses:</div>
                  <div className="space-y-1">
                    {currentAlliance.bonuses.map((bonus, index) => (
                      <div key={index} className="text-sm text-amber-400">• {bonus}</div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={leaveAlliance}
                  variant="destructive"
                  className="w-full"
                >
                  Leave Alliance
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div>
              <h3 className="text-xl font-bold text-amber-400 mb-4">Available Alliances</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DEFAULT_ALLIANCES.map((alliance) => (
                  <Card key={alliance.id} className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-amber-400">{alliance.name}</CardTitle>
                      <CardDescription className="text-amber-200/70">
                        {alliance.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-amber-300/70">
                        Members: {alliance.memberCount}
                      </div>
                      <div className="text-sm text-amber-300/80">
                        <div className="font-semibold mb-1">Bonuses:</div>
                        {alliance.bonuses.map((bonus, index) => (
                          <div key={index} className="text-xs">• {bonus}</div>
                        ))}
                      </div>
                      <Button
                        onClick={() => joinAlliance(alliance.id)}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold"
                        size="sm"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Join Alliance
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StrongholdsPage() {
  return (
    <LayerGate minLayer={1} featureName="Strongholds">
      <StrongholdsContent />
    </LayerGate>
  );
}
