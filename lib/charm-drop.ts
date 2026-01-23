/**
 * Charm Drop System
 *
 * Determines whether a charm drops after completing an exercise, based on:
 * 1. Quality Tier (0-3) - computed from sets, rep-range adherence, and PR hits
 * 2. Drop Trigger Roll - chance to drop increases with tier
 * 3. Rarity Roll - Common/Rare/Epic, influenced by tier
 * 4. Level-Based Rarity Gating - caps rarity based on highest involved muscle level
 */

import { GoalBucket, GOAL_REP_RANGES } from './points-engine/types';
import { WorkoutSet } from '@/stores/workout.store';

// ============================================================================
// TYPES
// ============================================================================

export type CharmRarity = 'Common' | 'Rare' | 'Epic';

export type QualityTier = 0 | 1 | 2 | 3;

/** Muscle level data needed for rarity gating */
export interface MuscleLevelData {
  /** Muscle group name (lowercase, e.g., "chest", "biceps") */
  muscleGroup: string;
  /** Current level for this muscle (0-25) */
  level: number;
}

export interface CharmDropResult {
  /** Whether this exercise was eligible for a drop (>= MIN_SETS_FOR_DROP) */
  eligible: boolean;
  /** Quality tier computed from adherence + PR */
  qualityTier: QualityTier;
  /** Whether a charm dropped */
  didDrop: boolean;
  /** Final rarity after gating (null if no drop) */
  rarity: CharmRarity | null;
  /** Number of sets to add to pity counter (from this exercise) */
  setsToAddToPity: number;
  /** Debug information for tuning */
  debug: {
    setsLogged: number;
    adherencePercent: number;
    prHit: boolean;
    baseDropChance: number;
    finalDropChance: number;
    dropRoll: number;
    rarityRoll: number | null;
    /** Pity system info */
    pity: {
      setsSinceLastCharm: number;
      pityBonus: number;
      wasGuaranteed: boolean;
    };
    /** Gating info (only present if a drop occurred) */
    gating: {
      /** Highest muscle level among involved muscles */
      gatingLevel: number;
      /** Maximum rarity allowed by gating level */
      maxAllowedRarity: CharmRarity;
      /** Rarity that was rolled before gating */
      rolledRarity: CharmRarity;
      /** Final rarity after applying gating */
      finalRarity: CharmRarity;
      /** Whether gating downgraded the rarity */
      wasDowngraded: boolean;
    } | null;
  };
}

export interface ExerciseCompletionContext {
  sets: WorkoutSet[];
  workoutGoal: GoalBucket;
  /** Muscle groups involved in this exercise (1-3 muscles) */
  muscles: string[];
  /** Current muscle levels for gating calculation */
  muscleLevels: MuscleLevelData[];
  /** Number of sets completed since last charm drop (for pity system) */
  setsSinceLastCharm: number;
}

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const CHARM_DROP_CONFIG = {
  /**
   * DEV/TESTING TOGGLE
   * When true, forces didDrop = true on every eligible exercise completion.
   * Tier and rarity are still computed normally.
   */
  FORCE_DROP_FOR_TESTING: false,

  /**
   * Minimum sets required for drop eligibility.
   * Exercises with fewer sets never trigger charm logic.
   */
  MIN_SETS_FOR_DROP: 2,

  /**
   * Pity System
   * Guarantees a charm drop after X sets without one.
   * Resets when a charm drops.
   */
  PITY: {
    /** Sets without a charm before pity kicks in */
    SETS_THRESHOLD: 8,
    /** Bonus drop chance per set over threshold (additive) */
    BONUS_PER_SET: 0.15, // +15% per set over threshold
  },

  /**
   * Rep-range adherence thresholds.
   * "Adherence" = % of sets whose reps fall within the workout's goal rep range.
   */
  ADHERENCE: {
    /** Threshold for "decent" adherence (affects tier calculation) */
    DECENT: 0.5, // 50%
    /** Threshold for "high" adherence (affects tier calculation) */
    HIGH: 0.8,   // 80%
  },

  /**
   * Base drop chance per quality tier.
   * These are the starting probabilities before modifiers.
   */
  DROP_CHANCE_BY_TIER: {
    0: 0.12,  // 12% base chance at Tier 0 (was 5%)
    1: 0.20,  // 20% base chance at Tier 1 (was 12%)
    2: 0.32,  // 32% base chance at Tier 2 (was 22%)
    3: 0.45,  // 45% base chance at Tier 3 (was 35%)
  } as Record<QualityTier, number>,

  /**
   * Additive modifiers to drop chance.
   */
  DROP_MODIFIERS: {
    /** Bonus for hitting a PR (additive) */
    PR_BONUS: 0.08, // +8% (was 5%)
    /** Max bonus from adherence (scaled by adherence %) */
    ADHERENCE_MAX_BONUS: 0.08, // Up to +8% at 100% adherence (was 5%)
  },

  /**
   * Rarity distribution at Tier 0 (baseline).
   * Values are cumulative thresholds: roll 0-1, compare against thresholds.
   * E.g., [0.75, 0.95] means: Common if roll < 0.75, Rare if < 0.95, else Epic
   */
  RARITY_THRESHOLDS_TIER_0: {
    COMMON: 0.75,  // 75% Common
    RARE: 0.95,    // 20% Rare
    // Epic: 5%
  },

  /**
   * How much each tier shifts rarity toward better outcomes.
   * Applied as reduction to Common threshold and increase to Epic chance.
   */
  RARITY_TIER_SHIFT: 0.05, // Each tier shifts ~5%

  /**
   * Small rarity nudges for PR and adherence.
   * These are much smaller than tier effects.
   */
  RARITY_MODIFIERS: {
    PR_SHIFT: 0.02,           // PR shifts rarity +2% toward better
    ADHERENCE_MAX_SHIFT: 0.02, // Full adherence shifts +2% toward better
  },

  /**
   * Level-Based Rarity Gating
   * Maps the highest involved muscle level to the maximum allowed rarity.
   * If rolled rarity exceeds max allowed, it's downgraded.
   */
  RARITY_GATING: {
    /** Minimum muscle level required to drop Rare charms */
    RARE_MIN_LEVEL: 6,
    /** Minimum muscle level required to drop Epic charms */
    EPIC_MIN_LEVEL: 16,
  },
} as const;

// ============================================================================
// CORE LOGIC
// ============================================================================

/**
 * Calculate the percentage of sets that fall within the goal's rep range.
 */
function calculateAdherence(sets: WorkoutSet[], goal: GoalBucket): number {
  if (sets.length === 0) return 0;

  const range = GOAL_REP_RANGES[goal];
  const adherentSets = sets.filter(
    (s) => s.reps >= range.min && s.reps <= range.max
  );

  return adherentSets.length / sets.length;
}

/**
 * Check if any set in the exercise hit a PR.
 * Uses the existing isPR flag that's already computed per-set.
 */
function checkPRHit(sets: WorkoutSet[]): boolean {
  return sets.some((s) => s.isPR);
}

/**
 * Determine the quality tier (0-3) based on adherence and PR.
 *
 * Tier rules:
 * - Tier 0: meets minimum (>=2 sets) but low adherence AND no PR
 * - Tier 1: PR OR decent adherence
 * - Tier 2: (PR + decent adherence) OR high adherence
 * - Tier 3: PR + high adherence
 */
function calculateQualityTier(adherence: number, prHit: boolean): QualityTier {
  const { DECENT, HIGH } = CHARM_DROP_CONFIG.ADHERENCE;

  const hasDecentAdherence = adherence >= DECENT;
  const hasHighAdherence = adherence >= HIGH;

  // Tier 3: PR + high adherence
  if (prHit && hasHighAdherence) {
    return 3;
  }

  // Tier 2: (PR + decent adherence) OR high adherence alone
  if ((prHit && hasDecentAdherence) || hasHighAdherence) {
    return 2;
  }

  // Tier 1: PR OR decent adherence
  if (prHit || hasDecentAdherence) {
    return 1;
  }

  // Tier 0: minimum effort only
  return 0;
}

/**
 * Compute the final drop chance after applying modifiers.
 */
function calculateDropChance(
  tier: QualityTier,
  adherence: number,
  prHit: boolean
): number {
  const { DROP_CHANCE_BY_TIER, DROP_MODIFIERS } = CHARM_DROP_CONFIG;

  let chance = DROP_CHANCE_BY_TIER[tier];

  // Add PR bonus
  if (prHit) {
    chance += DROP_MODIFIERS.PR_BONUS;
  }

  // Add adherence bonus (scaled)
  chance += adherence * DROP_MODIFIERS.ADHERENCE_MAX_BONUS;

  // Cap at 100%
  return Math.min(chance, 1.0);
}

/**
 * Roll for rarity, with tier and modifiers shifting odds.
 */
function rollRarity(
  tier: QualityTier,
  adherence: number,
  prHit: boolean
): { rarity: CharmRarity; roll: number } {
  const {
    RARITY_THRESHOLDS_TIER_0,
    RARITY_TIER_SHIFT,
    RARITY_MODIFIERS,
  } = CHARM_DROP_CONFIG;

  // Calculate total shift toward better rarity
  let shift = tier * RARITY_TIER_SHIFT;
  if (prHit) {
    shift += RARITY_MODIFIERS.PR_SHIFT;
  }
  shift += adherence * RARITY_MODIFIERS.ADHERENCE_MAX_SHIFT;

  // Adjust thresholds (lower Common threshold = less Common, more Rare/Epic)
  const commonThreshold = Math.max(0.1, RARITY_THRESHOLDS_TIER_0.COMMON - shift);
  const rareThreshold = Math.min(0.99, RARITY_THRESHOLDS_TIER_0.RARE - shift * 0.5);

  const roll = Math.random();

  let rarity: CharmRarity;
  if (roll < commonThreshold) {
    rarity = 'Common';
  } else if (roll < rareThreshold) {
    rarity = 'Rare';
  } else {
    rarity = 'Epic';
  }

  return { rarity, roll };
}

// ============================================================================
// LEVEL-BASED RARITY GATING
// ============================================================================

/**
 * Rarity ordering for comparison (higher index = better rarity)
 */
const RARITY_ORDER: CharmRarity[] = ['Common', 'Rare', 'Epic'];

/**
 * Compute the "gating level" from the exercise's involved muscles.
 * For compound exercises (2-3 muscles), uses the HIGHEST muscle level.
 * For single-muscle exercises, uses that muscle's level.
 *
 * @param muscles - Muscle group names involved in the exercise (1-3)
 * @param muscleLevels - Current muscle level data for the user
 * @returns The gating level (highest level among involved muscles, or 0 if no data)
 */
export function computeGatingLevel(
  muscles: string[],
  muscleLevels: MuscleLevelData[]
): number {
  if (muscles.length === 0) return 0;

  // Create a map for quick lookup (normalize to lowercase)
  const levelMap = new Map<string, number>();
  for (const ml of muscleLevels) {
    levelMap.set(ml.muscleGroup.toLowerCase(), ml.level);
  }

  // Find the highest level among involved muscles
  let maxLevel = 0;
  for (const muscle of muscles) {
    const normalizedMuscle = muscle.toLowerCase();
    const level = levelMap.get(normalizedMuscle) ?? 0;
    if (level > maxLevel) {
      maxLevel = level;
    }
  }

  return maxLevel;
}

/**
 * Determine the maximum allowed rarity based on the gating level.
 *
 * Thresholds (configurable):
 * - Level 0-5: Common only
 * - Level 6-15: Rare max
 * - Level 16+: Epic allowed
 *
 * @param gatingLevel - The computed gating level
 * @returns The maximum rarity that can drop
 */
export function getMaxAllowedRarity(gatingLevel: number): CharmRarity {
  const { RARE_MIN_LEVEL, EPIC_MIN_LEVEL } = CHARM_DROP_CONFIG.RARITY_GATING;

  if (gatingLevel >= EPIC_MIN_LEVEL) {
    return 'Epic';
  }
  if (gatingLevel >= RARE_MIN_LEVEL) {
    return 'Rare';
  }
  return 'Common';
}

/**
 * Apply rarity gating: if rolled rarity exceeds max allowed, downgrade it.
 *
 * @param rolledRarity - The rarity that was rolled
 * @param maxAllowedRarity - The maximum rarity allowed by gating
 * @returns The final rarity (possibly downgraded)
 */
function applyRarityGating(
  rolledRarity: CharmRarity,
  maxAllowedRarity: CharmRarity
): { finalRarity: CharmRarity; wasDowngraded: boolean } {
  const rolledIndex = RARITY_ORDER.indexOf(rolledRarity);
  const maxIndex = RARITY_ORDER.indexOf(maxAllowedRarity);

  if (rolledIndex > maxIndex) {
    // Downgrade to max allowed
    return {
      finalRarity: maxAllowedRarity,
      wasDowngraded: true,
    };
  }

  return {
    finalRarity: rolledRarity,
    wasDowngraded: false,
  };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Evaluate whether a charm drops after completing an exercise.
 *
 * Call this when an exercise is marked as completed.
 * Returns full result including eligibility, tier, drop status, rarity, and gating info.
 *
 * @param context - The completed exercise's sets, workout goal, muscles, and muscle levels
 * @returns CharmDropResult with all computed values and debug info
 */
export function evaluateCharmDrop(context: ExerciseCompletionContext): CharmDropResult {
  const { sets, workoutGoal, muscles, muscleLevels, setsSinceLastCharm } = context;
  const { MIN_SETS_FOR_DROP, FORCE_DROP_FOR_TESTING, PITY } = CHARM_DROP_CONFIG;

  const setsLogged = sets.length;

  // Check eligibility
  if (setsLogged < MIN_SETS_FOR_DROP) {
    return {
      eligible: false,
      qualityTier: 0,
      didDrop: false,
      rarity: null,
      setsToAddToPity: setsLogged,
      debug: {
        setsLogged,
        adherencePercent: 0,
        prHit: false,
        baseDropChance: 0,
        finalDropChance: 0,
        dropRoll: 0,
        rarityRoll: null,
        pity: {
          setsSinceLastCharm,
          pityBonus: 0,
          wasGuaranteed: false,
        },
        gating: null,
      },
    };
  }

  // Calculate metrics
  const adherence = calculateAdherence(sets, workoutGoal);
  const prHit = checkPRHit(sets);
  const qualityTier = calculateQualityTier(adherence, prHit);

  // Calculate base drop chance
  const baseDropChance = CHARM_DROP_CONFIG.DROP_CHANCE_BY_TIER[qualityTier];
  let finalDropChance = calculateDropChance(qualityTier, adherence, prHit);

  // Apply pity bonus if over threshold
  let pityBonus = 0;
  let wasGuaranteed = false;
  const totalSetsSinceCharm = setsSinceLastCharm + setsLogged;

  if (totalSetsSinceCharm > PITY.SETS_THRESHOLD) {
    const setsOverThreshold = totalSetsSinceCharm - PITY.SETS_THRESHOLD;
    pityBonus = setsOverThreshold * PITY.BONUS_PER_SET;
    finalDropChance = Math.min(finalDropChance + pityBonus, 1.0);

    // If pity pushes us to 100%, mark as guaranteed
    if (finalDropChance >= 1.0) {
      wasGuaranteed = true;
    }
  }

  // Roll for drop
  const dropRoll = Math.random();
  let didDrop = dropRoll < finalDropChance;

  // Testing override
  if (FORCE_DROP_FOR_TESTING) {
    didDrop = true;
  }

  // Roll for rarity and apply gating if dropped
  let finalRarity: CharmRarity | null = null;
  let rarityRoll: number | null = null;
  let gatingInfo: CharmDropResult['debug']['gating'] = null;

  if (didDrop) {
    // Roll the initial rarity
    const rarityResult = rollRarity(qualityTier, adherence, prHit);
    const rolledRarity = rarityResult.rarity;
    rarityRoll = rarityResult.roll;

    // Compute gating level and max allowed rarity
    const gatingLevel = computeGatingLevel(muscles, muscleLevels);
    const maxAllowedRarity = getMaxAllowedRarity(gatingLevel);

    // Apply gating (downgrade if necessary)
    const { finalRarity: gatedRarity, wasDowngraded } = applyRarityGating(
      rolledRarity,
      maxAllowedRarity
    );

    finalRarity = gatedRarity;

    // Store gating info for debugging
    gatingInfo = {
      gatingLevel,
      maxAllowedRarity,
      rolledRarity,
      finalRarity: gatedRarity,
      wasDowngraded,
    };
  }

  return {
    eligible: true,
    qualityTier,
    didDrop,
    rarity: finalRarity,
    setsToAddToPity: didDrop ? 0 : setsLogged, // Reset if dropped, otherwise add sets
    debug: {
      setsLogged,
      adherencePercent: Math.round(adherence * 100),
      prHit,
      baseDropChance,
      finalDropChance,
      dropRoll,
      rarityRoll,
      pity: {
        setsSinceLastCharm: totalSetsSinceCharm,
        pityBonus: Math.round(pityBonus * 100) / 100,
        wasGuaranteed,
      },
      gating: gatingInfo,
    },
  };
}

/**
 * Utility to enable testing mode at runtime.
 * Note: This modifies the config object directly.
 */
export function setCharmDropTestingMode(enabled: boolean): void {
  (CHARM_DROP_CONFIG as any).FORCE_DROP_FOR_TESTING = enabled;
}

/**
 * Check if testing mode is currently enabled.
 */
export function isCharmDropTestingMode(): boolean {
  return CHARM_DROP_CONFIG.FORCE_DROP_FOR_TESTING;
}
