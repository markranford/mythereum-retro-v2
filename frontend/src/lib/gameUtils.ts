/**
 * Shared game utility functions.
 * Centralizes repeated patterns: resource creation, ID generation, etc.
 */

import { Resources } from '../types/strongholds';
import { ResourceAmount } from '../types/economy';

/**
 * Create an empty resources object with all fields set to 0.
 */
export function emptyResources(): Resources {
  return { gold: 0, stone: 0, lumber: 0, iron: 0, food: 0, mana: 0 };
}

/**
 * Create a resources object with a uniform value for each resource.
 */
export function uniformResources(amount: number, mana: number = 0): ResourceAmount {
  return { gold: amount, stone: amount, lumber: amount, iron: amount, food: amount, mana };
}

/**
 * Generate a unique ID with optional prefix.
 * Uses timestamp + random suffix for uniqueness.
 */
export function generateId(prefix: string = ''): string {
  const base = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return prefix ? `${prefix}-${base}` : base;
}

/**
 * Generate a guest account ID.
 */
export function generateGuestAccountId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}
