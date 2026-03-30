import React from 'react';
import { useEconomy } from '../context/EconomyContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Coins, Hammer, Trees, Gem, Wheat, Sparkles } from 'lucide-react';

interface WalletSummaryProps {
  variant?: 'inline' | 'panel';
  showResources?: boolean;
}

export default function WalletSummary({ variant = 'inline', showResources = true }: WalletSummaryProps) {
  const { wallet, getMythexBalance, getResourceBalance } = useEconomy();

  if (!wallet) {
    return null;
  }

  const mythexBalance = getMythexBalance();

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-4 text-amber-200">
        <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-amber-500/30">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-amber-400">{mythexBalance}</span>
          <span className="text-sm text-amber-300/70">Mythex</span>
        </div>
        {showResources && (
          <>
            <div className="flex items-center gap-1 text-sm">
              <Coins className="w-3 h-3 text-yellow-400" />
              <span>{getResourceBalance('gold')}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Gem className="w-3 h-3 text-gray-400" />
              <span>{getResourceBalance('stone')}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Trees className="w-3 h-3 text-green-600" />
              <span>{getResourceBalance('lumber')}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Hammer className="w-3 h-3 text-slate-400" />
              <span>{getResourceBalance('iron')}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Wheat className="w-3 h-3 text-amber-600" />
              <span>{getResourceBalance('food')}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>{getResourceBalance('mana')}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-amber-400 flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Wallet Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/40 border border-amber-500/40 rounded-lg p-4">
          <div className="text-sm text-amber-300/70 mb-1">Soft Mythex</div>
          <div className="text-3xl font-bold text-amber-400">{mythexBalance}</div>
        </div>
        
        {showResources && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/50 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-amber-300/70">Gold</span>
              </div>
              <div className="text-lg font-bold text-amber-200">{getResourceBalance('gold')}</div>
            </div>
            
            <div className="bg-slate-900/50 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Gem className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-amber-300/70">Stone</span>
              </div>
              <div className="text-lg font-bold text-amber-200">{getResourceBalance('stone')}</div>
            </div>
            
            <div className="bg-slate-900/50 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Trees className="w-4 h-4 text-green-600" />
                <span className="text-xs text-amber-300/70">Lumber</span>
              </div>
              <div className="text-lg font-bold text-amber-200">{getResourceBalance('lumber')}</div>
            </div>
            
            <div className="bg-slate-900/50 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Hammer className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-amber-300/70">Iron</span>
              </div>
              <div className="text-lg font-bold text-amber-200">{getResourceBalance('iron')}</div>
            </div>
            
            <div className="bg-slate-900/50 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wheat className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-300/70">Food</span>
              </div>
              <div className="text-lg font-bold text-amber-200">{getResourceBalance('food')}</div>
            </div>
            
            <div className="bg-slate-900/50 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-amber-300/70">Mana</span>
              </div>
              <div className="text-lg font-bold text-amber-200">{getResourceBalance('mana')}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
