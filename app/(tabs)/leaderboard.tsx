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

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = item.userId === user?.id;
    const rank = index + 1;

    // Check which trophies this user has
    const hasTrophies = (item.userId === pointsLeader && item.totalPoints > 0) ||
                        (item.userId === workoutsLeader && item.totalWorkouts > 0) ||
                        (item.userId === highscoreLeader && item.bestWorkoutPoints > 0);

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
          isCurrentUser && styles.currentUserCard,
          isCurrentUser && { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' },
        ]}
      >
        {/* Top row: rank, username, trophies */}
        <View style={styles.topRow}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
          <View style={styles.nameContainer}>
            <Text
              style={[
                styles.username,
                { color: isDark ? '#F9FAFB' : '#111827' },
                isCurrentUser && styles.currentUserText,
              ]}
              numberOfLines={1}
            >
              {item.username}
              {isCurrentUser && <Text style={styles.youBadge}> (you)</Text>}
            </Text>
          </View>
          {hasTrophies && (
            <View style={styles.trophyContainer}>
              {item.userId === pointsLeader && item.totalPoints > 0 && (
                <Text style={styles.trophyIcon}>🏆</Text>
              )}
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {item.totalWorkouts}
              {item.userId === workoutsLeader && item.totalWorkouts > 0 && ' 🏆'}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              workouts
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {item.totalPoints.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              total pts
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {item.bestWorkoutPoints.toLocaleString()}
              {item.userId === highscoreLeader && item.bestWorkoutPoints > 0 && ' 🏆'}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              best
            </Text>
          </View>
        </View>
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
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        onRefresh={loadLeaderboard}
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
    padding: 16,
    flexGrow: 1,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  nameContainer: {
    flex: 1,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
  },
  currentUserText: {
    fontWeight: '700',
  },
  youBadge: {
    color: '#10B981',
    fontWeight: '600',
  },
  trophyContainer: {
    marginLeft: 8,
  },
  trophyIcon: {
    fontSize: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
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
