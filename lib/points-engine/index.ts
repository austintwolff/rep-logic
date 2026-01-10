import {
  SetPointsInput,
  PointBonus,
  PointsResult,
  UserPointsContext,
  WorkoutCompletionInput,
  PreviousBest,
} from './types';

/**
 * Calculate the estimated one-rep max using the Epley formula
 */
export function calculateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps === 0 || weight === 0) return 0;
  return weight * (1 + reps / 30);
}

/**
 * Calculate difficulty factor based on rep range
 * Higher reps = slightly diminishing returns per rep
 */
function calculateRepDifficultyFactor(reps: number): number {
  if (reps <= 5) return 1.0;
  if (reps <= 10) return 0.95;
  if (reps <= 15) return 0.85;
  return 0.75;
}

/**
 * Calculate base points for a set
 * Formula: (weight_kg / 10) * reps * difficulty_factor
 */
export function calculateBasePoints(input: SetPointsInput): number {
  const { exerciseType, weight, reps, userBodyweight } = input;

  let effectiveWeight: number;

  if (exerciseType === 'weighted') {
    effectiveWeight = weight ?? 0;
  } else {
    // Bodyweight exercises: use ~65% of bodyweight as effective resistance
    effectiveWeight = userBodyweight * 0.65;
  }

  const difficultyFactor = calculateRepDifficultyFactor(reps);

  // Base formula: (weight in kg / 10) * reps * difficulty
  // Example: 100kg squat x 8 reps = (100/10) * 8 * 0.95 = 76 points
  const basePoints = Math.floor((effectiveWeight / 10) * reps * difficultyFactor);

  return Math.max(basePoints, 1); // Minimum 1 point per set
}

/**
 * Calculate progressive overload bonus
 * Compares current set to previous best performance
 */
export function calculateOverloadBonus(
  input: SetPointsInput
): PointBonus | null {
  if (!input.previousBest) return null;

  const currentOneRepMax = calculateOneRepMax(input.weight ?? 0, input.reps);
  const previousOneRepMax = input.previousBest.oneRepMax;

  if (previousOneRepMax === 0) return null;

  // Calculate improvement percentage
  const improvement =
    ((currentOneRepMax - previousOneRepMax) / previousOneRepMax) * 100;

  if (improvement <= 0) return null;

  // Tiered multiplier based on improvement
  let multiplier: number;
  let description: string;

  if (improvement >= 5) {
    multiplier = 1.5;
    description = 'Major PR! +50% bonus';
  } else if (improvement >= 2.5) {
    multiplier = 1.25;
    description = 'Nice progress! +25% bonus';
  } else if (improvement > 0) {
    multiplier = 1.1;
    description = 'Improvement! +10% bonus';
  } else {
    return null;
  }

  return {
    type: 'progressive_overload',
    multiplier,
    description,
  };
}

/**
 * Calculate workout streak bonus
 * Rewards consistent training
 */
export function calculateStreakBonus(currentStreak: number): PointBonus | null {
  if (currentStreak < 2) return null;

  // Streak tiers (applied to entire workout)
  // 2-6 workouts: 1.1x
  // 7-13 workouts: 1.2x
  // 14-20 workouts: 1.3x
  // 21-27 workouts: 1.4x
  // 28+ workouts: 1.5x (cap)

  let multiplier: number;

  if (currentStreak >= 28) {
    multiplier = 1.5;
  } else if (currentStreak >= 21) {
    multiplier = 1.4;
  } else if (currentStreak >= 14) {
    multiplier = 1.3;
  } else if (currentStreak >= 7) {
    multiplier = 1.2;
  } else {
    multiplier = 1.1;
  }

  return {
    type: 'workout_streak',
    multiplier,
    description: `${currentStreak} workout streak! x${multiplier}`,
  };
}

/**
 * Calculate total points for a completed set
 */
export function calculateSetPoints(
  input: SetPointsInput,
  userContext: UserPointsContext
): PointsResult {
  const basePoints = calculateBasePoints(input);
  const bonuses: PointBonus[] = [];

  // Check for progressive overload bonus
  const overloadBonus = calculateOverloadBonus(input);
  if (overloadBonus) bonuses.push(overloadBonus);

  // Check for streak bonus
  const streakBonus = calculateStreakBonus(userContext.currentStreak);
  if (streakBonus) bonuses.push(streakBonus);

  // Combine multipliers (multiplicative, not additive)
  const combinedMultiplier = bonuses.reduce(
    (acc, bonus) => acc * bonus.multiplier,
    1.0
  );

  const finalPoints = Math.floor(basePoints * combinedMultiplier);

  return {
    basePoints,
    multiplier: combinedMultiplier,
    finalPoints,
    bonuses,
  };
}

/**
 * Calculate bonus points for completing a workout
 */
export function calculateWorkoutCompletionBonus(
  input: WorkoutCompletionInput
): number {
  let bonus = 0;

  // Base completion bonus
  bonus += 50;

  // Duration bonus (prevent gaming with super short workouts)
  if (input.durationMinutes >= 30) {
    bonus += 25;
  }
  if (input.durationMinutes >= 60) {
    bonus += 25;
  }

  // Set count bonus (encourage volume)
  if (input.totalSets >= 10) {
    bonus += 25;
  }
  if (input.totalSets >= 20) {
    bonus += 25;
  }

  return bonus;
}

/**
 * Determine if a workout should extend the streak
 * A streak is maintained if the user works out at least every 3 days
 */
export function shouldExtendStreak(lastWorkoutAt: Date | null): boolean {
  if (!lastWorkoutAt) return true; // First workout starts a streak

  const now = new Date();
  const daysSinceLastWorkout = Math.floor(
    (now.getTime() - lastWorkoutAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Streak continues if workout within 3 days
  return daysSinceLastWorkout <= 3;
}

/**
 * Calculate the new streak value
 */
export function calculateNewStreak(
  currentStreak: number,
  lastWorkoutAt: Date | null
): number {
  if (shouldExtendStreak(lastWorkoutAt)) {
    return currentStreak + 1;
  }
  return 1; // Reset to 1 (this workout starts a new streak)
}

export * from './types';
