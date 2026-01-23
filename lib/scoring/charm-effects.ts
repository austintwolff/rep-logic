/**
 * Charm Effect Calculator
 *
 * Calculates charm bonuses during exercise completion.
 * Charms are per-exercise effects that modify points earned.
 */

import { WorkoutSet } from '@/stores/workout.store';
import { GoalBucket, GOAL_REP_RANGES } from '@/lib/points-engine/types';
import { CharmDefinition, getCharmById, CharmEffect } from '@/lib/charms';

// ============================================================================
// TYPES
// ============================================================================

export interface ExerciseCharmContext {
  /** All sets completed for this exercise */
  sets: WorkoutSet[];
  /** The workout's goal (Strength, Hypertrophy, Endurance) */
  workoutGoal: GoalBucket;
  /** Whether this exercise is compound (targets 2+ muscles) */
  isCompound: boolean;
  /** Number of muscle groups targeted by this exercise */
  muscleGroupCount: number;
  /** Whether any set in this exercise hit a PR */
  hasPR: boolean;
  /** The base points earned for this exercise (before charm bonuses) */
  basePoints: number;
}

export interface CharmBonusResult {
  /** Charm that triggered this bonus */
  charmId: string;
  charmName: string;
  /** Description of why the bonus was applied */
  reason: string;
  /** Percentage bonus (0.10 = +10%) */
  percentBonus: number;
  /** Flat bonus points */
  flatBonus: number;
  /** Was this charm's condition met? */
  triggered: boolean;
}

export interface CharmBonusesResult {
  /** All bonus results (including non-triggered for debugging) */
  bonuses: CharmBonusResult[];
  /** Total percentage bonus from all triggered charms */
  totalPercentBonus: number;
  /** Total flat bonus from all triggered charms */
  totalFlatBonus: number;
  /** Final bonus points to add (basePoints * percentBonus + flatBonus) */
  finalBonusPoints: number;
}

// ============================================================================
// CHARM EFFECT CALCULATORS
// ============================================================================

/**
 * Calculate effect for Momentum charm
 * +10% points when completing 3+ sets
 */
function calculateMomentumEffect(context: ExerciseCharmContext): CharmEffect {
  const triggered = context.sets.length >= 3;
  return {
    percentBonus: triggered ? 0.10 : 0,
    flatBonus: 0,
  };
}

/**
 * Calculate effect for Iron Will charm
 * +25 bonus points when hitting a PR
 */
function calculateIronWillEffect(context: ExerciseCharmContext): CharmEffect {
  const triggered = context.hasPR;
  return {
    percentBonus: 0,
    flatBonus: triggered ? 25 : 0,
  };
}

/**
 * Calculate effect for Rep Range Master charm
 * +15% when ALL sets are in goal rep range
 */
function calculateRepRangeMasterEffect(context: ExerciseCharmContext): CharmEffect {
  if (context.sets.length === 0) {
    return { percentBonus: 0, flatBonus: 0 };
  }

  const range = GOAL_REP_RANGES[context.workoutGoal];
  const allInRange = context.sets.every(
    (set) => set.reps >= range.min && set.reps <= range.max
  );

  return {
    percentBonus: allInRange ? 0.15 : 0,
    flatBonus: 0,
  };
}

/**
 * Calculate effect for Compound King charm
 * +20% on exercises targeting 2+ muscles
 */
function calculateCompoundKingEffect(context: ExerciseCharmContext): CharmEffect {
  const triggered = context.isCompound || context.muscleGroupCount >= 2;
  return {
    percentBonus: triggered ? 0.20 : 0,
    flatBonus: 0,
  };
}

/**
 * Calculate effect for First Rep charm
 * +10% on the first set of every exercise
 *
 * Note: This applies to the entire exercise's first set points only.
 * For simplicity, we apply it as a small bonus to the whole exercise.
 */
function calculateFirstRepEffect(context: ExerciseCharmContext): CharmEffect {
  // This charm always triggers if there's at least one set
  // The 10% applies to the first set, but since we're calculating per-exercise,
  // we approximate by giving a smaller bonus based on set count
  if (context.sets.length === 0) {
    return { percentBonus: 0, flatBonus: 0 };
  }

  // First set bonus is ~10% of (1/numSets) of total points
  // Simplified: give 10% / numSets as a percent bonus
  const effectiveBonus = 0.10 / context.sets.length;
  return {
    percentBonus: effectiveBonus,
    flatBonus: 0,
  };
}

// ============================================================================
// MAIN CALCULATOR
// ============================================================================

/**
 * Calculate the effect for a single charm
 */
function calculateCharmEffect(
  charm: CharmDefinition,
  context: ExerciseCharmContext
): CharmEffect {
  switch (charm.id) {
    case 'momentum':
      return calculateMomentumEffect(context);
    case 'iron_will':
      return calculateIronWillEffect(context);
    case 'rep_range_master':
      return calculateRepRangeMasterEffect(context);
    case 'compound_king':
      return calculateCompoundKingEffect(context);
    case 'first_rep':
      return calculateFirstRepEffect(context);
    default:
      return { percentBonus: 0, flatBonus: 0 };
  }
}

/**
 * Get reason text for why a charm triggered (or didn't)
 */
function getCharmReason(
  charm: CharmDefinition,
  context: ExerciseCharmContext,
  effect: CharmEffect
): string {
  const triggered = effect.percentBonus > 0 || effect.flatBonus > 0;

  switch (charm.id) {
    case 'momentum':
      return triggered
        ? `Completed ${context.sets.length} sets (3+ required)`
        : `Only ${context.sets.length} sets (need 3+)`;
    case 'iron_will':
      return triggered ? 'Hit a PR!' : 'No PR this exercise';
    case 'rep_range_master':
      return triggered
        ? `All ${context.sets.length} sets in ${context.workoutGoal} rep range`
        : `Not all sets in ${context.workoutGoal} rep range`;
    case 'compound_king':
      return triggered
        ? `Compound exercise (${context.muscleGroupCount} muscles)`
        : 'Single muscle exercise';
    case 'first_rep':
      return triggered ? 'First set bonus applied' : 'No sets logged';
    default:
      return '';
  }
}

/**
 * Calculate all charm bonuses for an exercise completion
 *
 * @param context - The exercise completion context
 * @param equippedCharmIds - Array of charm IDs the user has equipped
 * @returns Combined bonus results from all equipped charms
 */
export function calculateCharmBonuses(
  context: ExerciseCharmContext,
  equippedCharmIds: string[]
): CharmBonusesResult {
  const bonuses: CharmBonusResult[] = [];
  let totalPercentBonus = 0;
  let totalFlatBonus = 0;

  for (const charmId of equippedCharmIds) {
    const charm = getCharmById(charmId);
    if (!charm) continue;

    const effect = calculateCharmEffect(charm, context);
    const triggered = effect.percentBonus > 0 || effect.flatBonus > 0;
    const reason = getCharmReason(charm, context, effect);

    bonuses.push({
      charmId: charm.id,
      charmName: charm.name,
      reason,
      percentBonus: effect.percentBonus,
      flatBonus: effect.flatBonus,
      triggered,
    });

    if (triggered) {
      totalPercentBonus += effect.percentBonus;
      totalFlatBonus += effect.flatBonus;
    }
  }

  // Calculate final bonus: base * percent + flat
  const percentBonusPoints = Math.floor(context.basePoints * totalPercentBonus);
  const finalBonusPoints = percentBonusPoints + totalFlatBonus;

  return {
    bonuses,
    totalPercentBonus,
    totalFlatBonus,
    finalBonusPoints,
  };
}
