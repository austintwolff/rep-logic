/**
 * Rune Definitions
 *
 * Runes are per-workout effects that modify the total workout points.
 * Unlike charms (which apply per-exercise), runes apply bonuses to the entire workout.
 */

import { CharmRarity } from '../charm-drop';

// ============================================================================
// TYPES
// ============================================================================

export type RuneEffectType =
  | 'exercise_count_bonus'  // Bonus based on number of exercises
  | 'consistency_bonus'     // Bonus for workout frequency
  | 'pr_count_bonus'        // Flat bonus per PR in workout
  | 'volume_bonus'          // Bonus for high total sets
  | 'muscle_group_bonus';   // Bonus for training multiple muscle groups

export interface RuneDefinition {
  id: string;
  name: string;
  description: string;
  rarity: CharmRarity;
  effectType: RuneEffectType;
  /** Minimum user level required to equip (0 = no restriction) */
  minLevel: number;
  /** Maximum level this rune can drop at (10 for level 0-10 runes) */
  maxDropLevel: number;
}

export interface RuneEffect {
  /** Percentage multiplier (0.10 = +10%) */
  percentBonus: number;
  /** Flat points to add */
  flatBonus: number;
}

// ============================================================================
// RUNE DEFINITIONS
// ============================================================================

export const RUNE_DEFINITIONS: RuneDefinition[] = [
  {
    id: 'endurance',
    name: 'Endurance',
    description: '+5% per exercise beyond the 3rd',
    rarity: 'Common',
    effectType: 'exercise_count_bonus',
    minLevel: 0,
    maxDropLevel: 10,
  },
  {
    id: 'consistency',
    name: 'Consistency',
    description: '+15% on workout if 3+ workouts this week',
    rarity: 'Common',
    effectType: 'consistency_bonus',
    minLevel: 0,
    maxDropLevel: 10,
  },
  {
    id: 'pr_hunter',
    name: 'PR Hunter',
    description: '+2500 points per PR hit during workout',
    rarity: 'Common',
    effectType: 'pr_count_bonus',
    minLevel: 0,
    maxDropLevel: 10,
  },
  {
    id: 'volume_king',
    name: 'Volume King',
    description: '+20% on workout if 10+ total sets',
    rarity: 'Common',
    effectType: 'volume_bonus',
    minLevel: 0,
    maxDropLevel: 10,
  },
  {
    id: 'full_body',
    name: 'Full Body',
    description: '+25% on workout if training 3+ muscle groups',
    rarity: 'Common',
    effectType: 'muscle_group_bonus',
    minLevel: 0,
    maxDropLevel: 10,
  },
];

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

/** Map of rune ID to definition for quick lookups */
export const RUNE_BY_ID = new Map<string, RuneDefinition>(
  RUNE_DEFINITIONS.map((rune) => [rune.id, rune])
);

/**
 * Get a rune definition by ID
 */
export function getRuneById(runeId: string): RuneDefinition | undefined {
  return RUNE_BY_ID.get(runeId);
}

/**
 * Get all runes that can drop at a given level
 */
export function getRunesForLevel(level: number): RuneDefinition[] {
  return RUNE_DEFINITIONS.filter(
    (rune) => level >= rune.minLevel && level <= rune.maxDropLevel
  );
}
