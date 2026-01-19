import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { showAlert } from '@/lib/alert';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useWorkoutStore } from '@/stores/workout.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore } from '@/stores/settings.store';
import { saveWorkoutToDatabase } from '@/services/workout.service';
import SetLogger from '@/components/workout/SetLogger';
import RestTimer from '@/components/workout/RestTimer';
import ExercisePicker from '@/components/workout/ExercisePicker';
import PointsAnimation from '@/components/workout/PointsAnimation';
import { PointsResult } from '@/lib/points-engine/types';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { user, profile, userStats, refreshUserStats } = useAuthStore();
  const { weightUnit } = useSettingsStore();
  const {
    activeWorkout,
    currentExerciseIndex,
    isRestTimerActive,
    restTimeRemaining,
    startWorkout,
    endWorkout,
    cancelWorkout,
    addExercise,
    removeExercise,
    setCurrentExercise,
    logSet,
    startRestTimer,
    stopRestTimer,
    tickRestTimer,
  } = useWorkoutStore();

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [lastPointsResult, setLastPointsResult] = useState<PointsResult | null>(null);
  const [lastSetInfo, setLastSetInfo] = useState<{ weight: number | null; reps: number; isBodyweight: boolean; weightUnit: 'kg' | 'lbs' }>({ weight: null, reps: 0, isBodyweight: false, weightUnit: 'kg' });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start workout on mount
  useEffect(() => {
    if (!activeWorkout) {
      startWorkout(params.name || 'Workout');
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

  // Rest timer
  useEffect(() => {
    if (isRestTimerActive) {
      restTimerRef.current = setInterval(() => {
        tickRestTimer();
      }, 1000);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isRestTimerActive]);

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
                startedAt: result.workout.startedAt,
                completedAt,
                durationSeconds: elapsedTime,
                exercises: result.workout.exercises,
                totalVolume: result.workout.totalVolume,
                totalPoints: result.workout.totalPoints,
                completionBonus: result.completionBonus,
                weightUnit, // Pass unit for conversion to kg when saving
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

  const handleLogSet = (weight: number | null, reps: number) => {
    const currentEx = activeWorkout?.exercises[currentExerciseIndex];
    const isBodyweight = currentEx?.exercise.exercise_type === 'bodyweight';

    const result = logSet({
      weight,
      reps,
      userBodyweight: profile?.bodyweight_kg ?? 70,
      currentStreak: userStats?.current_workout_streak || 0,
    });

    // Trigger points animation
    if (result) {
      setLastSetInfo({ weight, reps, isBodyweight, weightUnit });
      setLastPointsResult(result);
      setShowPointsAnimation(true);
    }

    return result;
  };

  const handlePointsAnimationComplete = () => {
    setShowPointsAnimation(false);
    setLastPointsResult(null);
  };

  const handleAdjustRestTime = (seconds: number) => {
    const newTime = Math.max(0, restTimeRemaining + seconds);
    if (newTime === 0) {
      stopRestTimer();
    } else {
      // Update rest time (we need to add this to the store)
      startRestTimer(newTime);
    }
  };

  const currentExercise = activeWorkout?.exercises[currentExerciseIndex];
  const totalSets = activeWorkout?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) || 0;

  if (!activeWorkout) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        <Text style={{ color: isDark ? '#F9FAFB' : '#111827' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

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

        <TouchableOpacity onPress={handleFinishWorkout} style={styles.headerButton}>
          <Text style={styles.checkIcon}>✓</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar - Compact */}
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
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>ex</Text>
        </View>
      </View>

      {/* Rest Timer */}
      <RestTimer
        timeRemaining={restTimeRemaining}
        isActive={isRestTimerActive}
        onStop={stopRestTimer}
        onAdjust={handleAdjustRestTime}
        isDark={isDark}
      />

      {/* Exercise Tabs */}
      {activeWorkout.exercises.length > 0 && (
        <View style={styles.exerciseTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.exerciseTabs}
          >
            {activeWorkout.exercises.map((ex, index) => (
              <TouchableOpacity
                key={ex.id}
                style={[
                  styles.exerciseTab,
                  { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
                  currentExerciseIndex === index && styles.exerciseTabActive,
                ]}
                onPress={() => setCurrentExercise(index)}
              >
                <Text
                  style={[
                    styles.exerciseTabText,
                    { color: isDark ? '#9CA3AF' : '#6B7280' },
                    currentExerciseIndex === index && styles.exerciseTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {ex.exercise.name}
                </Text>
                <Text
                  style={[
                    styles.exerciseTabSets,
                    { color: isDark ? '#6B7280' : '#9CA3AF' },
                    currentExerciseIndex === index && styles.exerciseTabSetsActive,
                  ]}
                >
                  {ex.sets.length} sets
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentExercise ? (
          <>
            {/* Current Exercise Header */}
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                {currentExercise.exercise.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  showAlert(
                    'Remove Exercise',
                    `Remove ${currentExercise.exercise.name}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => removeExercise(currentExercise.id),
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.trashIcon}>🗑</Text>
              </TouchableOpacity>
            </View>

            {/* Completed Sets */}
            {currentExercise.sets.length > 0 && (
              <View style={styles.completedSets}>
                <Text style={[styles.completedTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  Completed Sets
                </Text>
                {currentExercise.sets.map((set, index) => (
                  <View
                    key={set.id}
                    style={[styles.completedSet, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
                  >
                    <Text style={[styles.setNumber, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.setDetails, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                      {set.isBodyweight
                        ? `${set.reps} reps`
                        : `${set.weight}${weightUnit} × ${set.reps}`}
                    </Text>
                    <View style={styles.setPoints}>
                      <Text style={styles.starIcon}>★</Text>
                      <Text style={styles.setPointsText}>{set.pointsEarned}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Set Logger */}
            <SetLogger
              exerciseName={currentExercise.exercise.name}
              exerciseType={currentExercise.exercise.exercise_type as 'weighted' | 'bodyweight'}
              setNumber={currentExercise.sets.length + 1}
              previousWeight={
                currentExercise.sets.length > 0
                  ? currentExercise.sets[currentExercise.sets.length - 1].weight || undefined
                  : undefined
              }
              previousReps={
                currentExercise.sets.length > 0
                  ? currentExercise.sets[currentExercise.sets.length - 1].reps
                  : undefined
              }
              onLogSet={handleLogSet}
              onStartRest={startRestTimer}
              isDark={isDark}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { color: isDark ? '#374151' : '#D1D5DB' }]}>⊕</Text>
            <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              No exercises yet
            </Text>
            <Text style={[styles.emptyDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Add an exercise to start logging your workout
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
        onSelectExercise={addExercise}
        isDark={isDark}
      />

      {/* Points Animation */}
      <PointsAnimation
        visible={showPointsAnimation}
        pointsResult={lastPointsResult}
        setInfo={lastSetInfo}
        onComplete={handlePointsAnimationComplete}
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
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    fontSize: 14,
    fontWeight: '300',
  },
  exerciseTabsContainer: {
    marginBottom: 8,
  },
  exerciseTabs: {
    paddingHorizontal: 20,
    gap: 8,
  },
  exerciseTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 100,
  },
  exerciseTabActive: {
    backgroundColor: '#10B981',
  },
  exerciseTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseTabTextActive: {
    color: '#FFFFFF',
  },
  exerciseTabSets: {
    fontSize: 12,
    marginTop: 2,
  },
  exerciseTabSetsActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: '700',
  },
  trashIcon: {
    fontSize: 20,
  },
  completedSets: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  completedSet: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  setNumber: {
    width: 24,
    fontSize: 14,
    fontWeight: '600',
  },
  setDetails: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  setPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starIcon: {
    fontSize: 12,
    color: '#10B981',
  },
  setPointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
