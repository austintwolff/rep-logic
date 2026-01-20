import { supabase } from '@/lib/supabase';
import { WorkoutSet, WorkoutExercise } from '@/stores/workout.store';
import { Database } from '@/types/database';
import { WeightUnit, lbsToKg } from '@/stores/settings.store';

type WorkoutSessionInsert = Database['public']['Tables']['workout_sessions']['Insert'];
type WorkoutSetInsert = Database['public']['Tables']['workout_sets']['Insert'];
type PointTransactionInsert = Database['public']['Tables']['point_transactions']['Insert'];
type UserStatsRow = Database['public']['Tables']['user_stats']['Row'];
type UserStatsUpdate = Database['public']['Tables']['user_stats']['Update'];

interface SaveWorkoutParams {
  userId: string;
  workoutId: string;
  name: string;
  startedAt: Date;
  completedAt: Date;
  durationSeconds: number;
  exercises: WorkoutExercise[];
  totalVolume: number;
  totalPoints: number;
  completionBonus: number;
  weightUnit: WeightUnit; // To convert display units to kg for storage
}

interface SaveWorkoutResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export async function saveWorkoutToDatabase(
  params: SaveWorkoutParams
): Promise<SaveWorkoutResult> {
  const {
    userId,
    workoutId,
    name,
    startedAt,
    completedAt,
    durationSeconds,
    exercises,
    totalVolume,
    totalPoints,
    completionBonus,
    weightUnit,
  } = params;

  // Helper to convert weight to kg for database storage
  const toKg = (weight: number | null): number | null => {
    if (weight === null) return null;
    return weightUnit === 'lbs' ? lbsToKg(weight) : weight;
  };

  try {
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
      total_points: totalPoints,
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

    // 2. Create all workout sets
    const sessionId = (session as any).id;
    const allSets: WorkoutSetInsert[] = exercises.flatMap((exercise) =>
      exercise.sets.map((set) => ({
        workout_session_id: sessionId,
        exercise_id: exercise.exercise.id,
        set_number: set.setNumber,
        set_type: set.setType,
        weight_kg: toKg(set.weight), // Convert display units to kg for storage
        reps: set.reps,
        is_bodyweight: set.isBodyweight,
        points_earned: set.pointsEarned,
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
        total_points: (currentStats.total_points || 0) + totalPoints,
        weekly_points: (currentStats.weekly_points || 0) + totalPoints,
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

    return { success: true, sessionId };
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
      const statsUpdate: UserStatsUpdate = {
        total_points: Math.max(0, (currentStats.total_points || 0) - (workout.total_points || 0)),
        total_workouts: Math.max(0, (currentStats.total_workouts || 0) - 1),
        total_volume_kg: Math.max(0, (currentStats.total_volume_kg || 0) - (workout.total_volume_kg || 0)),
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
