import { ZoneType } from '../types/strongholds';

// Radii for concentric rings (in pixels) - adjusted for better spacing
export const HEX_RADII = {
  keep: 0,      // Center position
  citadel: 130, // Inner ring (increased from 120)
  bailey: 260,  // Middle ring (increased from 240)
  wilds: 380,   // Outer ring (increased from 360)
};

// Total positions: 1 (keep) + 6 (citadel) + 12 (bailey) + 18 (wilds) = 37
export const TOTAL_POSITIONS = 37;

/**
 * Get the 2D position (x, y) and zone for a given hex index
 * Index 0 = center (keep)
 * Indices 1-6 = citadel ring (6 positions)
 * Indices 7-18 = bailey ring (12 positions)
 * Indices 19-36 = wilds ring (18 positions)
 */
export function getPosition(index: number): { x: number; y: number; zone: ZoneType } {
  const centerX = 400; // Half of 800px container
  const centerY = 400;

  if (index === 0) {
    // Keep - center position
    return { x: centerX, y: centerY, zone: 'keep' };
  }

  if (index >= 1 && index <= 6) {
    // Citadel ring - 6 positions with slight offset for organic feel
    const angle = ((index - 1) * 60 * Math.PI) / 180;
    const offset = (index % 2) * 5; // Slight radial variation
    return {
      x: centerX + (HEX_RADII.citadel + offset) * Math.cos(angle),
      y: centerY + (HEX_RADII.citadel + offset) * Math.sin(angle),
      zone: 'citadel',
    };
  }

  if (index >= 7 && index <= 18) {
    // Bailey ring - 12 positions with slight offset
    const angle = ((index - 7) * 30 * Math.PI) / 180;
    const offset = (index % 3) * 4; // Slight radial variation
    return {
      x: centerX + (HEX_RADII.bailey + offset) * Math.cos(angle),
      y: centerY + (HEX_RADII.bailey + offset) * Math.sin(angle),
      zone: 'bailey',
    };
  }

  if (index >= 19 && index <= 36) {
    // Wilds ring - 18 positions with slight offset
    const angle = ((index - 19) * 20 * Math.PI) / 180;
    const offset = (index % 4) * 3; // Slight radial variation
    return {
      x: centerX + (HEX_RADII.wilds + offset) * Math.cos(angle),
      y: centerY + (HEX_RADII.wilds + offset) * Math.sin(angle),
      zone: 'wilds',
    };
  }

  // Fallback to center
  return { x: centerX, y: centerY, zone: 'keep' };
}

/**
 * Map a position index to its zone type
 */
export function getZoneFromIndex(index: number): ZoneType {
  if (index === 0) return 'keep';
  if (index >= 1 && index <= 6) return 'citadel';
  if (index >= 7 && index <= 18) return 'bailey';
  return 'wilds';
}

/**
 * Get all position indices for a given zone
 */
export function getIndicesForZone(zone: ZoneType): number[] {
  switch (zone) {
    case 'keep':
      return [0];
    case 'citadel':
      return [1, 2, 3, 4, 5, 6];
    case 'bailey':
      return [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    case 'wilds':
      return [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
  }
}

