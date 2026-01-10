export interface SetPointsInput {
  exerciseId: string;
  exerciseType: 'weighted' | 'bodyweight';
  weight: number | null;
  reps: number;
  userBodyweight: number;
  previousBest: PreviousBest | null;
}

export interface PreviousBest {
  weight: number;
  reps: number;
  oneRepMax: number;
}

export interface PointBonus {
  type: 'progressive_overload' | 'workout_streak' | 'muscle_target';
  multiplier: number;
  description: string;
}

export interface PointsResult {
  basePoints: number;
  multiplier: number;
  finalPoints: number;
  bonuses: PointBonus[];
}

export interface UserPointsContext {
  currentStreak: number;
  bodyweight: number;
}

export interface WorkoutCompletionInput {
  totalSets: number;
  durationMinutes: number;
}
