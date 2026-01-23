/**
 * Charm Definitions
 *
 * Charms are per-exercise effects that modify points earned during workout completion.
 * Players can equip charms to gain bonuses when specific conditions are met.
 */

import { CharmRarity } from '../charm-drop';

// ============================================================================
// TYPES
// ============================================================================

export type CharmEffectType =
  | 'set_count_bonus'      // Bonus based on number of sets
  | 'pr_bonus'             // Bonus when hitting a PR
  | 'rep_range_bonus'      // Bonus for staying in goal rep range
  | 'compound_bonus'       // Bonus for compound exercises
  | 'first_set_bonus'      // Bonus for first set of exercise
  | 'streak_bonus'         // Bonus based on workout streak
  | 'volume_multiplier'    // Multiplier for high volume workouts
  | 'overload_bonus'       // Enhanced progressive overload bonus
  | 'muscle_mastery'       // Bonus for trained muscle groups
  | 'compound_mastery'     // Enhanced compound exercise bonus
  | 'balance_bonus';       // Bonus for balanced training

export interface CharmDefinition {
  id: string;
  name: string;
  description: string;
  rarity: CharmRarity;
  effectType: CharmEffectType;
  /** Minimum user level required to equip (0 = no restriction) */
  minLevel: number;
  /** Maximum level this charm can drop at (10 for level 0-10 charms) */
  maxDropLevel: number;
  /** Image asset for this charm */
  image: number; // React Native image require returns a number
}

export interface CharmEffect {
  /** Percentage multiplier (0.10 = +10%) */
  percentBonus: number;
  /** Flat points to add */
  flatBonus: number;
}

// ============================================================================
// CHARM DEFINITIONS
// ============================================================================

// Image imports (must be static requires for React Native)
const CHARM_IMAGES = {
  // Common
  momentum: require('@/assets/charms/common/momentum.png'),
  iron_will: require('@/assets/charms/common/iron_will.png'),
  rep_range_master: require('@/assets/charms/common/rep_range_master.png'),
  compound_king: require('@/assets/charms/common/compound_king.png'),
  first_rep: require('@/assets/charms/common/first_rep.png'),
  // Rare
  pr_hunter: require('@/assets/charms/rare/pr_hunter.png'),
  streak_keeper: require('@/assets/charms/rare/streak_keeper.png'),
  volume_master: require('@/assets/charms/rare/volume_master.png'),
  // Epic
  rage_mode: require('@/assets/charms/epic/rage_mode.png'),
  perfect_form: require('@/assets/charms/epic/perfect_form.png'),
} as const;

export const CHARM_DEFINITIONS: CharmDefinition[] = [
  {
    id: 'momentum',
    name: 'Momentum',
    description: '+10% points when completing 3+ sets',
    rarity: 'Common',
    effectType: 'set_count_bonus',
    minLevel: 0,
    maxDropLevel: 10,
    image: CHARM_IMAGES.momentum,
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: '+25 bonus points when hitting a PR',
    rarity: 'Common',
    effectType: 'pr_bonus',
    minLevel: 0,
    maxDropLevel: 10,
    image: CHARM_IMAGES.iron_will,
  },
  {
    id: 'rep_range_master',
    name: 'Rep Range Master',
    description: '+15% when ALL sets are in goal rep range',
    rarity: 'Common',
    effectType: 'rep_range_bonus',
    minLevel: 0,
    maxDropLevel: 10,
    image: CHARM_IMAGES.rep_range_master,
  },
  {
    id: 'compound_king',
    name: 'Compound King',
    description: '+20% on exercises targeting 2+ muscles',
    rarity: 'Common',
    effectType: 'compound_bonus',
    minLevel: 0,
    maxDropLevel: 10,
    image: CHARM_IMAGES.compound_king,
  },
  {
    id: 'first_rep',
    name: 'First Rep',
    description: '+10% on the first set of every exercise',
    rarity: 'Common',
    effectType: 'first_set_bonus',
    minLevel: 0,
    maxDropLevel: 10,
    image: CHARM_IMAGES.first_rep,
  },
  // ---- RARE CHARMS ----
  {
    id: 'pr_hunter',
    name: 'PR Hunter',
    description: '+100 bonus points when hitting a PR',
    rarity: 'Rare',
    effectType: 'overload_bonus',
    minLevel: 5,
    maxDropLevel: 25,
    image: CHARM_IMAGES.pr_hunter,
  },
  {
    id: 'streak_keeper',
    name: 'Streak Keeper',
    description: '+15% bonus when on a 3+ day workout streak',
    rarity: 'Rare',
    effectType: 'streak_bonus',
    minLevel: 5,
    maxDropLevel: 25,
    image: CHARM_IMAGES.streak_keeper,
  },
  {
    id: 'volume_master',
    name: 'Volume Master',
    description: '+20% points on your 4th+ set of an exercise',
    rarity: 'Rare',
    effectType: 'volume_multiplier',
    minLevel: 5,
    maxDropLevel: 25,
    image: CHARM_IMAGES.volume_master,
  },
  // ---- EPIC CHARMS ----
  {
    id: 'rage_mode',
    name: 'Rage Mode',
    description: '+50% on sets with 5+ reps at high weight',
    rarity: 'Epic',
    effectType: 'compound_mastery',
    minLevel: 10,
    maxDropLevel: 50,
    image: CHARM_IMAGES.rage_mode,
  },
  {
    id: 'perfect_form',
    name: 'Perfect Form',
    description: '+35% when all sets hit goal rep range',
    rarity: 'Epic',
    effectType: 'rep_range_bonus',
    minLevel: 10,
    maxDropLevel: 50,
    image: CHARM_IMAGES.perfect_form,
  },
];

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

/** Map of charm ID to definition for quick lookups */
export const CHARM_BY_ID = new Map<string, CharmDefinition>(
  CHARM_DEFINITIONS.map((charm) => [charm.id, charm])
);

/**
 * Get a charm definition by ID
 */
export function getCharmById(charmId: string): CharmDefinition | undefined {
  return CHARM_BY_ID.get(charmId);
}

/**
 * Get all charms that can drop at a given level
 */
export function getCharmsForLevel(level: number): CharmDefinition[] {
  return CHARM_DEFINITIONS.filter(
    (charm) => level >= charm.minLevel && level <= charm.maxDropLevel
  );
}

/**
 * Get all charms of a specific rarity
 */
export function getCharmsByRarity(rarity: CharmRarity): CharmDefinition[] {
  return CHARM_DEFINITIONS.filter((charm) => charm.rarity === rarity);
}
