import { useState } from 'react';
import { useHeroes } from '../../context/HeroesContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Flame, Plus, X } from 'lucide-react';
import { Badge } from '../ui/badge';

export default function FusePanel() {
  const { heroes, getDuplicatesByCardId, canForge, forgeHeroes } = useHeroes();
  const [targetInstanceId, setTargetInstanceId] = useState<string>('');
  const [sacrificeIds, setSacrificeIds] = useState<string[]>([]);

  const targetHero = heroes.find(h => h.instanceId === targetInstanceId);
  const availableSacrifices = targetHero
    ? getDuplicatesByCardId(targetHero.cardId).filter(h => h.instanceId !== targetInstanceId)
    : [];

  const canPerformForge = targetInstanceId && sacrificeIds.length > 0 && canForge(targetInstanceId, sacrificeIds);

  const handleForge = () => {
    if (!canPerformForge) return;
    forgeHeroes(targetInstanceId, sacrificeIds);
    setTargetInstanceId('');
    setSacrificeIds([]);
  };

  const addSacrifice = (instanceId: string) => {
    if (!sacrificeIds.includes(instanceId)) {
      setSacrificeIds([...sacrificeIds, instanceId]);
    }
  };

  const removeSacrifice = (instanceId: string) => {
    setSacrificeIds(sacrificeIds.filter(id => id !== instanceId));
  };

  const eligibleHeroes = heroes.filter(h => !h.marketLocked);

  return (
    <Card className="bg-gradient-to-b from-amber-950/80 to-amber-900/60 border-2 border-amber-600/50">
      <CardHeader>
        <CardTitle className="text-amber-300 flex items-center gap-2">
          <Flame className="w-6 h-6" />
          Fusion Forge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <label className="text-amber-300 font-semibold">Select Target Hero:</label>
          <Select value={targetInstanceId} onValueChange={setTargetInstanceId}>
            <SelectTrigger className="bg-slate-900/70 border-amber-600/40 text-amber-200">
              <SelectValue placeholder="Choose a hero to enhance..." />
            </SelectTrigger>
            <SelectContent className="bg-amber-950 border-amber-600/50 max-h-64">
              {eligibleHeroes.map(hero => (
                <SelectItem
                  key={hero.instanceId}
                  value={hero.instanceId}
                  className="text-amber-200 focus:bg-amber-600/20 focus:text-amber-300"
                >
                  {hero.name} (Lv.{hero.level}, Tier {hero.forgeTier || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {targetHero && (
          <div className="bg-slate-900/50 border border-amber-600/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-amber-300 font-bold">{targetHero.name}</div>
                <div className="text-sm text-amber-200/70">
                  Level {targetHero.level} • XP: {targetHero.xp || 0}
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="border-amber-600/50 text-amber-300">
                  Tier {targetHero.forgeTier || 0}
                </Badge>
                {targetHero.nftEligible && (
                  <Badge className="ml-2 bg-purple-600/30 text-purple-300 border-purple-500/50">
                    NFT Eligible
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {targetHero && availableSacrifices.length > 0 && (
          <div className="space-y-3">
            <label className="text-amber-300 font-semibold">
              Available Duplicates ({availableSacrifices.length}):
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableSacrifices.map(hero => (
                <div
                  key={hero.instanceId}
                  className="flex items-center justify-between bg-slate-900/50 border border-amber-600/30 rounded p-3"
                >
                  <div className="text-sm text-amber-200">
                    {hero.name} (Lv.{hero.level})
                  </div>
                  {sacrificeIds.includes(hero.instanceId) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeSacrifice(hero.instanceId)}
                      className="border-red-600/40 text-red-400 hover:bg-red-600/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => addSacrifice(hero.instanceId)}
                      className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-300"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {targetHero && sacrificeIds.length > 0 && (
          <div className="bg-amber-900/30 border border-amber-600/40 rounded-lg p-4 space-y-2">
            <div className="text-amber-300 font-semibold">Forge Result:</div>
            <div className="text-sm text-amber-200/80">
              • Forge Tier: {(targetHero.forgeTier || 0)} → {Math.min(3, (targetHero.forgeTier || 0) + 1)}
            </div>
            <div className="text-sm text-amber-200/80">
              • XP Gained: +150 ({targetHero.xp || 0} → {(targetHero.xp || 0) + 150})
            </div>
            <div className="text-sm text-amber-200/80">
              • Sacrifices: {sacrificeIds.length} duplicate(s) will be consumed
            </div>
          </div>
        )}

        <Button
          onClick={handleForge}
          disabled={!canPerformForge}
          className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold py-3 text-lg"
        >
          <Flame className="w-5 h-5 mr-2" />
          Forge Hero
        </Button>

        {targetHero && availableSacrifices.length === 0 && (
          <p className="text-amber-400/70 text-sm text-center">
            No duplicates available for this hero. Acquire more copies to forge.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
