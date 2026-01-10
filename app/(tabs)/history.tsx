import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';

// Placeholder data - will be replaced with real data from Supabase
const PLACEHOLDER_WORKOUTS = [
  {
    id: '1',
    name: 'Push Day',
    date: '2024-01-08',
    duration: 65,
    totalSets: 18,
    totalPoints: 432,
  },
  {
    id: '2',
    name: 'Pull Day',
    date: '2024-01-06',
    duration: 72,
    totalSets: 20,
    totalPoints: 521,
  },
  {
    id: '3',
    name: 'Leg Day',
    date: '2024-01-04',
    duration: 58,
    totalSets: 15,
    totalPoints: 389,
  },
];

export default function HistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const renderWorkout = ({ item }: { item: (typeof PLACEHOLDER_WORKOUTS)[0] }) => (
    <TouchableOpacity
      style={[styles.workoutCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
      onPress={() => router.push(`/workout/${item.id}`)}
    >
      <View style={styles.workoutHeader}>
        <Text style={[styles.workoutName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {item.name}
        </Text>
        <Text style={[styles.workoutDate, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {formatDate(item.date)}
        </Text>
      </View>

      <View style={styles.workoutStats}>
        <View style={styles.stat}>
          <FontAwesome name="clock-o" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.statText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {formatDuration(item.duration)}
          </Text>
        </View>
        <View style={styles.stat}>
          <FontAwesome name="list" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.statText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {item.totalSets} sets
          </Text>
        </View>
        <View style={styles.stat}>
          <FontAwesome name="star" size={14} color="#10B981" />
          <Text style={[styles.statText, { color: '#10B981' }]}>
            {item.totalPoints} pts
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome name="history" size={48} color={isDark ? '#374151' : '#D1D5DB'} />
      <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
        No workouts yet
      </Text>
      <Text style={[styles.emptyDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        Start your first workout to see your history here
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      <FlatList
        data={[]}
        renderItem={renderWorkout}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  statText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
