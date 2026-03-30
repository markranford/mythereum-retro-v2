import React, { useEffect, useRef, useMemo } from 'react';
import { useProgress } from '../context/ProgressContext';
import { GameLayer } from '../types/progression';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Lock, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface LayerGateProps {
  minLayer: GameLayer;
  children: React.ReactNode;
  featureName: string;
}

/**
 * LayerGate - Layer gating component with comprehensive infinite loop prevention.
 * 
 * Fixed infinite render loop by:
 * - Adding mount guard to prevent repeated initialization
 * - Using useRef to track component lifecycle
 * - Ensuring no state updates during render phase
 * - Memoizing all static data to prevent re-renders
 * - Moving all hooks to top before any conditional returns
 * - Preventing any setState calls in render
 */
export default function LayerGate({ minLayer, children, featureName }: LayerGateProps) {
  const progressContext = useProgress();
  
  // Extract values with null checks
  const isLayerUnlocked = progressContext?.isLayerUnlocked;
  const getUnlockRequirements = progressContext?.getUnlockRequirements;
  const progress = progressContext?.progress;
  const isInitialized = progressContext?.isInitialized ?? false;
  const initializationError = progressContext?.initializationError ?? null;
  
  // Mount guard to prevent repeated initialization
  const mountedRef = useRef(false);
  const hasLoggedRef = useRef(false);

  // Memoize static data BEFORE any conditional returns
  const requirements = useMemo(() => {
    if (!getUnlockRequirements) return [];
    return getUnlockRequirements(minLayer);
  }, [minLayer, getUnlockRequirements]);
  
  const layerNames: Record<GameLayer, string> = useMemo(() => ({
    1: 'Strongholds',
    2: 'Heroes & Bands',
    3: 'Battlegrounds',
    4: 'Tournaments',
  }), []);

  // Memoize unlock status
  const unlocked = useMemo(() => {
    if (!isLayerUnlocked) return false;
    return isLayerUnlocked(minLayer);
  }, [isLayerUnlocked, minLayer]);

  // Only log once on mount - no state updates
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    
    if (!hasLoggedRef.current) {
      console.log(`[LayerGate] Mounted for ${featureName}, minLayer: ${minLayer}`);
      hasLoggedRef.current = true;
    }
    
    return () => {
      console.log(`[LayerGate] Unmounting for ${featureName}`);
      mountedRef.current = false;
    };
  }, []); // Empty deps - only run once

  // NOW we can do conditional returns after all hooks are called
  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Sparkles className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
          <p className="text-amber-300">Initializing progression system...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initializationError) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert className="bg-red-950/50 border-red-600/50">
          <AlertDescription className="text-red-300">
            <strong>Progression System Error:</strong> {initializationError}
            <br />
            <span className="text-sm">Please refresh the page or contact support if the issue persists.</span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if layer is unlocked
  if (unlocked) {
    return <>{children}</>;
  }

  // Show locked state with requirements
  return (
    <div className="max-w-3xl mx-auto mt-12">
      <Card 
        className="bg-gradient-to-b from-slate-900/90 to-slate-800/90 border-2 border-amber-600/30 backdrop-blur-sm"
        style={{
          backgroundImage: 'url(/assets/generated/layer-locked-gate.dim_400x300.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
        }}
      >
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex justify-center">
            <div className="relative">
              <Lock className="w-20 h-20 text-amber-500/80" />
              <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-amber-400">
            {featureName} Locked
          </CardTitle>
          <CardDescription className="text-lg text-amber-200/80">
            Complete the following requirements to unlock <strong className="text-amber-300">{layerNames[minLayer]}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Progress */}
          {progress && (
            <div className="bg-slate-900/60 border border-amber-600/30 rounded-lg p-4 space-y-2">
              <h3 className="text-amber-300 font-semibold mb-3">Your Progress:</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-amber-200/70">
                  <span className="text-amber-400 font-bold">{progress.heroesOwned}</span> Heroes Owned
                </div>
                <div className="text-amber-200/70">
                  <span className="text-amber-400 font-bold">{progress.battlesWon}</span> Battles Won
                </div>
                <div className="text-amber-200/70">
                  <span className="text-amber-400 font-bold">{progress.tournamentsWon}</span> Tournaments Won
                </div>
                <div className="text-amber-200/70">
                  <span className="text-amber-400 font-bold">Layer {progress.maxLayerUnlocked}</span> Unlocked
                </div>
              </div>
            </div>
          )}

          {/* Requirements */}
          <div className="space-y-3">
            <h3 className="text-amber-300 font-semibold">Requirements to Unlock:</h3>
            {requirements.length > 0 ? (
              <ul className="space-y-2">
                {requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-3 text-amber-200/90">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                    </div>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-amber-200/70 italic">Loading requirements...</p>
            )}
          </div>

          {/* Hint */}
          <div className="bg-amber-950/30 border border-amber-600/20 rounded-lg p-4 mt-6">
            <p className="text-sm text-amber-200/70 text-center">
              💡 <strong className="text-amber-300">Tip:</strong> Start by building your stronghold and collecting heroes to progress through the layers.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
