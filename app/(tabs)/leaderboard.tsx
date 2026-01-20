import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/stores/auth.store';
import { getLeaderboard, LeaderboardEntry } from '@/services/workout.service';

export default function LeaderboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuthStore();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Find leaders for each category
  const pointsLeader = leaderboard.length > 0 ? leaderboard[0].userId : null;
  const workoutsLeader = leaderboard.length > 0
    ? leaderboard.reduce((max, entry) => entry.totalWorkouts > max.totalWorkouts ? entry : max).userId
    : null;
  const highscoreLeader = leaderboard.length > 0
    ? leaderboard.reduce((max, entry) => entry.bestWorkoutPoints > max.bestWorkoutPoints ? entry : max).userId
    : null;

  const renderHeader = () => (
    <View style={[styles.headerRow, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
      <Text style={[styles.headerRank, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>#</Text>
      <Text style={[styles.headerUsername, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>User</Text>
      <Text style={[styles.headerStat, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Workouts</Text>
      <Text style={[styles.headerStat, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Points</Text>
      <Text style={[styles.headerStat, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Best</Text>
    </View>
  );

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = item.userId === user?.id;
    const rank = index + 1;

    return (
      <View
        style={[
          styles.row,
          { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
          isCurrentUser && styles.currentUserRow,
          isCurrentUser && { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' },
        ]}
      >
        <Text style={[styles.rank, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {rank}
        </Text>
        <View style={styles.usernameContainer}>
          <Text
            style={[
              styles.username,
              { color: isDark ? '#F9FAFB' : '#111827' },
              isCurrentUser && styles.currentUserText,
            ]}
            numberOfLines={1}
          >
            {item.username}
          </Text>
          {isCurrentUser && (
            <Text style={[styles.youBadge, { color: '#10B981' }]}>(you)</Text>
          )}
        </View>
        <Text style={[styles.stat, { color: isDark ? '#D1D5DB' : '#374151' }]}>
          {item.totalWorkouts}
          {item.userId === workoutsLeader && item.totalWorkouts > 0 && ' 🏆'}
        </Text>
        <Text style={[styles.stat, { color: '#10B981', fontWeight: '600' }]}>
          {item.totalPoints.toLocaleString()}
          {item.userId === pointsLeader && item.totalPoints > 0 && ' 🏆'}
        </Text>
        <Text style={[styles.stat, { color: isDark ? '#D1D5DB' : '#374151' }]}>
          {item.bestWorkoutPoints.toLocaleString()}
          {item.userId === highscoreLeader && item.bestWorkoutPoints > 0 && ' 🏆'}
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyIcon, { color: isDark ? '#374151' : '#D1D5DB' }]}>🏆</Text>
      <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
        No rankings yet
      </Text>
      <Text style={[styles.emptyDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        Complete workouts to appear on the leaderboard
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
        data={leaderboard}
        renderItem={renderEntry}
        keyExtractor={(item) => item.userId}
        ListHeaderComponent={leaderboard.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        onRefresh={loadLeaderboard}
        refreshing={isLoading}
        stickyHeaderIndices={leaderboard.length > 0 ? [0] : undefined}
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
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRank: {
    width: 32,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  headerUsername: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  headerStat: {
    width: 70,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
  },
  currentUserRow: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  rank: {
    width: 32,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  usernameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  currentUserText: {
    fontWeight: '700',
  },
  youBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  stat: {
    width: 70,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
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
