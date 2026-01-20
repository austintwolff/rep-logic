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
import { useWorkoutStore } from '@/stores/workout.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore, kgToLbs } from '@/stores/settings.store';
import { getBestSetFromRecentWorkouts, BestSetResult } from '@/services/workout.service';
import SetLogger from '@/components/workout/SetLogger';
import RestTimer from '@/components/workout/RestTimer';
import PointsAnimation from '@/components/workout/PointsAnimation';
import { PointsResult } from '@/lib/points-engine/types';

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ index: string }>();
  const exerciseIndex = parseInt(params.index || '0', 10);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { user, profile, userStats } = useAuthStore();
  const { weightUnit } = useSettingsStore();
  const {
    activeWorkout,
    isRestTimerActive,
    restTimeRemaining,
    setCurrentExercise,
    logSet,
    removeExercise,
    startRestTimer,
    stopRestTimer,
    tickRestTimer,
  } = useWorkoutStore();

  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [lastPointsResult, setLastPointsResult] = useState<PointsResult | null>(null);
  const [lastSetInfo, setLastSetInfo] = useState<{ weight: number | null; reps: number; isBodyweight: boolean; weightUnit: 'kg' | 'lbs' }>({ weight: null, reps: 0, isBodyweight: false, weightUnit: 'kg' });
  const [historicalBestSet, setHistoricalBestSet] = useState<BestSetResult | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set current exercise on mount
  useEffect(() => {
    setCurrentExercise(exerciseIndex);
  }, [exerciseIndex]);

  // Fetch historical best set when exercise changes
  useEffect(() => {
    const fetchHistoricalData = async () => {
      const currentEx = activeWorkout?.exercises[exerciseIndex];
      if (!currentEx || !user?.id) {
        setHistoricalBestSet(null);
        return;
      }

      const bestSet = await getBestSetFromRecentWorkouts(user.id, currentEx.exercise.id, 3);
      setHistoricalBestSet(bestSet);
    };

    fetchHistoricalData();
  }, [exerciseIndex, user?.id]);

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

  const currentExercise = activeWorkout?.exercises[exerciseIndex];

  const handleBack = () => {
    router.back();
  };

  const handleRemoveExercise = () => {
    if (!currentExercise) return;

    showAlert(
      'Remove Exercise',
      `Remove ${currentExercise.exercise.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeExercise(currentExercise.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleLogSet = (weight: number | null, reps: number) => {
    const isBodyweight = currentExercise?.exercise.exercise_type === 'bodyweight';

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
      startRestTimer(newTime);
    }
  };

  if (!activeWorkout || !currentExercise) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backIcon, { color: isDark ? '#F9FAFB' : '#111827' }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Exercise
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Exercise not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate points for this exercise
  const exercisePoints = currentExercise.sets.reduce((sum, set) => sum + set.pointsEarned, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: isDark ? '#F9FAFB' : '#111827' }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: isDark ? '#F9FAFB' : '#111827' }]} numberOfLines={1}>
            {currentExercise.exercise.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {currentExercise.exercise.muscle_group}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRemoveExercise} style={styles.deleteButton}>
          <Text style={styles.deleteIcon}>🗑</Text>
        </TouchableOpacity>
      </View>

      {/* Rest Timer */}
      <RestTimer
        timeRemaining={restTimeRemaining}
        isActive={isRestTimerActive}
        onStop={stopRestTimer}
        onAdjust={handleAdjustRestTime}
        isDark={isDark}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Exercise Stats */}
        <View style={[styles.statsCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {currentExercise.sets.length}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>sets</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {exercisePoints}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>pts</Text>
          </View>
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
          historicalWeight={
            historicalBestSet
              ? weightUnit === 'lbs'
                ? kgToLbs(historicalBestSet.weight)
                : historicalBestSet.weight
              : undefined
          }
          historicalReps={historicalBestSet?.reps}
          onLogSet={handleLogSet}
          onStartRest={startRestTimer}
          isDark={isDark}
        />
      </ScrollView>

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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  backButton: {
    padding: 8,
    width: 44,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '300',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    width: 44,
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 18,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 14,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  completedSets: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  completedTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
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
    fontVariant: ['tabular-nums'],
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
