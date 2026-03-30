import { useState } from 'react';
import { useGameConfig, useGameConfigAdmin } from '../context/GameConfigContext';
import { DEFAULT_GAME_CONFIG } from '../config/gameConfigDefaults';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Settings, Lock, RotateCcw, Swords, Trophy, Heart, Coins, Building2, Store, Target, Layers, Save, Trash2, FolderOpen } from 'lucide-react';

function ConfigSlider({ label, value, min, max, step, onChange, unit }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-amber-200/80">{label}</span>
        <span className="text-amber-400 font-bold">{value}{unit || ''}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step || 1}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  );
}

function CategoryHeader({ title, icon, onReset }: { title: string; icon: React.ReactNode; onReset: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-bold text-amber-300 flex items-center gap-2">{icon} {title}</h3>
      <Button onClick={onReset} variant="outline" size="sm" className="border-amber-600/40 text-amber-400 gap-1">
        <RotateCcw className="w-3 h-3" /> Reset
      </Button>
    </div>
  );
}

export default function AdminGameConfigPage() {
  const { identity } = useInternetIdentity();
  const config = useGameConfig();
  const { updateCategory, resetCategory, resetAll, activeProfileName, profileNames, saveProfile, loadProfile, deleteProfile } = useGameConfigAdmin();
  const [newProfileName, setNewProfileName] = useState('');

  if (!identity) {
    return (
      <div className="text-center py-12">
        <Lock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Access Restricted</h2>
        <p className="text-amber-200/70">Please login to access Game Config.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-amber-400 flex items-center justify-center gap-3">
          <Settings className="w-10 h-10" />
          Game Config
        </h1>
        <p className="text-xl text-amber-200/80">
          Tune every game constant from a single dashboard. Changes apply immediately.
        </p>
        <div className="flex justify-center gap-3">
          <div className="inline-block bg-purple-900/40 border border-purple-600/40 rounded-lg px-4 py-2">
            <span className="text-purple-300 font-semibold">🔧 Developer Only</span>
          </div>
          <Button onClick={resetAll} variant="outline" className="border-red-600/40 text-red-400 gap-1">
            <RotateCcw className="w-4 h-4" /> Reset ALL to Defaults
          </Button>
        </div>
      </div>

      {/* Profile Management Bar */}
      <Card className="bg-gradient-to-r from-slate-900/90 to-slate-800/80 border-2 border-purple-600/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-purple-400" />
              <span className="text-purple-300 font-semibold text-sm">Profile:</span>
              <span className="text-amber-400 font-bold">{activeProfileName}</span>
            </div>

            {profileNames.length > 0 && (
              <Select onValueChange={loadProfile}>
                <SelectTrigger className="w-48 bg-slate-900/70 border-purple-600/40 text-amber-200 h-9">
                  <SelectValue placeholder="Load profile..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-purple-600/50">
                  {profileNames.map(name => (
                    <SelectItem key={name} value={name} className="text-amber-200 focus:bg-purple-600/20 focus:text-amber-300">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                placeholder="New profile name..."
                className="bg-slate-900/70 border border-purple-600/40 text-amber-200 rounded-md px-3 py-1.5 text-sm w-44 placeholder:text-amber-200/40"
              />
              <Button
                onClick={() => { if (newProfileName.trim()) { saveProfile(newProfileName.trim()); setNewProfileName(''); } }}
                disabled={!newProfileName.trim()}
                size="sm"
                className="bg-purple-600/60 hover:bg-purple-600/80 text-white gap-1"
              >
                <Save className="w-3 h-3" /> Save
              </Button>
            </div>

            {activeProfileName !== 'Default' && profileNames.includes(activeProfileName) && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => saveProfile(activeProfileName)}
                  size="sm" variant="outline"
                  className="border-amber-600/40 text-amber-400 gap-1"
                >
                  <Save className="w-3 h-3" /> Overwrite
                </Button>
                <Button
                  onClick={() => deleteProfile(activeProfileName)}
                  size="sm" variant="outline"
                  className="border-red-600/40 text-red-400 gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="combat" className="w-full">
        <TabsList className="bg-amber-950/50 border border-amber-600/40 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="combat" className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300">Combat</TabsTrigger>
          <TabsTrigger value="rewards" className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300">Rewards</TabsTrigger>
          <TabsTrigger value="heroes" className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300">Heroes</TabsTrigger>
          <TabsTrigger value="economy" className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300">Economy</TabsTrigger>
          <TabsTrigger value="stronghold" className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300">Stronghold</TabsTrigger>
          <TabsTrigger value="market" className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300">Market</TabsTrigger>
          <TabsTrigger value="raids" className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300">Raids</TabsTrigger>
          <TabsTrigger value="tournaments" className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300">Tournaments</TabsTrigger>
          <TabsTrigger value="progression" className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300">Progression</TabsTrigger>
        </TabsList>

        {/* Combat */}
        <TabsContent value="combat">
          <Card className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-amber-600/40">
            <CardContent className="p-6 space-y-6">
              <CategoryHeader title="Combat Mechanics" icon={<Swords className="w-5 h-5" />} onReset={() => resetCategory('combat')} />
              <ConfigSlider label="Damage Mitigation Divisor (defense / X)" value={config.combat.damageMitigationDivisor} min={1} max={10} step={0.5}
                onChange={v => updateCategory('combat', { damageMitigationDivisor: v })} unit="x" />
              <ConfigSlider label="Minimum Damage per Attack" value={config.combat.minimumDamage} min={0} max={10}
                onChange={v => updateCategory('combat', { minimumDamage: v })} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Battle Rewards */}
        <TabsContent value="rewards">
          <Card className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-amber-600/40">
            <CardContent className="p-6 space-y-6">
              <CategoryHeader title="Battle Rewards" icon={<Trophy className="w-5 h-5" />} onReset={() => resetCategory('battleRewards')} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-amber-300 font-semibold border-b border-amber-600/30 pb-1">Victory</h4>
                  <ConfigSlider label="XP Reward" value={config.battleRewards.victoryXp} min={0} max={500}
                    onChange={v => updateCategory('battleRewards', { victoryXp: v })} />
                  <ConfigSlider label="Mythex Reward" value={config.battleRewards.victoryMythex} min={0} max={500}
                    onChange={v => updateCategory('battleRewards', { victoryMythex: v })} />
                  <ConfigSlider label="Resources (each)" value={config.battleRewards.victoryResources} min={0} max={200}
                    onChange={v => updateCategory('battleRewards', { victoryResources: v })} />
                </div>
                <div className="space-y-4">
                  <h4 className="text-amber-300 font-semibold border-b border-amber-600/30 pb-1">Defeat</h4>
                  <ConfigSlider label="XP Reward" value={config.battleRewards.defeatXp} min={0} max={100}
                    onChange={v => updateCategory('battleRewards', { defeatXp: v })} />
                  <ConfigSlider label="Mythex Reward" value={config.battleRewards.defeatMythex} min={0} max={100}
                    onChange={v => updateCategory('battleRewards', { defeatMythex: v })} />
                  <ConfigSlider label="Resources (each)" value={config.battleRewards.defeatResources} min={0} max={50}
                    onChange={v => updateCategory('battleRewards', { defeatResources: v })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Progression */}
        <TabsContent value="heroes">
          <Card className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-amber-600/40">
            <CardContent className="p-6 space-y-6">
              <CategoryHeader title="Hero Progression" icon={<Heart className="w-5 h-5" />} onReset={() => resetCategory('heroProgression')} />
              <ConfigSlider label="XP per Level" value={config.heroProgression.xpPerLevel} min={10} max={1000} step={10}
                onChange={v => updateCategory('heroProgression', { xpPerLevel: v })} />
              <ConfigSlider label="Max Level" value={config.heroProgression.maxLevel} min={10} max={100}
                onChange={v => updateCategory('heroProgression', { maxLevel: v })} />
              <ConfigSlider label="Forge XP Bonus" value={config.heroProgression.forgeXpBonus} min={0} max={500} step={10}
                onChange={v => updateCategory('heroProgression', { forgeXpBonus: v })} />
              <ConfigSlider label="Max Forge Tier" value={config.heroProgression.maxForgeTier} min={1} max={10}
                onChange={v => updateCategory('heroProgression', { maxForgeTier: v })} />
              <ConfigSlider label="NFT Eligible Forge Tier" value={config.heroProgression.nftEligibleForgeTier} min={1} max={5}
                onChange={v => updateCategory('heroProgression', { nftEligibleForgeTier: v })} />
              <ConfigSlider label="NFT Eligible Level" value={config.heroProgression.nftEligibleLevel} min={1} max={50}
                onChange={v => updateCategory('heroProgression', { nftEligibleLevel: v })} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Economy */}
        <TabsContent value="economy">
          <Card className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-amber-600/40">
            <CardContent className="p-6 space-y-6">
              <CategoryHeader title="Starting Economy" icon={<Coins className="w-5 h-5" />} onReset={() => resetCategory('economyStarting')} />
              <p className="text-amber-200/60 text-sm">These values apply to NEW accounts only. Existing accounts are not affected.</p>
              <ConfigSlider label="Starting Mythex" value={config.economyStarting.startingMythex} min={0} max={10000} step={100}
                onChange={v => updateCategory('economyStarting', { startingMythex: v })} />
              <ConfigSlider label="Starting Gold" value={config.economyStarting.startingGold} min={0} max={5000} step={50}
                onChange={v => updateCategory('economyStarting', { startingGold: v })} />
              <ConfigSlider label="Starting Stone" value={config.economyStarting.startingStone} min={0} max={5000} step={50}
                onChange={v => updateCategory('economyStarting', { startingStone: v })} />
              <ConfigSlider label="Starting Lumber" value={config.economyStarting.startingLumber} min={0} max={5000} step={50}
                onChange={v => updateCategory('economyStarting', { startingLumber: v })} />
              <ConfigSlider label="Starting Iron" value={config.economyStarting.startingIron} min={0} max={5000} step={50}
                onChange={v => updateCategory('economyStarting', { startingIron: v })} />
              <ConfigSlider label="Starting Food" value={config.economyStarting.startingFood} min={0} max={5000} step={50}
                onChange={v => updateCategory('economyStarting', { startingFood: v })} />
              <ConfigSlider label="Starting Mana" value={config.economyStarting.startingMana} min={0} max={1000} step={10}
                onChange={v => updateCategory('economyStarting', { startingMana: v })} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stronghold Production */}
        <TabsContent value="stronghold">
          <Card className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-amber-600/40">
            <CardContent className="p-6 space-y-6">
              <CategoryHeader title="Stronghold Production" icon={<Building2 className="w-5 h-5" />} onReset={() => resetCategory('strongholdProduction')} />
              <ConfigSlider label="Tick Interval (seconds)" value={config.strongholdProduction.tickIntervalMs / 1000} min={5} max={300} step={5}
                onChange={v => updateCategory('strongholdProduction', { tickIntervalMs: v * 1000 })} unit="s" />
              <h4 className="text-amber-300 font-semibold border-b border-amber-600/30 pb-1 pt-2">Base Production (per hour per level)</h4>
              <ConfigSlider label="Gold Mine" value={config.strongholdProduction.goldMineBase} min={1} max={100}
                onChange={v => updateCategory('strongholdProduction', { goldMineBase: v })} unit="/hr" />
              <ConfigSlider label="Stone Quarry" value={config.strongholdProduction.stoneQuarryBase} min={1} max={100}
                onChange={v => updateCategory('strongholdProduction', { stoneQuarryBase: v })} unit="/hr" />
              <ConfigSlider label="Lumber Yard" value={config.strongholdProduction.lumberYardBase} min={1} max={100}
                onChange={v => updateCategory('strongholdProduction', { lumberYardBase: v })} unit="/hr" />
              <ConfigSlider label="Iron Mine" value={config.strongholdProduction.ironMineBase} min={1} max={100}
                onChange={v => updateCategory('strongholdProduction', { ironMineBase: v })} unit="/hr" />
              <ConfigSlider label="Farmstead" value={config.strongholdProduction.farmsteadBase} min={1} max={100}
                onChange={v => updateCategory('strongholdProduction', { farmsteadBase: v })} unit="/hr" />
              <ConfigSlider label="Alchemist Lab" value={config.strongholdProduction.alchemistLabBase} min={1} max={100}
                onChange={v => updateCategory('strongholdProduction', { alchemistLabBase: v })} unit="/hr" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market */}
        <TabsContent value="market">
          <Card className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-amber-600/40">
            <CardContent className="p-6 space-y-6">
              <CategoryHeader title="NPC Market" icon={<Store className="w-5 h-5" />} onReset={() => resetCategory('market')} />
              <div className="space-y-4">
                {config.market.npcOffers.map((offer, idx) => (
                  <div key={offer.id} className="bg-slate-800/60 border border-amber-600/30 rounded-lg p-4 space-y-3">
                    <div className="text-amber-300 font-semibold">{offer.cardId}</div>
                    <div className="grid grid-cols-2 gap-4">
                      <ConfigSlider label="Price (Mythex)" value={offer.price} min={1} max={1000}
                        onChange={v => {
                          const updated = [...config.market.npcOffers];
                          updated[idx] = { ...updated[idx], price: v };
                          updateCategory('market', { npcOffers: updated });
                        }} />
                      <ConfigSlider label="Stock" value={offer.stock} min={1} max={9999}
                        onChange={v => {
                          const updated = [...config.market.npcOffers];
                          updated[idx] = { ...updated[idx], stock: v };
                          updateCategory('market', { npcOffers: updated });
                        }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raids */}
        <TabsContent value="raids">
          <Card className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-amber-600/40">
            <CardContent className="p-6 space-y-6">
              <CategoryHeader title="NPC Raids" icon={<Target className="w-5 h-5" />} onReset={() => resetCategory('raids')} />
              <div className="space-y-4">
                {config.raids.targets.map((raid, idx) => (
                  <div key={raid.id} className="bg-slate-800/60 border border-amber-600/30 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-amber-300 font-semibold">{raid.name}</span>
                      <span className="text-amber-200/60 text-sm">{raid.difficulty}</span>
                    </div>
                    <ConfigSlider label="Threat Level" value={raid.threatLevel} min={1} max={200}
                      onChange={v => {
                        const updated = [...config.raids.targets];
                        updated[idx] = { ...updated[idx], threatLevel: v };
                        updateCategory('raids', { targets: updated });
                      }} />
                    <ConfigSlider label="Gold Reward" value={raid.rewards.gold || 0} min={0} max={1000} step={10}
                      onChange={v => {
                        const updated = [...config.raids.targets];
                        updated[idx] = { ...updated[idx], rewards: { ...updated[idx].rewards, gold: v } };
                        updateCategory('raids', { targets: updated });
                      }} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tournaments */}
        <TabsContent value="tournaments">
          <Card className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-amber-600/40">
            <CardContent className="p-6 space-y-6">
              <CategoryHeader title="Tournament Defaults" icon={<Trophy className="w-5 h-5" />} onReset={() => resetCategory('tournamentDefaults')} />
              {config.tournamentDefaults.presets.map((preset, idx) => (
                <div key={preset.name} className="bg-slate-800/60 border border-amber-600/30 rounded-lg p-4 space-y-3">
                  <div className="text-amber-300 font-semibold text-lg">{preset.name}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <ConfigSlider label="Entry Fee (Mythex)" value={preset.entryFee} min={0} max={1000} step={10}
                      onChange={v => {
                        const updated = [...config.tournamentDefaults.presets];
                        updated[idx] = { ...updated[idx], entryFee: v };
                        updateCategory('tournamentDefaults', { presets: updated });
                      }} />
                    <ConfigSlider label="Max Participants" value={preset.maxParticipants} min={4} max={64} step={2}
                      onChange={v => {
                        const updated = [...config.tournamentDefaults.presets];
                        updated[idx] = { ...updated[idx], maxParticipants: v };
                        updateCategory('tournamentDefaults', { presets: updated });
                      }} />
                  </div>
                  <ConfigSlider label="1st Place Mythex" value={preset.rewards.first.mythex} min={0} max={5000} step={50}
                    onChange={v => {
                      const updated = [...config.tournamentDefaults.presets];
                      updated[idx] = { ...updated[idx], rewards: { ...updated[idx].rewards, first: { ...updated[idx].rewards.first, mythex: v } } };
                      updateCategory('tournamentDefaults', { presets: updated });
                    }} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progression */}
        <TabsContent value="progression">
          <Card className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-amber-600/40">
            <CardContent className="p-6 space-y-6">
              <CategoryHeader title="Layer Progression" icon={<Layers className="w-5 h-5" />} onReset={() => resetCategory('progressionLayers')} />
              <p className="text-amber-200/60 text-sm">Set to 0 to unlock by default. Set higher values to gate features behind progression.</p>
              <h4 className="text-amber-300 font-semibold">Layer 2: Heroes & Bands</h4>
              <ConfigSlider label="Heroes Required" value={config.progressionLayers.layer2.heroesRequired} min={0} max={50}
                onChange={v => updateCategory('progressionLayers', { layer2: { heroesRequired: v } })} />
              <h4 className="text-amber-300 font-semibold pt-2">Layer 3: Battlegrounds</h4>
              <ConfigSlider label="Heroes Required" value={config.progressionLayers.layer3.heroesRequired} min={0} max={50}
                onChange={v => updateCategory('progressionLayers', { layer3: { ...config.progressionLayers.layer3, heroesRequired: v } })} />
              <ConfigSlider label="Battles Won Required" value={config.progressionLayers.layer3.battlesWonRequired} min={0} max={50}
                onChange={v => updateCategory('progressionLayers', { layer3: { ...config.progressionLayers.layer3, battlesWonRequired: v } })} />
              <h4 className="text-amber-300 font-semibold pt-2">Layer 4: Tournaments</h4>
              <ConfigSlider label="Heroes Required" value={config.progressionLayers.layer4.heroesRequired} min={0} max={50}
                onChange={v => updateCategory('progressionLayers', { layer4: { ...config.progressionLayers.layer4, heroesRequired: v } })} />
              <ConfigSlider label="Battles Won Required" value={config.progressionLayers.layer4.battlesWonRequired} min={0} max={100}
                onChange={v => updateCategory('progressionLayers', { layer4: { ...config.progressionLayers.layer4, battlesWonRequired: v } })} />
              <ConfigSlider label="Tournaments Won Required" value={config.progressionLayers.layer4.tournamentsWonRequired} min={0} max={20}
                onChange={v => updateCategory('progressionLayers', { layer4: { ...config.progressionLayers.layer4, tournamentsWonRequired: v } })} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
