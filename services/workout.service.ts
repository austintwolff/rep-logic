import { supabase } from '@/lib/supabase';
import { WorkoutSet, WorkoutExercise } from '@/stores/workout.store';
import { Database } from '@/types/database';

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
  } = params;

  try {
    // 1. Create the workout session
    const sessionInsert: WorkoutSessionInsert = {
      id: workoutId,
      user_id: userId,
      name,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_seconds: durationSeconds,
      total_volume_kg: totalVolume,
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
        weight_kg: set.weight,
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
        pointTransactions.push({
          user_id: userId,
          workout_session_id: sessionId,
          transaction_type: 'set_completed',
          base_points: set.pointsEarned,
          multiplier: 1.0,
          final_points: set.pointsEarned,
          description: `${exercise.exercise.name}: ${set.weight ? `${set.weight}kg × ` : ''}${set.reps} reps`,
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
        total_volume_kg: (currentStats.total_volume_kg || 0) + totalVolume,
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
