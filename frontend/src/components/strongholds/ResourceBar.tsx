import { Resources } from '../../types/strongholds';
import { Coins, Mountain, Trees, Hammer, Wheat, Sparkles } from 'lucide-react';

interface ResourceBarProps {
  resources: Resources;
}

export default function ResourceBar({ resources }: ResourceBarProps) {
  return (
    <div className="bg-slate-800/80 border border-amber-500/30 rounded-lg p-4 backdrop-blur-sm">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-xs text-amber-300/70">Gold</div>
            <div className="text-lg font-bold text-amber-400">{Math.floor(resources.gold)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mountain className="w-5 h-5 text-gray-400" />
          <div>
            <div className="text-xs text-amber-300/70">Stone</div>
            <div className="text-lg font-bold text-amber-400">{Math.floor(resources.stone)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Trees className="w-5 h-5 text-green-400" />
          <div>
            <div className="text-xs text-amber-300/70">Lumber</div>
            <div className="text-lg font-bold text-amber-400">{Math.floor(resources.lumber)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Hammer className="w-5 h-5 text-slate-400" />
          <div>
            <div className="text-xs text-amber-300/70">Iron</div>
            <div className="text-lg font-bold text-amber-400">{Math.floor(resources.iron)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wheat className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="text-xs text-amber-300/70">Food</div>
            <div className="text-lg font-bold text-amber-400">{Math.floor(resources.food)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-xs text-amber-300/70">Mana</div>
            <div className="text-lg font-bold text-amber-400">{Math.floor(resources.mana)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
