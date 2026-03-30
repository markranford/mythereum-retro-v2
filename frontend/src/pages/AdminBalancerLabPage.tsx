import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useTelemetry } from '../context/TelemetryContext';
import { useBalancer } from '../context/BalancerContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { FlaskConical, TrendingUp, TrendingDown, Minus, Lock } from 'lucide-react';

export default function AdminBalancerLabPage() {
  const { identity } = useInternetIdentity();
  const { summary, engineParams, updateEngineParams, resetTelemetry } = useTelemetry();
  const { recommendations, applyRecommendation, applyAllRecommendations, resetBalances, recomputeRecommendations } = useBalancer();

  if (!identity) {
    return (
      <div className="text-center py-12">
        <Lock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Access Restricted</h2>
        <p className="text-amber-200/70">Please login to access the Balancer Lab.</p>
      </div>
    );
  }

  // Get top 10 cards by games seen
  const topCards = Object.values(summary.cardStats)
    .sort((a, b) => b.gamesSeen - a.gamesSeen)
    .slice(0, 10);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-amber-400 flex items-center justify-center gap-3">
          <FlaskConical className="w-10 h-10" />
          Balancer Lab
        </h1>
        <p className="text-xl text-amber-200/80">
          Developer tools for card balance analysis and dynamic mana cost adjustments.
        </p>
        <div className="inline-block bg-purple-900/40 border border-purple-600/40 rounded-lg px-4 py-2">
          <span className="text-purple-300 font-semibold">🔬 Developer Only</span>
        </div>
      </div>

      <Card 
        className="bg-gradient-to-b from-slate-900/90 to-slate-800/80 border-2 border-purple-600/40"
        style={{
          backgroundImage: 'url(/assets/generated/balancer-lab-background.dim_800x600.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <CardHeader className="bg-gradient-to-r from-purple-950/95 to-purple-900/90 border-b-2 border-purple-600/40">
          <CardTitle className="text-amber-400 text-2xl flex items-center gap-2">
            <FlaskConical className="w-6 h-6" />
            Telemetry Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6 bg-slate-900/80">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/70 border border-amber-600/30 rounded-lg p-3">
              <div className="text-amber-200/70 text-sm">Tracked Battles</div>
              <div className="text-2xl font-bold text-amber-400">{summary.totalBattles}</div>
            </div>
            <div className="bg-slate-800/70 border border-amber-600/30 rounded-lg p-3">
              <div className="text-amber-200/70 text-sm">Cards Tracked</div>
              <div className="text-2xl font-bold text-amber-400">{Object.keys(summary.cardStats).length}</div>
            </div>
            <div className="bg-slate-800/70 border border-amber-600/30 rounded-lg p-3">
              <div className="text-amber-200/70 text-sm">Recommendations</div>
              <div className="text-2xl font-bold text-amber-400">{recommendations.length}</div>
            </div>
            <div className="bg-slate-800/70 border border-amber-600/30 rounded-lg p-3">
              <div className="text-amber-200/70 text-sm">Last Updated</div>
              <div className="text-sm font-bold text-amber-400">
                {new Date(summary.lastUpdated).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-purple-600/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-amber-400 text-xl">Balance Engine Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 bg-slate-900/70 border border-amber-600/30 rounded-lg p-4">
            <div className="space-y-2">
              <label className="text-amber-200 text-sm font-semibold">
                Target Winrate Min: {(engineParams.targetWinrateMin * 100).toFixed(0)}%
              </label>
              <Slider
                value={[engineParams.targetWinrateMin * 100]}
                onValueChange={([value]) => updateEngineParams({ targetWinrateMin: value / 100 })}
                min={30}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-amber-200 text-sm font-semibold">
                Target Winrate Max: {(engineParams.targetWinrateMax * 100).toFixed(0)}%
              </label>
              <Slider
                value={[engineParams.targetWinrateMax * 100]}
                onValueChange={([value]) => updateEngineParams({ targetWinrateMax: value / 100 })}
                min={50}
                max={70}
                step={1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-amber-200 text-sm font-semibold">
                Adjustment Sensitivity: {engineParams.adjustmentSensitivity.toFixed(1)}
              </label>
              <Slider
                value={[engineParams.adjustmentSensitivity * 10]}
                onValueChange={([value]) => updateEngineParams({ adjustmentSensitivity: value / 10 })}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-amber-200 text-sm font-semibold">
                Min Games Threshold: {engineParams.minGamesThreshold}
              </label>
              <Slider
                value={[engineParams.minGamesThreshold]}
                onValueChange={([value]) => updateEngineParams({ minGamesThreshold: value })}
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={recomputeRecommendations}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              Recompute Recommendations
            </Button>
            <Button
              onClick={applyAllRecommendations}
              disabled={recommendations.length === 0}
              className="bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
            >
              Apply All Recommendations
            </Button>
            <Button
              onClick={resetBalances}
              variant="outline"
              className="border-amber-600/40 text-amber-400"
            >
              Reset Balances
            </Button>
            <Button
              onClick={resetTelemetry}
              variant="outline"
              className="border-red-600/40 text-red-400"
            >
              Reset Telemetry
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-purple-600/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-amber-400 text-xl">Top 10 Cards by Games Seen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topCards.length === 0 ? (
            <div className="text-center py-8 text-amber-200/70">
              No telemetry data yet. Play some battles to see card statistics.
            </div>
          ) : (
            topCards.map(cardStat => {
              const recommendation = recommendations.find(r => r.cardId === cardStat.cardId);
              const winrate = cardStat.gamesSeen > 0 ? cardStat.gamesWon / cardStat.gamesSeen : 0;
              
              return (
                <div
                  key={cardStat.cardId}
                  className="bg-slate-900/70 border border-amber-600/30 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-amber-300 font-bold">{recommendation?.cardName || cardStat.cardId}</div>
                      <div className="text-sm text-amber-200/70">
                        Games: {cardStat.gamesSeen} | Wins: {cardStat.gamesWon} | Losses: {cardStat.gamesLost}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-amber-400 font-bold">{(winrate * 100).toFixed(1)}% WR</div>
                      {recommendation && (
                        <div className="flex items-center gap-1 text-sm">
                          {recommendation.impact === 'buff' && <TrendingUp className="w-4 h-4 text-green-400" />}
                          {recommendation.impact === 'nerf' && <TrendingDown className="w-4 h-4 text-red-400" />}
                          {recommendation.impact === 'none' && <Minus className="w-4 h-4 text-gray-400" />}
                          <span className={
                            recommendation.impact === 'buff' ? 'text-green-400' :
                            recommendation.impact === 'nerf' ? 'text-red-400' :
                            'text-gray-400'
                          }>
                            {recommendation.impact}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {recommendation && (
                    <div className="flex items-center justify-between pt-2 border-t border-amber-600/20">
                      <div className="text-sm text-amber-200/70">
                        Current Mana: {recommendation.currentMana} → Suggested: {recommendation.suggestedMana}
                      </div>
                      {recommendation.suggestedMana !== recommendation.currentMana && (
                        <Button
                          onClick={() => applyRecommendation(cardStat.cardId)}
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-500 text-slate-900"
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
