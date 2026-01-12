import { supabase } from '@/lib/supabase';
import {
  ExerciseBaseline,
  MuscleLevel,
  WeeklyMuscleStats,
  BaselineSessionEntry,
} from '@/types/database';
import {
  calculateOneRepMax,
  updateRollingAverage,
  getWeekStart,
  formatDateAsISO,
  calculateLevelFromXp,
  POINTS_CONFIG,
  ExerciseBaselineData,
} from '@/lib/points-engine';

// Type assertion helper for new tables not yet in generated types
const db = supabase as any;

// ============================================================================
// EXERCISE BASELINES
// ============================================================================

/**
 * Get or create exercise baseline for a user
 */
export async function getOrCreateBaseline(
  userId: string,
  exerciseId: string
): Promise<ExerciseBaseline | null> {
  // Try to get existing
  const { data: existing } = await db
    .from('exercise_baselines')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .single();

  if (existing) return existing;

  // Create new baseline
  const { data: created, error } = await db
    .from('exercise_baselines')
    .insert({
      user_id: userId,
      exercise_id: exerciseId,
      rolling_avg_e1rm: 0,
      session_history: [],
      workout_count: 0,
      is_baselined: false,
      best_e1rm: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating baseline:', error);
    return null;
  }

  return created;
}

/**
 * Get all baselines for a user
 */
export async function getUserBaselines(userId: string): Promise<Map<string, ExerciseBaselineData>> {
  const { data, error } = await db
    .from('exercise_baselines')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) {
    console.error('Error fetching baselines:', error);
    return new Map();
  }

  const map = new Map<string, ExerciseBaselineData>();
  for (const baseline of data) {
    map.set(baseline.exercise_id, {
      isBaselined: baseline.is_baselined,
      workoutCount: baseline.workout_count,
      rollingAvgE1rm: baseline.rolling_avg_e1rm,
      sessionHistory: baseline.session_history as BaselineSessionEntry[],
      bestE1rm: baseline.best_e1rm,
    });
  }

  return map;
}

/**
 * Update baseline after completing sets for an exercise in a workout
 */
export async function updateBaselineAfterWorkout(
  userId: string,
  exerciseId: string,
  bestSetWeight: number,
  bestSetReps: number
): Promise<void> {
  const baseline = await getOrCreateBaseline(userId, exerciseId);
  if (!baseline) return;

  const currentE1rm = calculateOneRepMax(bestSetWeight, bestSetReps);
  const now = new Date();

  // Update session history and rolling average
  const { newHistory, newAverage } = updateRollingAverage(
    baseline.session_history as BaselineSessionEntry[],
    {
      e1rm: currentE1rm,
      date: now.toISOString(),
      weight: bestSetWeight,
      reps: bestSetReps,
    }
  );

  const newWorkoutCount = baseline.workout_count + 1;
  const isNowBaselined = newWorkoutCount >= POINTS_CONFIG.BASELINE.WORKOUTS_REQUIRED;

  // Check for new PR
  const newBestE1rm = currentE1rm > baseline.best_e1rm ? currentE1rm : baseline.best_e1rm;
  const newBestDate = currentE1rm > baseline.best_e1rm ? now.toISOString() : baseline.best_e1rm_date;

  const { error } = await db
    .from('exercise_baselines')
    .update({
      rolling_avg_e1rm: newAverage,
      session_history: newHistory,
      workout_count: newWorkoutCount,
      is_baselined: isNowBaselined,
      best_e1rm: newBestE1rm,
      best_e1rm_date: newBestDate,
      updated_at: now.toISOString(),
    })
    .eq('id', baseline.id);

  if (error) {
    console.error('Error updating baseline:', error);
  }
}

// ============================================================================
// MUSCLE LEVELS
// ============================================================================

/**
 * Get or create muscle level for a user
 */
export async function getOrCreateMuscleLevel(
  userId: string,
  muscleGroup: string
): Promise<MuscleLevel | null> {
  const { data: existing } = await db
    .from('muscle_levels')
    .select('*')
    .eq('user_id', userId)
    .eq('muscle_group', muscleGroup)
    .single();

  if (existing) return existing;

  const { data: created, error } = await db
    .from('muscle_levels')
    .insert({
      user_id: userId,
      muscle_group: muscleGroup,
      current_level: 0,
      current_xp: 0,
      total_xp_earned: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating muscle level:', error);
    return null;
  }

  return created;
}

/**
 * Get all muscle levels for a user
 */
export async function getUserMuscleLevels(userId: string): Promise<MuscleLevel[]> {
  const { data, error } = await db
    .from('muscle_levels')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching muscle levels:', error);
    return [];
  }

  return data || [];
}

/**
 * Add XP to a muscle group
 */
export async function addMuscleXp(
  userId: string,
  muscleGroup: string,
  xpAmount: number
): Promise<{ newLevel: number; leveledUp: boolean }> {
  const muscleLevel = await getOrCreateMuscleLevel(userId, muscleGroup);
  if (!muscleLevel) {
    return { newLevel: 0, leveledUp: false };
  }

  const newTotalXp = muscleLevel.total_xp_earned + xpAmount;
  const { level: newLevel, currentXp } = calculateLevelFromXp(newTotalXp);
  const leveledUp = newLevel > muscleLevel.current_level;

  const { error } = await db
    .from('muscle_levels')
    .update({
      current_level: newLevel,
      current_xp: currentXp,
      total_xp_earned: newTotalXp,
      last_trained_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', muscleLevel.id);

  if (error) {
    console.error('Error updating muscle XP:', error);
  }

  return { newLevel, leveledUp };
}

// ============================================================================
// WEEKLY MUSCLE STATS
// ============================================================================

/**
 * Get or create weekly stats for a muscle group
 */
export async function getOrCreateWeeklyStats(
  userId: string,
  muscleGroup: string,
  weekStart?: Date
): Promise<WeeklyMuscleStats | null> {
  const week = formatDateAsISO(weekStart || getWeekStart());

  const { data: existing } = await db
    .from('weekly_muscle_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('muscle_group', muscleGroup)
    .eq('week_start', week)
    .single();

  if (existing) return existing;

  const { data: created, error } = await db
    .from('weekly_muscle_stats')
    .insert({
      user_id: userId,
      muscle_group: muscleGroup,
      week_start: week,
      workout_count: 0,
      total_sets: 0,
      total_points: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating weekly stats:', error);
    return null;
  }

  return created;
}

/**
 * Update weekly stats after a workout
 */
export async function updateWeeklyStats(
  userId: string,
  muscleGroup: string,
  setsAdded: number,
  pointsAdded: number,
  isNewWorkout: boolean
): Promise<void> {
  const stats = await getOrCreateWeeklyStats(userId, muscleGroup);
  if (!stats) return;

  const { error } = await db
    .from('weekly_muscle_stats')
    .update({
      workout_count: isNewWorkout ? stats.workout_count + 1 : stats.workout_count,
      total_sets: stats.total_sets + setsAdded,
      total_points: stats.total_points + pointsAdded,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stats.id);

  if (error) {
    console.error('Error updating weekly stats:', error);
  }
}

/**
 * Get weekly stats for all muscles for current week
 */
export async function getCurrentWeekStats(userId: string): Promise<WeeklyMuscleStats[]> {
  const weekStart = formatDateAsISO(getWeekStart());

  const { data, error } = await db
    .from('weekly_muscle_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart);

  if (error) {
    console.error('Error fetching weekly stats:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// COMPOUND EXERCISE MUSCLE MAPPING
// ============================================================================

/**
 * Get all muscle groups an exercise works
 */
export async function getExerciseMuscles(exerciseName: string): Promise<string[]> {
  const { data, error } = await db
    .from('exercise_muscle_map')
    .select('muscle_group')
    .eq('exercise_name', exerciseName);

  if (error || !data || data.length === 0) {
    // If not found in map, return empty (caller should use primary muscle)
    return [];
  }

  return data.map((row: any) => row.muscle_group);
}

/**
 * Get muscle groups for multiple exercises at once
 */
export async function getExerciseMusclesBatch(
  exerciseNames: string[]
): Promise<Map<string, string[]>> {
  const { data, error } = await db
    .from('exercise_muscle_map')
    .select('exercise_name, muscle_group')
    .in('exercise_name', exerciseNames);

  const map = new Map<string, string[]>();

  if (error || !data) {
    return map;
  }

  for (const row of data) {
    const existing = map.get(row.exercise_name) || [];
    existing.push(row.muscle_group);
    map.set(row.exercise_name, existing);
  }

  return map;
}

// ============================================================================
// BASELINE STATUS
// ============================================================================

/**
 * Get baseline status for dashboard display
 */
export async function getBaselineStatus(userId: string): Promise<{
  total: number;
  completed: number;
  inProgress: number;
}> {
  const { data: baselines } = await db
    .from('exercise_baselines')
    .select('exercise_id, is_baselined, workout_count')
    .eq('user_id', userId);

  if (!baselines || baselines.length === 0) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
    };
  }

  const completed = baselines.filter((b: any) => b.is_baselined).length;
  const inProgress = baselines.filter((b: any) => !b.is_baselined).length;

  return {
    total: baselines.length,
    completed,
    inProgress,
  };
}
