import { Building, Resources } from '../../types/strongholds';
import { BUILDING_TEMPLATES } from '../../lib/strongholdMockData';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ArrowUp, Clock, Coins, Mountain, Trees, Hammer, Wheat } from 'lucide-react';

interface BuildingCardProps {
  buildingId: string;
  building: Building;
  onUpgrade: (buildingId: string) => void;
  canAfford: boolean;
}

export default function BuildingCard({ buildingId, building, onUpgrade, canAfford }: BuildingCardProps) {
  const template = BUILDING_TEMPLATES[building.templateId];
  
  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'gold': return <Coins className="w-3 h-3" />;
      case 'stone': return <Mountain className="w-3 h-3" />;
      case 'lumber': return <Trees className="w-3 h-3" />;
      case 'iron': return <Hammer className="w-3 h-3" />;
      case 'food': return <Wheat className="w-3 h-3" />;
      default: return null;
    }
  };

  const getTimeRemaining = () => {
    if (!building.upgrading || !building.upgradeCompleteTime) return null;
    const remaining = building.upgradeCompleteTime - Date.now();
    if (remaining <= 0) return 'Ready!';
    const minutes = Math.ceil(remaining / (1000 * 60));
    return `${minutes}m`;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-amber-400 flex items-center justify-between">
          <span>{template.name}</span>
          <span className="text-sm font-normal">Lv. {building.level}</span>
        </CardTitle>
        <CardDescription className="text-amber-200/70 text-sm">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {template.baseProduction && (
          <div className="text-sm text-amber-300/80">
            <div className="font-semibold mb-1">Production per hour:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(template.baseProduction).map(([resource, amount]) => (
                amount && (
                  <span key={resource} className="flex items-center gap-1">
                    {getResourceIcon(resource)}
                    +{amount * building.level}
                  </span>
                )
              ))}
            </div>
          </div>
        )}

        {building.upgrading ? (
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-semibold">{timeRemaining}</span>
          </div>
        ) : (
          <>
            <div className="text-xs text-amber-300/70">
              <div className="font-semibold mb-1">Upgrade cost:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(template.upgradeCost).map(([resource, amount]) => (
                  amount > 0 && (
                    <span key={resource} className="flex items-center gap-1">
                      {getResourceIcon(resource)}
                      {amount}
                    </span>
                  )
                ))}
              </div>
            </div>
            <Button
              onClick={() => onUpgrade(buildingId)}
              disabled={!canAfford}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold disabled:opacity-50"
              size="sm"
            >
              <ArrowUp className="w-4 h-4 mr-1" />
              Upgrade to Lv. {building.level + 1}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
