import { supabase } from '@/lib/supabase';
import { WorkoutSet, WorkoutExercise } from '@/stores/workout.store';
import { Database } from '@/types/database';
import { WeightUnit, lbsToKg } from '@/stores/settings.store';
import { GoalBucket, POINTS_CONFIG } from '@/lib/points-engine';
import { updateGoalBucketPR, awardBatchMuscleXp, getRolling7DayMuscleSets } from './baseline.service';
import { calculateCharmBonuses, ExerciseCharmContext, CharmBonusesResult } from '@/lib/scoring/charm-effects';
import { calculateRuneBonuses, WorkoutRuneContext, RuneBonusesResult } from '@/lib/scoring/rune-effects';

type WorkoutSessionInsert = Database['public']['Tables']['workout_sessions']['Insert'];
type WorkoutSetInsert = Database['public']['Tables']['workout_sets']['Insert'];
type PointTransactionInsert = Database['public']['Tables']['point_transactions']['Insert'];
type UserStatsRow = Database['public']['Tables']['user_stats']['Row'];
type UserStatsUpdate = Database['public']['Tables']['user_stats']['Update'];

interface SaveWorkoutParams {
  userId: string;
  workoutId: string;
  name: string;
  goal: GoalBucket;
  startedAt: Date;
  completedAt: Date;
  durationSeconds: number;
  exercises: WorkoutExercise[];
  totalVolume: number;
  totalPoints: number;
  completionBonus: number;
  weightUnit: WeightUnit; // To convert display units to kg for storage
  selectedRuneId?: string | null; // Optional rune selected for this workout
}

interface SaveWorkoutResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  charmRuneBonuses?: CharmRuneBonusResult;
}

export async function saveWorkoutToDatabase(
  params: SaveWorkoutParams
): Promise<SaveWorkoutResult> {
  const {
    userId,
    workoutId,
    name,
    goal,
    startedAt,
    completedAt,
    durationSeconds,
    exercises,
    totalVolume,
    totalPoints,
    completionBonus,
    weightUnit,
    selectedRuneId,
  } = params;

  // Helper to convert weight to kg for database storage
  const toKg = (weight: number | null): number | null => {
    if (weight === null) return null;
    return weightUnit === 'lbs' ? lbsToKg(weight) : weight;
  };

  try {
    // 0. Calculate charm and rune bonuses
    const charmRuneBonuses = await calculateCharmAndRuneBonuses({
      userId,
      goal,
      exercises,
      baseWorkoutPoints: totalPoints,
      selectedRuneId,
    });

    // Total points including charm and rune bonuses
    const finalTotalPoints = totalPoints + charmRuneBonuses.totalBonusPoints;

    // 1. Create the workout session
    // Convert total volume to kg for storage
    const volumeInKg = weightUnit === 'lbs' ? lbsToKg(totalVolume) : totalVolume;

    const sessionInsert: WorkoutSessionInsert = {
      id: workoutId,
      user_id: userId,
      name,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_seconds: durationSeconds,
      total_volume_kg: volumeInKg,
      total_points: finalTotalPoints,
    };

    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert(sessionInsert as any)
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating workout session:', sessionError);
      return { success: false, error: sessionError.message };
    }

    // 2. Create all workout sets (skip local exercises that don't have valid UUIDs)
    const sessionId = (session as any).id;
    const allSets: WorkoutSetInsert[] = exercises
      .filter((exercise) => !exercise.exercise.id.startsWith('local-')) // Skip local exercises
      .flatMap((exercise) =>
        exercise.sets.map((set) => ({
          workout_session_id: sessionId,
          exercise_id: exercise.exercise.id,
          set_number: set.setNumber,
          set_type: set.setType,
          weight_kg: toKg(set.weight), // Convert display units to kg for storage
          reps: set.reps,
          is_bodyweight: set.isBodyweight,
          points_earned: set.pointsEarned,
          is_pr: set.isPR,
          completed_at: set.completedAt.toISOString(),
        }))
      );

    if (allSets.length > 0) {
      const { error: setsError } = await supabase
        .from('workout_sets')
        .insert(allSets as any);

      if (setsError) {
        console.error('Error creating workout sets:', setsError);
        // Don't fail the whole operation, the session is saved
      }
    }

    // 2b. Update goal-bucket PRs for any sets that achieved a PR (batched)
    const prUpdatePromises: Promise<void>[] = [];
    for (const exercise of exercises) {
      if (exercise.exercise.id.startsWith('local-')) continue; // Skip local exercises

      for (const set of exercise.sets) {
        if (set.isPR && set.weight !== null) {
          // Convert weight to kg for baseline storage
          const weightKg = toKg(set.weight) || 0;
          // For bodyweight exercises, use effective weight
          const effectiveWeight = set.isBodyweight
            ? weightKg * POINTS_CONFIG.BODYWEIGHT_FACTOR
            : weightKg;

          prUpdatePromises.push(
            updateGoalBucketPR(userId, exercise.exercise.id, effectiveWeight, set.reps, goal)
          );
        }
      }
    }
    // Run all PR updates in parallel (use allSettled to not fail on partial errors)
    if (prUpdatePromises.length > 0) {
      const results = await Promise.allSettled(prUpdatePromises);
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error(`[Workout] ${failures.length} PR updates failed`);
      }
    }

    // 2c. Award muscle XP for all sets (batched for efficiency)
    // Get rolling 7-day counts once
    const rolling7DayCounts = await getRolling7DayMuscleSets(userId);

    // Collect all sets for batch processing
    const setsForXp = exercises.flatMap(exercise =>
      exercise.sets.map(set => ({
        exerciseName: exercise.exercise.name,
        primaryMuscle: exercise.exercise.muscle_group,
        isPR: set.isPR,
      }))
    );

    // Award XP in a single batched operation
    if (setsForXp.length > 0) {
      await awardBatchMuscleXp(userId, setsForXp, rolling7DayCounts);
    }

    // 3. Create point transactions
    const pointTransactions: PointTransactionInsert[] = [];

    // Add set point transactions
    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        // For description, show the weight in user's preferred unit
        const weightDisplay = set.weight ? `${set.weight}${weightUnit} × ` : '';
        pointTransactions.push({
          user_id: userId,
          workout_session_id: sessionId,
          transaction_type: 'set_completed',
          base_points: set.pointsEarned,
          multiplier: 1.0,
          final_points: set.pointsEarned,
          description: `${exercise.exercise.name}: ${weightDisplay}${set.reps} reps`,
        });
      }
    }

    // Add completion bonus transaction
    if (completionBonus > 0) {
      pointTransactions.push({
        user_id: userId,
        workout_session_id: sessionId,
        transaction_type: 'workout_completed',
        base_points: completionBonus,
        multiplier: 1.0,
        final_points: completionBonus,
        description: `Workout completion bonus`,
      });
    }

    // Add charm bonus transactions
    for (const charmBonus of charmRuneBonuses.charmBonuses) {
      if (charmBonus.result.finalBonusPoints > 0) {
        const triggeredCharms = charmBonus.result.bonuses
          .filter((b) => b.triggered)
          .map((b) => b.charmName)
          .join(', ');

        pointTransactions.push({
          user_id: userId,
          workout_session_id: sessionId,
          transaction_type: 'charm_bonus',
          base_points: charmBonus.result.finalBonusPoints,
          multiplier: 1.0,
          final_points: charmBonus.result.finalBonusPoints,
          description: `Charm bonus on ${charmBonus.exerciseName}: ${triggeredCharms}`,
        });
      }
    }

    // Add rune bonus transaction
    if (charmRuneBonuses.totalRunePoints > 0) {
      const triggeredRunes = charmRuneBonuses.runeBonuses.bonuses
        .filter((b) => b.triggered)
        .map((b) => b.runeName)
        .join(', ');

      pointTransactions.push({
        user_id: userId,
        workout_session_id: sessionId,
        transaction_type: 'rune_bonus',
        base_points: charmRuneBonuses.totalRunePoints,
        multiplier: 1.0,
        final_points: charmRuneBonuses.totalRunePoints,
        description: `Rune bonus: ${triggeredRunes}`,
      });
    }

    if (pointTransactions.length > 0) {
      const { error: transactionsError } = await supabase
        .from('point_transactions')
        .insert(pointTransactions as any);

      if (transactionsError) {
        console.error('Error creating point transactions:', transactionsError);
      }
    }

    // 4. Update user stats
    const { data: currentStatsData, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!statsError && currentStatsData) {
      const currentStats = currentStatsData as UserStatsRow;

      // Calculate new streak
      const lastWorkoutAt = currentStats.last_workout_at
        ? new Date(currentStats.last_workout_at)
        : null;
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let newStreak = currentStats.current_workout_streak || 0;

      if (lastWorkoutAt) {
        const lastWorkoutDate = lastWorkoutAt.toDateString();
        const todayDate = today.toDateString();
        const yesterdayDate = yesterday.toDateString();

        if (lastWorkoutDate === todayDate) {
          // Already worked out today, keep streak
        } else if (lastWorkoutDate === yesterdayDate) {
          // Worked out yesterday, increment streak
          newStreak += 1;
        } else {
          // Streak broken, start fresh
          newStreak = 1;
        }
      } else {
        // First workout ever
        newStreak = 1;
      }

      const statsUpdate: UserStatsUpdate = {
        total_points: (currentStats.total_points || 0) + finalTotalPoints,
        weekly_points: (currentStats.weekly_points || 0) + finalTotalPoints,
        total_workouts: (currentStats.total_workouts || 0) + 1,
        total_volume_kg: (currentStats.total_volume_kg || 0) + volumeInKg, // Use converted volume
        current_workout_streak: newStreak,
        longest_workout_streak: Math.max(
          currentStats.longest_workout_streak || 0,
          newStreak
        ),
        last_workout_at: completedAt.toISOString(),
      };

      const { error: updateError } = await (supabase
        .from('user_stats') as any)
        .update(statsUpdate)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user stats:', updateError);
      }
    }

    return { success: true, sessionId, charmRuneBonuses };
  } catch (error) {
    console.error('Error saving workout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getWorkoutHistory(
  userId: string,
  limit: number = 20
): Promise<any[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(`
      *,
      workout_sets (
        *,
        exercise:exercises (name, muscle_group)
      )
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching workout history:', error);
    return [];
  }

  return data || [];
}

export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  limit: number = 10
): Promise<any[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select(`
      *,
      workout_session:workout_sessions!inner (user_id)
    `)
    .eq('exercise_id', exerciseId)
    .eq('workout_session.user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching exercise history:', error);
    return [];
  }

  return data || [];
}

export async function getPreviousBest(
  userId: string,
  exerciseId: string
): Promise<{ weight: number; reps: number; oneRepMax: number } | null> {
  const history = await getExerciseHistory(userId, exerciseId, 50);

  if (history.length === 0) return null;

  // Find the best set by estimated one-rep max (Epley formula)
  let bestSet = null;
  let bestOneRepMax = 0;

  for (const set of history) {
    const weight = set.weight_kg || 0;
    const reps = set.reps || 0;

    if (weight > 0 && reps > 0) {
      // Epley formula: 1RM = weight × (1 + reps/30)
      const oneRepMax = weight * (1 + reps / 30);

      if (oneRepMax > bestOneRepMax) {
        bestOneRepMax = oneRepMax;
        bestSet = { weight, reps, oneRepMax };
      }
    }
  }

  return bestSet;
}

export async function getWorkoutDetail(workoutId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(`
      *,
      workout_sets (
        *,
        exercise:exercises (id, name, muscle_group, exercise_type)
      )
    `)
    .eq('id', workoutId)
    .single();

  if (error) {
    console.error('Error fetching workout detail:', error);
    return null;
  }

  return data;
}

export async function fetchExercisesFromDatabase(): Promise<any[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_public', true)
    .order('name');

  if (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }

  return data || [];
}

export interface BestSetResult {
  weight: number;  // In kg (database stores kg)
  reps: number;
}

/**
 * Get the best set from the last N workouts for a specific exercise.
 * "Best" = heaviest weight from a set with at least 4 reps.
 */
export async function getBestSetFromRecentWorkouts(
  userId: string,
  exerciseId: string,
  workoutLimit: number = 3
): Promise<BestSetResult | null> {
  try {
    // Get the last N workout session IDs for this user
    const { data: recentSessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(workoutLimit);

    if (sessionsError || !recentSessions || recentSessions.length === 0) {
      return null;
    }

    const sessionIds = recentSessions.map(s => s.id);

    // Get all sets for this exercise from those sessions with at least 4 reps
    const { data: sets, error: setsError } = await supabase
      .from('workout_sets')
      .select('weight_kg, reps')
      .eq('exercise_id', exerciseId)
      .in('workout_session_id', sessionIds)
      .gte('reps', 4)
      .not('weight_kg', 'is', null)
      .order('weight_kg', { ascending: false })
      .limit(1);

    if (setsError || !sets || sets.length === 0) {
      return null;
    }

    const bestSet = sets[0];
    return {
      weight: bestSet.weight_kg || 0,
      reps: bestSet.reps || 0,
    };
  } catch (error) {
    console.error('Error fetching best set from recent workouts:', error);
    return null;
  }
}

export async function deleteWorkout(workoutId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First get the workout to verify ownership and get stats to subtract
    const { data: workout, error: fetchError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', workoutId)
      .eq('user_id', userId)
      .single() as { data: any; error: any };

    if (fetchError || !workout) {
      return { success: false, error: 'Workout not found' };
    }

    // Delete point transactions for this workout
    await supabase
      .from('point_transactions')
      .delete()
      .eq('workout_session_id', workoutId);

    // Delete workout sets
    await supabase
      .from('workout_sets')
      .delete()
      .eq('workout_session_id', workoutId);

    // Delete the workout session
    const { error: deleteError } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', workoutId);

    if (deleteError) {
      console.error('Error deleting workout:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Update user stats to subtract the deleted workout's contributions
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single() as { data: any };

    if (currentStats) {
      // Check if the workout was completed within the current week
      const workoutCompletedAt = new Date(workout.completed_at);
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setHours(0, 0, 0, 0);
      // Set to Sunday of current week (adjust based on locale if needed)
      startOfWeek.setDate(now.getDate() - now.getDay());

      const workoutInCurrentWeek = workoutCompletedAt >= startOfWeek;

      const statsUpdate: UserStatsUpdate = {
        total_points: Math.max(0, (currentStats.total_points || 0) - (workout.total_points || 0)),
        total_workouts: Math.max(0, (currentStats.total_workouts || 0) - 1),
        total_volume_kg: Math.max(0, (currentStats.total_volume_kg || 0) - (workout.total_volume_kg || 0)),
        // Only subtract from weekly_points if the workout was in the current week
        ...(workoutInCurrentWeek && {
          weekly_points: Math.max(0, (currentStats.weekly_points || 0) - (workout.total_points || 0)),
        }),
      };

      await (supabase.from('user_stats') as any)
        .update(statsUpdate)
        .eq('user_id', userId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting workout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  totalWorkouts: number;
  bestWorkoutPoints: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    // Get all profiles with their stats
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username');

    if (profilesError || !profiles) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    // Get all user stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id, total_points, total_workouts');

    if (statsError) {
      console.error('Error fetching user stats:', statsError);
    }

    // Get best workout points for each user
    const { data: bestWorkouts, error: bestWorkoutsError } = await supabase
      .from('workout_sessions')
      .select('user_id, total_points');

    if (bestWorkoutsError) {
      console.error('Error fetching best workouts:', bestWorkoutsError);
    }

    // Calculate best workout per user
    const bestByUser = new Map<string, number>();
    if (bestWorkouts) {
      for (const workout of bestWorkouts) {
        const current = bestByUser.get(workout.user_id) || 0;
        if (workout.total_points > current) {
          bestByUser.set(workout.user_id, workout.total_points);
        }
      }
    }

    // Build stats map
    const statsMap = new Map<string, { totalPoints: number; totalWorkouts: number }>();
    if (stats) {
      for (const stat of stats) {
        statsMap.set(stat.user_id, {
          totalPoints: stat.total_points || 0,
          totalWorkouts: stat.total_workouts || 0,
        });
      }
    }

    // Combine data
    const leaderboard: LeaderboardEntry[] = profiles.map((profile) => {
      const userStats = statsMap.get(profile.id);
      return {
        userId: profile.id,
        username: profile.username,
        totalPoints: userStats?.totalPoints || 0,
        totalWorkouts: userStats?.totalWorkouts || 0,
        bestWorkoutPoints: bestByUser.get(profile.id) || 0,
      };
    });

    // Sort by total points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    return leaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

// ============================================================================
// CHARMS & RUNES
// ============================================================================

/**
 * Get the equipped charm IDs for a user
 */
export async function getEquippedCharms(userId: string): Promise<string[]> {
  const { data, error } = await (supabase
    .from('user_charms') as any)
    .select('charm_id')
    .eq('user_id', userId)
    .eq('equipped', true);

  if (error) {
    console.error('Error fetching equipped charms');
    return [];
  }

  return data?.map((row: { charm_id: string }) => row.charm_id) || [];
}

/**
 * Get the equipped rune IDs for a user
 */
export async function getEquippedRunes(userId: string): Promise<string[]> {
  const { data, error } = await (supabase
    .from('user_runes') as any)
    .select('rune_id')
    .eq('user_id', userId)
    .eq('equipped', true);

  if (error) {
    console.error('Error fetching equipped runes');
    return [];
  }

  return data?.map((row: { rune_id: string }) => row.rune_id) || [];
}

/**
 * Get the number of workouts completed this week (Mon-Sun)
 */
export async function getWorkoutsThisWeek(userId: string): Promise<number> {
  // Calculate the start of the current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('workout_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('completed_at', monday.toISOString());

  if (error) {
    console.error('Error fetching workouts this week:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Award a charm to a user (handles duplicates gracefully)
 */
export async function awardCharm(userId: string, charmId: string): Promise<boolean> {
  const { error } = await (supabase
    .from('user_charms') as any)
    .upsert(
      { user_id: userId, charm_id: charmId },
      { onConflict: 'user_id,charm_id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('Error awarding charm');
    return false;
  }

  return true;
}

/**
 * Award a rune to a user (handles duplicates gracefully)
 */
export async function awardRune(userId: string, runeId: string): Promise<boolean> {
  const { error } = await (supabase
    .from('user_runes') as any)
    .upsert(
      { user_id: userId, rune_id: runeId },
      { onConflict: 'user_id,rune_id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('Error awarding rune');
    return false;
  }

  return true;
}

/**
 * Equip or unequip a charm for a user
 */
export async function setCharmEquipped(userId: string, charmId: string, equipped: boolean): Promise<boolean> {
  const { error } = await (supabase
    .from('user_charms') as any)
    .update({ equipped })
    .eq('user_id', userId)
    .eq('charm_id', charmId);

  if (error) {
    console.error('Error updating charm equipped state');
    return false;
  }

  return true;
}

/**
 * Equip or unequip a rune for a user
 */
export async function setRuneEquipped(userId: string, runeId: string, equipped: boolean): Promise<boolean> {
  const { error } = await (supabase
    .from('user_runes') as any)
    .update({ equipped })
    .eq('user_id', userId)
    .eq('rune_id', runeId);

  if (error) {
    console.error('Error updating rune equipped state');
    return false;
  }

  return true;
}

/**
 * Get all charms owned by a user
 * TODO: Enable when user_charms table is created in Supabase
 */
export async function getUserCharms(_userId: string): Promise<{ charmId: string; equipped: boolean; acquiredAt: string }[]> {
  // For now, return starter charms for testing
  return [
    { charmId: 'iron_will', equipped: true, acquiredAt: new Date().toISOString() },
    { charmId: 'first_rep', equipped: true, acquiredAt: new Date().toISOString() },
    { charmId: 'compound_king', equipped: false, acquiredAt: new Date().toISOString() },
  ];
}

/**
 * Get all runes owned by a user
 * TODO: Enable when user_runes table is created in Supabase
 */
export async function getUserRunes(_userId: string): Promise<{ runeId: string; equipped: boolean; acquiredAt: string }[]> {
  // For now, return starter runes for testing
  return [
    { runeId: 'endurance', equipped: true, acquiredAt: new Date().toISOString() },
    { runeId: 'pr_hunter', equipped: false, acquiredAt: new Date().toISOString() },
  ];
}

// ============================================================================
// CHARM & RUNE BONUS CALCULATION
// ============================================================================

export interface CharmRuneBonusParams {
  userId: string;
  goal: GoalBucket;
  exercises: WorkoutExercise[];
  baseWorkoutPoints: number;
  selectedRuneId?: string | null; // Optional rune selected for this specific workout
}

export interface CharmRuneBonusResult {
  charmBonuses: {
    exerciseId: string;
    exerciseName: string;
    result: CharmBonusesResult;
  }[];
  runeBonuses: RuneBonusesResult;
  totalCharmPoints: number;
  totalRunePoints: number;
  totalBonusPoints: number;
}

/**
 * Calculate all charm and rune bonuses for a completed workout
 */
export async function calculateCharmAndRuneBonuses(
  params: CharmRuneBonusParams
): Promise<CharmRuneBonusResult> {
  const { userId, goal, exercises, baseWorkoutPoints, selectedRuneId } = params;

  // Fetch equipped charms and runes in parallel
  const [equippedCharms, equippedRunesFromDb, workoutsThisWeek] = await Promise.all([
    getEquippedCharms(userId),
    getEquippedRunes(userId),
    getWorkoutsThisWeek(userId),
  ]);

  // Use the selected rune for this workout if provided, otherwise use equipped runes
  const equippedRunes = selectedRuneId ? [selectedRuneId] : equippedRunesFromDb;

  // Calculate charm bonuses per exercise
  const charmBonuses: CharmRuneBonusResult['charmBonuses'] = [];
  let totalCharmPoints = 0;

  for (const exercise of exercises) {
    if (exercise.sets.length === 0) continue;

    // Calculate base points for this exercise
    const exerciseBasePoints = exercise.sets.reduce((sum, set) => sum + set.pointsEarned, 0);

    // Build charm context for this exercise
    const hasPR = exercise.sets.some((set) => set.isPR);
    const muscleGroups = new Set<string>();
    exercise.sets.forEach((set) => set.muscleGroups.forEach((m) => muscleGroups.add(m)));

    const charmContext: ExerciseCharmContext = {
      sets: exercise.sets,
      workoutGoal: goal,
      isCompound: exercise.exercise.is_compound,
      muscleGroupCount: muscleGroups.size,
      hasPR,
      basePoints: exerciseBasePoints,
    };

    const result = calculateCharmBonuses(charmContext, equippedCharms);
    totalCharmPoints += result.finalBonusPoints;

    charmBonuses.push({
      exerciseId: exercise.exercise.id,
      exerciseName: exercise.exercise.name,
      result,
    });
  }

  // Calculate rune bonuses for the whole workout
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const prCount = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.isPR).length,
    0
  );

  // Count unique muscle groups across all exercises
  const allMuscleGroups = new Set<string>();
  for (const exercise of exercises) {
    exercise.sets.forEach((set) => set.muscleGroups.forEach((m) => allMuscleGroups.add(m)));
  }

  const runeContext: WorkoutRuneContext = {
    exerciseCount: exercises.length,
    totalSets,
    prCount,
    muscleGroupCount: allMuscleGroups.size,
    workoutsThisWeek: workoutsThisWeek + 1, // Including this workout
    basePoints: baseWorkoutPoints + totalCharmPoints, // Runes apply after charm bonuses
  };

  const runeBonuses = calculateRuneBonuses(runeContext, equippedRunes);
  const totalRunePoints = runeBonuses.finalBonusPoints;

  return {
    charmBonuses,
    runeBonuses,
    totalCharmPoints,
    totalRunePoints,
    totalBonusPoints: totalCharmPoints + totalRunePoints,
  };
}
