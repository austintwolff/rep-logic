import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { getLeaderboard, LeaderboardEntry } from '@/services/workout.service';
import { colors } from '@/constants/Colors';

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
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
          isCurrentUser && styles.currentUserCard,
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
            <Text style={styles.statValue}>
              {item.totalWorkouts}
              {item.userId === workoutsLeader && item.totalWorkouts > 0 && ' 🏆'}
            </Text>
            <Text style={styles.statLabel}>
              workouts
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValueAccent}>
              {item.totalPoints.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>
              total pts
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {item.bestWorkoutPoints.toLocaleString()}
              {item.userId === highscoreLeader && item.bestWorkoutPoints > 0 && ' 🏆'}
            </Text>
            <Text style={styles.statLabel}>
              best
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🏆</Text>
      <Text style={styles.emptyTitle}>
        No rankings yet
      </Text>
      <Text style={styles.emptyDescription}>
        Complete workouts to appear on the leaderboard
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={leaderboard}
        renderItem={renderEntry}
        keyExtractor={(item) => item.userId}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 20 }]}
        onRefresh={loadLeaderboard}
        refreshing={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
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
    backgroundColor: colors.bgSecondary,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: colors.accent,
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
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  nameContainer: {
    flex: 1,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  currentUserText: {
    fontWeight: '700',
  },
  youBadge: {
    color: colors.accent,
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
    color: colors.textPrimary,
  },
  statValueAccent: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.accent,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.bgTertiary,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: colors.textPrimary,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    color: colors.textSecondary,
  },
});
