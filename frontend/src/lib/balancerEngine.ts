// Phase 6: Balance Engine - Pure computational functions for card balance analysis

import { TelemetrySummary, BalanceEngineParams, BalanceRecommendation, DynamicCardBalance } from '../types/balancer';
import { CARD_LIBRARY } from './mockData';

// Helper: Clamp value between min and max
export function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

// Get current mana cost for a card (considering overrides)
export function getCurrentManaForCard(
  cardId: string,
  balances: DynamicCardBalance[]
): number {
  const override = balances.find(b => b.cardId === cardId);
  if (override) {
    return override.manaCostOverride;
  }

  const card = CARD_LIBRARY.find(c => c.id === cardId);
  return card?.manaRequirement?.mana || card?.cost || 0;
}

// Compute balance recommendations based on telemetry data
export function computeBalanceRecommendations(
  summary: TelemetrySummary,
  params: BalanceEngineParams,
  currentBalances: DynamicCardBalance[]
): BalanceRecommendation[] {
  const recommendations: BalanceRecommendation[] = [];

  // Iterate through all cards with telemetry data
  Object.entries(summary.cardStats).forEach(([cardId, stats]) => {
    // Skip cards with insufficient data
    if (stats.gamesSeen < params.minGamesThreshold) {
      return;
    }

    const card = CARD_LIBRARY.find(c => c.id === cardId);
    if (!card) return;

    const winrate = stats.gamesWon / stats.gamesSeen;
    const currentMana = getCurrentManaForCard(cardId, currentBalances);

    // Determine if card needs adjustment
    let suggestedMana = currentMana;
    let reason = '';
    let impact: 'buff' | 'nerf' | 'none' = 'none';

    if (winrate > params.targetWinrateMax) {
      // Card is overperforming - increase mana cost (nerf)
      const overperformance = winrate - params.targetWinrateMax;
      const adjustment = Math.ceil(overperformance * 10 * params.adjustmentSensitivity);
      suggestedMana = currentMana + adjustment;
      reason = `Winrate ${(winrate * 100).toFixed(1)}% exceeds target maximum ${(params.targetWinrateMax * 100).toFixed(0)}%. Increasing mana cost to reduce power.`;
      impact = 'nerf';
    } else if (winrate < params.targetWinrateMin) {
      // Card is underperforming - decrease mana cost (buff)
      const underperformance = params.targetWinrateMin - winrate;
      const adjustment = Math.ceil(underperformance * 10 * params.adjustmentSensitivity);
      suggestedMana = Math.max(0, currentMana - adjustment);
      reason = `Winrate ${(winrate * 100).toFixed(1)}% below target minimum ${(params.targetWinrateMin * 100).toFixed(0)}%. Decreasing mana cost to increase viability.`;
      impact = 'buff';
    } else {
      // Card is balanced
      reason = `Winrate ${(winrate * 100).toFixed(1)}% within target range. No adjustment needed.`;
      impact = 'none';
    }

    // Only add recommendation if there's a change or for top cards
    if (suggestedMana !== currentMana || stats.gamesSeen >= params.minGamesThreshold * 2) {
      recommendations.push({
        cardId,
        cardName: card.name,
        currentMana,
        suggestedMana,
        currentWinrate: winrate,
        gamesSeen: stats.gamesSeen,
        reason,
        impact,
      });
    }
  });

  // Sort by games seen (most popular cards first)
  recommendations.sort((a, b) => b.gamesSeen - a.gamesSeen);

  return recommendations;
}
