import { useState } from 'react';
import { useHeroes } from '../../context/HeroesContext';
import { useStronghold } from '../../context/StrongholdContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Sparkles, Coins } from 'lucide-react';
import { Badge } from '../ui/badge';

export default function RefinePanel() {
  const { heroes, awardXpToHeroes } = useHeroes();
  const { getSoftMythexBalance, changeSoftMythex } = useStronghold();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [xpAmount, setXpAmount] = useState<number>(100);

  const selectedHero = heroes.find(h => h.instanceId === selectedInstanceId);
  const balance = getSoftMythexBalance();
  const costPerXp = 1; // 1 Soft Mythex per XP
  const totalCost = xpAmount * costPerXp;
  const canAfford = balance >= totalCost;

  const handleRefine = () => {
    if (!selectedInstanceId || !canAfford || xpAmount <= 0) return;

    changeSoftMythex(-totalCost);
    awardXpToHeroes([selectedInstanceId], xpAmount);
    setSelectedInstanceId('');
    setXpAmount(100);
  };

  const eligibleHeroes = heroes.filter(h => !h.marketLocked);

  return (
    <Card className="bg-gradient-to-b from-purple-950/80 to-purple-900/60 border-2 border-purple-600/50">
      <CardHeader>
        <CardTitle className="text-purple-300 flex items-center gap-2">
          <Sparkles className="w-6 h-6" />
          Refinement Chamber
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-slate-900/50 border border-purple-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-purple-300 font-semibold">Your Soft Mythex:</span>
            <div className="flex items-center gap-2 text-purple-200">
              <Coins className="w-5 h-5" />
              <span className="text-xl font-bold">{balance}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-purple-300 font-semibold">Select Hero to Refine:</label>
          <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
            <SelectTrigger className="bg-slate-900/70 border-purple-600/40 text-purple-200">
              <SelectValue placeholder="Choose a hero..." />
            </SelectTrigger>
            <SelectContent className="bg-purple-950 border-purple-600/50 max-h-64">
              {eligibleHeroes.map(hero => (
                <SelectItem
                  key={hero.instanceId}
                  value={hero.instanceId}
                  className="text-purple-200 focus:bg-purple-600/20 focus:text-purple-300"
                >
                  {hero.name} (Lv.{hero.level}, XP: {hero.xp || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedHero && (
          <div className="bg-slate-900/50 border border-purple-600/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-purple-300 font-bold">{selectedHero.name}</div>
                <div className="text-sm text-purple-200/70">
                  Level {selectedHero.level} • XP: {selectedHero.xp || 0}
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="border-purple-600/50 text-purple-300">
                  Tier {selectedHero.forgeTier || 0}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-purple-300 font-semibold">XP Amount:</label>
          <Input
            type="number"
            min="1"
            max="1000"
            value={xpAmount}
            onChange={(e) => setXpAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-slate-900/70 border-purple-600/40 text-purple-200"
          />
          <div className="flex gap-2">
            {[50, 100, 250, 500].map(amount => (
              <Button
                key={amount}
                size="sm"
                variant="outline"
                onClick={() => setXpAmount(amount)}
                className="border-purple-600/40 text-purple-300 hover:bg-purple-600/20"
              >
                {amount}
              </Button>
            ))}
          </div>
        </div>

        {selectedHero && (
          <div className="bg-purple-900/30 border border-purple-600/40 rounded-lg p-4 space-y-2">
            <div className="text-purple-300 font-semibold">Refinement Cost:</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-200/80">XP to Award:</span>
              <span className="text-purple-200 font-bold">+{xpAmount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-200/80">Total Cost:</span>
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-purple-300" />
                <span className="text-purple-200 font-bold">{totalCost}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-200/80">New XP:</span>
              <span className="text-purple-200 font-bold">{(selectedHero.xp || 0) + xpAmount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-200/80">New Level:</span>
              <span className="text-purple-200 font-bold">
                {Math.min(50, 1 + Math.floor(((selectedHero.xp || 0) + xpAmount) / 100))}
              </span>
            </div>
          </div>
        )}

        <Button
          onClick={handleRefine}
          disabled={!selectedInstanceId || !canAfford || xpAmount <= 0}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-3 text-lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Refine Hero ({totalCost} Mythex)
        </Button>

        {!canAfford && selectedInstanceId && (
          <p className="text-red-400 text-sm text-center">
            Insufficient Soft Mythex. Need {totalCost - balance} more.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
