import { OwnedHeroCard } from '../../types/heroes';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Zap, Star, CheckCircle2 } from 'lucide-react';

interface GameCardProps {
  hero: OwnedHeroCard;
  isSelected?: boolean;
  onToggle?: () => void;
  isInActiveDeck?: boolean;
}

export default function GameCard({ hero, isSelected, onToggle, isInActiveDeck }: GameCardProps) {
  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'rare': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'epic': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'legendary': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <Card
      className={`bg-slate-800/60 border-amber-500/30 backdrop-blur-sm hover:border-amber-400/50 transition-all cursor-pointer relative ${
        isSelected ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/30' : 'hover:shadow-lg hover:shadow-amber-500/20'
      }`}
      onClick={onToggle}
      style={{
        backgroundImage: 'url(/assets/generated/card-glow-border.dim_300x400.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* In Deck Indicator */}
      {isInActiveDeck && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircle2 className="w-6 h-6 text-green-400 fill-green-400/20 drop-shadow-lg" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-amber-400 text-base leading-tight">{hero.name}</CardTitle>
          {isSelected && <Star className="w-5 h-5 text-amber-400 fill-amber-400 flex-shrink-0" />}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className={getRarityColor(hero.rarity)}>
            {hero.rarity}
          </Badge>
          <Badge variant="outline" className="bg-slate-700/50 text-amber-300/80 border-slate-600/50">
            {hero.class}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <Zap className="w-5 h-5" />
            <span className="text-2xl font-bold">{hero.power}</span>
          </div>
          <div className="text-sm text-amber-300/70">
            Lv. {hero.level}
          </div>
        </div>
        <div className="text-xs text-amber-200/60">
          {hero.edition} • {hero.cardType}
        </div>
        {hero.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {hero.tags.map((tag, index) => (
              <span key={index} className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-300/70 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
