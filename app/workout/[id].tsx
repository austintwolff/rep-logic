import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { getWorkoutDetail, deleteWorkout } from '@/services/workout.service';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore, formatWeight, kgToLbs } from '@/stores/settings.store';
import { showAlert } from '@/lib/alert';

interface WorkoutSet {
  id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number;
  is_bodyweight: boolean;
  points_earned: number;
  exercise: {
    id: string;
    name: string;
    muscle_group: string;
    exercise_type: string;
  };
}

interface WorkoutDetail {
  id: string;
  name: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  total_volume_kg: number;
  total_points: number;
  workout_sets: WorkoutSet[];
}

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, refreshUserStats } = useAuthStore();
  const { weightUnit } = useSettingsStore();

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadWorkoutDetail();
    }
  }, [id]);

  const loadWorkoutDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await getWorkoutDetail(id);
      setWorkout(data);
    } catch (error) {
      console.error('Failed to load workout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatVolume = (volumeKg: number) => {
    const volume = weightUnit === 'lbs' ? kgToLbs(volumeKg) : volumeKg;
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k ${weightUnit}`;
    }
    return `${Math.round(volume)} ${weightUnit}`;
  };

  const handleDeleteWorkout = () => {
    showAlert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id || !user) return;
            setIsDeleting(true);
            const result = await deleteWorkout(id, user.id);
            if (result.success) {
              await refreshUserStats();
              router.back();
            } else {
              showAlert('Error', result.error || 'Failed to delete workout');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Group sets by exercise
  const groupedExercises = workout?.workout_sets?.reduce((acc, set) => {
    const exerciseId = set.exercise?.id || 'unknown';
    if (!acc[exerciseId]) {
      acc[exerciseId] = {
        exercise: set.exercise,
        sets: [],
      };
    }
    acc[exerciseId].sets.push(set);
    return acc;
  }, {} as Record<string, { exercise: WorkoutSet['exercise']; sets: WorkoutSet[] }>);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backIcon, { color: isDark ? '#F9FAFB' : '#111827' }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Workout
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Workout not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: isDark ? '#F9FAFB' : '#111827' }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Workout Details
        </Text>
        <TouchableOpacity
          onPress={handleDeleteWorkout}
          style={styles.deleteButton}
          disabled={isDeleting}
        >
          <Text style={styles.deleteIcon}>{isDeleting ? '...' : '🗑'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Workout Title & Date */}
        <View style={styles.titleSection}>
          <Text style={[styles.workoutName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {workout.name}
          </Text>
          <Text style={[styles.workoutDate, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {formatDate(workout.started_at)}
          </Text>
          <Text style={[styles.workoutTime, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {formatTime(workout.started_at)} - {formatTime(workout.completed_at)}
          </Text>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.statIcon}>★</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {workout.total_points}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Points
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.statIcon}>⏱</Text>
            <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {formatDuration(workout.duration_seconds)}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Duration
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.statIcon}>🏋️</Text>
            <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {formatVolume(workout.total_volume_kg)}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Volume
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.statIcon}>≡</Text>
            <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {workout.workout_sets?.length || 0}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Sets
            </Text>
          </View>
        </View>

        {/* Exercises */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Exercises
        </Text>

        {groupedExercises && Object.entries(groupedExercises).map(([exerciseId, { exercise, sets }]) => (
          <View
            key={exerciseId}
            style={[styles.exerciseCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
          >
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                {exercise?.name || 'Unknown Exercise'}
              </Text>
              <Text style={[styles.muscleGroup, { color: '#10B981' }]}>
                {exercise?.muscle_group}
              </Text>
            </View>

            <View style={styles.setsContainer}>
              {sets.sort((a, b) => a.set_number - b.set_number).map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  <Text style={[styles.setNumber, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                    {index + 1}
                  </Text>
                  <Text style={[styles.setDetails, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                    {set.is_bodyweight
                      ? `${set.reps} reps`
                      : `${formatWeight(set.weight_kg, weightUnit)}${weightUnit} × ${set.reps}`}
                  </Text>
                  <View style={styles.setPoints}>
                    <Text style={styles.pointsStar}>★</Text>
                    <Text style={styles.pointsValue}>{set.points_earned}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Exercise summary */}
            <View style={[styles.exerciseSummary, { borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <Text style={[styles.summaryText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {sets.length} sets • {sets.reduce((sum, s) => sum + (s.points_earned || 0), 0)} points
              </Text>
            </View>
          </View>
        ))}

        {(!groupedExercises || Object.keys(groupedExercises).length === 0) && (
          <View style={styles.emptyExercises}>
            <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              No exercises recorded
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 8,
    width: 44,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 44,
  },
  deleteButton: {
    padding: 8,
    width: 44,
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 24,
  },
  workoutName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 16,
  },
  workoutTime: {
    fontSize: 14,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  exerciseCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  muscleGroup: {
    fontSize: 13,
    fontWeight: '500',
  },
  setsContainer: {
    paddingHorizontal: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  setNumber: {
    width: 28,
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
  pointsStar: {
    fontSize: 12,
    color: '#10B981',
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  exerciseSummary: {
    padding: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    marginTop: 4,
  },
  summaryText: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyExercises: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
