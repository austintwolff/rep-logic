import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { showAlert } from '@/lib/alert';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useWorkoutStore, WorkoutExercise } from '@/stores/workout.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore } from '@/stores/settings.store';
import { saveWorkoutToDatabase } from '@/services/workout.service';
import { GoalBucket } from '@/lib/points-engine';
import ExercisePicker from '@/components/workout/ExercisePicker';

// Muscle group icons
const MUSCLE_ICONS: Record<string, string> = {
  'chest': '🫁',
  'upper back': '🔙',
  'lower back': '⬇️',
  'shoulders': '🎯',
  'biceps': '💪',
  'triceps': '💪',
  'forearms': '🤚',
  'core': '🎯',
  'quads': '🦵',
  'hamstrings': '🦵',
  'glutes': '🍑',
  'calves': '🦶',
};

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; goal?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Goal mode from setup screen (for future use)
  const goalMode = params.goal as 'Strength' | 'Hypertrophy' | 'Endurance' | undefined;

  const { user, refreshUserStats } = useAuthStore();
  const { weightUnit } = useSettingsStore();
  const {
    activeWorkout,
    startWorkout,
    endWorkout,
    cancelWorkout,
    addExercise,
  } = useWorkoutStore();

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start workout on mount
  useEffect(() => {
    if (!activeWorkout) {
      const goal: GoalBucket = goalMode || 'Hypertrophy';
      startWorkout(params.name || 'Workout', goal);
    }
  }, []);

  // Elapsed time timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (activeWorkout) {
        const elapsed = Math.floor(
          (Date.now() - new Date(activeWorkout.startedAt).getTime()) / 1000
        );
        setElapsedTime(elapsed);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeWorkout?.startedAt]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishWorkout = () => {
    showAlert(
      'Finish Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            if (!activeWorkout || !user) return;

            setIsSaving(true);
            const completedAt = new Date();
            const result = endWorkout();

            if (result) {
              // Save to database
              const saveResult = await saveWorkoutToDatabase({
                userId: user.id,
                workoutId: result.workout.id,
                name: result.workout.name,
                goal: result.workout.goal,
                startedAt: result.workout.startedAt,
                completedAt,
                durationSeconds: elapsedTime,
                exercises: result.workout.exercises,
                totalVolume: result.workout.totalVolume,
                totalPoints: result.workout.totalPoints,
                completionBonus: result.completionBonus,
                weightUnit,
              });

              if (!saveResult.success) {
                console.error('Failed to save workout:', saveResult.error);
              }

              // Refresh user stats
              await refreshUserStats();

              router.replace({
                pathname: '/workout/summary',
                params: {
                  totalPoints: result.workout.totalPoints.toString(),
                  completionBonus: result.completionBonus.toString(),
                  totalSets: result.workout.exercises
                    .reduce((sum, ex) => sum + ex.sets.length, 0)
                    .toString(),
                  duration: elapsedTime.toString(),
                  exerciseCount: result.workout.exercises.length.toString(),
                },
              });
            }
            setIsSaving(false);
          },
        },
      ]
    );
  };

  const handleCancelWorkout = () => {
    showAlert(
      'Cancel Workout',
      'Are you sure you want to cancel? All progress will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: () => {
            cancelWorkout();
            router.back();
          },
        },
      ]
    );
  };

  const handleExercisePress = (index: number) => {
    router.push(`/workout/exercise?index=${index}`);
  };

  const handleAddExercise = (exercise: Parameters<typeof addExercise>[0]) => {
    const newIndex = activeWorkout?.exercises.length || 0;
    addExercise(exercise);
    setShowExercisePicker(false);
    // Navigate to the newly added exercise
    router.push(`/workout/exercise?index=${newIndex}`);
  };

  const totalSets = activeWorkout?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) || 0;

  if (!activeWorkout) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        <Text style={{ color: isDark ? '#F9FAFB' : '#111827' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const renderExerciseCard = (exercise: WorkoutExercise, index: number) => {
    const exercisePoints = exercise.sets.reduce((sum, set) => sum + set.pointsEarned, 0);
    const muscleGroup = exercise.exercise.muscle_group?.toLowerCase() || '';
    const icon = MUSCLE_ICONS[muscleGroup] || '💪';

    return (
      <TouchableOpacity
        key={exercise.id}
        style={[styles.exerciseCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
        onPress={() => handleExercisePress(index)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseCardLeft}>
          <Text style={styles.exerciseIcon}>{icon}</Text>
          <View style={styles.exerciseInfo}>
            <Text style={[styles.exerciseName, { color: isDark ? '#F9FAFB' : '#111827' }]} numberOfLines={1}>
              {exercise.exercise.name}
            </Text>
            <Text style={[styles.exerciseMuscle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {exercise.exercise.muscle_group}
            </Text>
          </View>
        </View>
        <View style={styles.exerciseCardRight}>
          <Text style={[styles.exerciseSets, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'}
          </Text>
          {exercisePoints > 0 && (
            <Text style={styles.exercisePoints}>+{exercisePoints} pts</Text>
          )}
        </View>
        <Text style={[styles.chevron, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancelWorkout} style={styles.headerButton}>
          <Text style={styles.cancelIcon}>✕</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.workoutName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {activeWorkout.name}
          </Text>
          <Text style={[styles.timer, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {formatTime(elapsedTime)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleFinishWorkout}
          style={styles.headerButton}
          disabled={isSaving}
        >
          <Text style={[styles.checkIcon, isSaving && styles.checkIconDisabled]}>✓</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {activeWorkout.totalPoints}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>pts</Text>
        </View>
        <Text style={[styles.statDivider, { color: isDark ? '#374151' : '#D1D5DB' }]}>|</Text>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {totalSets}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>sets</Text>
        </View>
        <Text style={[styles.statDivider, { color: isDark ? '#374151' : '#D1D5DB' }]}>|</Text>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {activeWorkout.exercises.length}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>exercises</Text>
        </View>
      </View>

      {/* Exercise List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeWorkout.exercises.length > 0 ? (
          <View style={styles.exerciseList}>
            {activeWorkout.exercises.map((exercise, index) => renderExerciseCard(exercise, index))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { color: isDark ? '#374151' : '#D1D5DB' }]}>🏋️</Text>
            <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              No exercises yet
            </Text>
            <Text style={[styles.emptyDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Add your first exercise to start tracking your workout
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Exercise Button */}
      <TouchableOpacity
        style={styles.addExerciseButton}
        onPress={() => setShowExercisePicker(true)}
      >
        <Text style={styles.addIcon}>+</Text>
        <Text style={styles.addExerciseText}>Add Exercise</Text>
      </TouchableOpacity>

      {/* Exercise Picker Modal */}
      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelectExercise={handleAddExercise}
        isDark={isDark}
        workoutName={activeWorkout?.name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
    width: 44,
    alignItems: 'center',
  },
  cancelIcon: {
    fontSize: 20,
    color: '#EF4444',
    fontWeight: '300',
  },
  checkIcon: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: '700',
  },
  checkIconDisabled: {
    opacity: 0.5,
  },
  headerCenter: {
    alignItems: 'center',
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '700',
  },
  timer: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 13,
  },
  statDivider: {
    fontSize: 16,
    fontWeight: '300',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  exerciseList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  exerciseIcon: {
    fontSize: 28,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseMuscle: {
    fontSize: 13,
  },
  exerciseCardRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  exerciseSets: {
    fontSize: 14,
    fontWeight: '600',
  },
  exercisePoints: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  addExerciseButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addExerciseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
