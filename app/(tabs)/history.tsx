import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/stores/auth.store';
import { getWorkoutHistory } from '@/services/workout.service';

interface WorkoutItem {
  id: string;
  name: string;
  started_at: string;
  duration_seconds: number | null;
  total_points: number;
  workout_sets: { id: string }[];
}

export default function HistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuthStore();

  const [workouts, setWorkouts] = useState<WorkoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWorkouts();
    }
  }, [user]);

  const loadWorkouts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const history = await getWorkoutHistory(user.id);
      setWorkouts(history);
    } catch (error) {
      console.error('Failed to load workout history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
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

  const renderWorkout = ({ item }: { item: WorkoutItem }) => (
    <TouchableOpacity
      style={[styles.workoutCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
      onPress={() => router.push(`/workout/${item.id}` as any)}
    >
      <View style={styles.workoutHeader}>
        <Text style={[styles.workoutName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {item.name}
        </Text>
        <Text style={[styles.workoutDate, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {formatDate(item.started_at)}
        </Text>
      </View>

      <View style={styles.workoutStats}>
        <View style={styles.stat}>
          <Text style={[styles.statIcon, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>⏱</Text>
          <Text style={[styles.statText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {formatDuration(item.duration_seconds)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statIcon, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>≡</Text>
          <Text style={[styles.statText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {item.workout_sets?.length || 0} sets
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statIconStar, { color: '#10B981' }]}>★</Text>
          <Text style={[styles.statText, { color: '#10B981' }]}>
            {item.total_points} pts
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyIcon, { color: isDark ? '#374151' : '#D1D5DB' }]}>↺</Text>
      <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
        No workouts yet
      </Text>
      <Text style={[styles.emptyDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        Start your first workout to see your history here
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      <FlatList
        data={workouts}
        renderItem={renderWorkout}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        onRefresh={loadWorkouts}
        refreshing={isLoading}
      />
    </View>
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
  list: {
    padding: 20,
    flexGrow: 1,
  },
  workoutCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '600',
  },
  workoutDate: {
    fontSize: 14,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 14,
  },
  statIconStar: {
    fontSize: 14,
  },
  statText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
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
    paddingHorizontal: 40,
  },
});
