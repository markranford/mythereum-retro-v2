import { useEffect } from 'react';
import { useHeroes } from '../context/HeroesContext';
import { useProgress } from '../context/ProgressContext';

/**
 * ProgressSync component handles synchronization between HeroesContext and ProgressContext.
 * This component must be rendered inside both providers to work correctly.
 */
export default function ProgressSync() {
  const { heroes } = useHeroes();
  const { registerHeroCount } = useProgress();

  useEffect(() => {
    registerHeroCount(heroes.length);
    console.log('[ProgressSync] Registered hero count:', heroes.length);
  }, [heroes.length, registerHeroCount]);

  return null;
}
