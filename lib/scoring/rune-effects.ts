/**
 * Rune Effect Calculator
 *
 * Calculates rune bonuses during workout completion.
 * Runes are per-workout effects that modify total workout points.
 */

import { RuneDefinition, getRuneById, RuneEffect } from '@/lib/runes';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkoutRuneContext {
  /** Total number of exercises in the workout */
  exerciseCount: number;
  /** Total number of sets in the workout */
  totalSets: number;
  /** Number of PRs hit during the workout */
  prCount: number;
  /** Number of unique muscle groups trained */
  muscleGroupCount: number;
  /** Number of workouts completed this week (including this one) */
  workoutsThisWeek: number;
  /** The base points earned for this workout (before rune bonuses) */
  basePoints: number;
}

export interface RuneBonusResult {
  /** Rune that triggered this bonus */
  runeId: string;
  runeName: string;
  /** Description of why the bonus was applied */
  reason: string;
  /** Percentage bonus (0.10 = +10%) */
  percentBonus: number;
  /** Flat bonus points */
  flatBonus: number;
  /** Was this rune's condition met? */
  triggered: boolean;
}

export interface RuneBonusesResult {
  /** All bonus results (including non-triggered for debugging) */
  bonuses: RuneBonusResult[];
  /** Total percentage bonus from all triggered runes */
  totalPercentBonus: number;
  /** Total flat bonus from all triggered runes */
  totalFlatBonus: number;
  /** Final bonus points to add (basePoints * percentBonus + flatBonus) */
  finalBonusPoints: number;
}

// ============================================================================
// RUNE EFFECT CALCULATORS
// ============================================================================

/**
 * Calculate effect for Endurance rune
 * +5% per exercise beyond the 3rd
 */
function calculateEnduranceEffect(context: WorkoutRuneContext): RuneEffect {
  const extraExercises = Math.max(0, context.exerciseCount - 3);
  const bonus = extraExercises * 0.05;
  return {
    percentBonus: bonus,
    flatBonus: 0,
  };
}

/**
 * Calculate effect for Consistency rune
 * +15% on workout if 3+ workouts this week
 */
function calculateConsistencyEffect(context: WorkoutRuneContext): RuneEffect {
  const triggered = context.workoutsThisWeek >= 3;
  return {
    percentBonus: triggered ? 0.15 : 0,
    flatBonus: 0,
  };
}

/**
 * Calculate effect for PR Hunter rune
 * +2500 points per PR hit during workout
 */
function calculatePRHunterEffect(context: WorkoutRuneContext): RuneEffect {
  return {
    percentBonus: 0,
    flatBonus: context.prCount * 2500,
  };
}

/**
 * Calculate effect for Volume King rune
 * +20% on workout if 10+ total sets
 */
function calculateVolumeKingEffect(context: WorkoutRuneContext): RuneEffect {
  const triggered = context.totalSets >= 10;
  return {
    percentBonus: triggered ? 0.20 : 0,
    flatBonus: 0,
  };
}

/**
 * Calculate effect for Full Body rune
 * +25% on workout if training 3+ muscle groups
 */
function calculateFullBodyEffect(context: WorkoutRuneContext): RuneEffect {
  const triggered = context.muscleGroupCount >= 3;
  return {
    percentBonus: triggered ? 0.25 : 0,
    flatBonus: 0,
  };
}

// ============================================================================
// MAIN CALCULATOR
// ============================================================================

/**
 * Calculate the effect for a single rune
 */
function calculateRuneEffect(
  rune: RuneDefinition,
  context: WorkoutRuneContext
): RuneEffect {
  switch (rune.id) {
    case 'endurance':
      return calculateEnduranceEffect(context);
    case 'consistency':
      return calculateConsistencyEffect(context);
    case 'pr_hunter':
      return calculatePRHunterEffect(context);
    case 'volume_king':
      return calculateVolumeKingEffect(context);
    case 'full_body':
      return calculateFullBodyEffect(context);
    default:
      return { percentBonus: 0, flatBonus: 0 };
  }
}

/**
 * Get reason text for why a rune triggered (or didn't)
 */
function getRuneReason(
  rune: RuneDefinition,
  context: WorkoutRuneContext,
  effect: RuneEffect
): string {
  const triggered = effect.percentBonus > 0 || effect.flatBonus > 0;

  switch (rune.id) {
    case 'endurance': {
      const extra = Math.max(0, context.exerciseCount - 3);
      return triggered
        ? `${context.exerciseCount} exercises (+${extra} beyond 3rd = +${Math.round(effect.percentBonus * 100)}%)`
        : `Only ${context.exerciseCount} exercises (need 4+ for bonus)`;
    }
    case 'consistency':
      return triggered
        ? `${context.workoutsThisWeek} workouts this week (3+ required)`
        : `Only ${context.workoutsThisWeek} workouts this week (need 3+)`;
    case 'pr_hunter':
      return triggered
        ? `Hit ${context.prCount} PR${context.prCount !== 1 ? 's' : ''} (+${effect.flatBonus} points)`
        : 'No PRs this workout';
    case 'volume_king':
      return triggered
        ? `${context.totalSets} total sets (10+ required)`
        : `Only ${context.totalSets} sets (need 10+)`;
    case 'full_body':
      return triggered
        ? `Trained ${context.muscleGroupCount} muscle groups (3+ required)`
        : `Only ${context.muscleGroupCount} muscle groups (need 3+)`;
    default:
      return '';
  }
}

/**
 * Calculate all rune bonuses for a workout completion
 *
 * @param context - The workout completion context
 * @param equippedRuneIds - Array of rune IDs the user has equipped
 * @returns Combined bonus results from all equipped runes
 */
export function calculateRuneBonuses(
  context: WorkoutRuneContext,
  equippedRuneIds: string[]
): RuneBonusesResult {
  const bonuses: RuneBonusResult[] = [];
  let totalPercentBonus = 0;
  let totalFlatBonus = 0;

  for (const runeId of equippedRuneIds) {
    const rune = getRuneById(runeId);
    if (!rune) continue;

    const effect = calculateRuneEffect(rune, context);
    const triggered = effect.percentBonus > 0 || effect.flatBonus > 0;
    const reason = getRuneReason(rune, context, effect);

    bonuses.push({
      runeId: rune.id,
      runeName: rune.name,
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
