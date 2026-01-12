import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useColorScheme } from '@/components/useColorScheme';
import { getStreakMultiplier, xpForLevel, POINTS_CONFIG } from '@/lib/points-engine';
import { getUserMuscleLevels, getBaselineStatus } from '@/services/baseline.service';
import { MuscleLevel } from '@/types/database';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { profile, userStats, refreshUserStats } = useAuthStore();

  const [muscleLevels, setMuscleLevels] = useState<MuscleLevel[]>([]);
  const [baselineStatus, setBaselineStatus] = useState<{ total: number; completed: number; inProgress: number }>({ total: 0, completed: 0, inProgress: 0 });

  // Refresh user stats when screen loads
  useEffect(() => {
    refreshUserStats();
  }, []);

  // Load muscle data when profile becomes available
  useEffect(() => {
    if (!profile?.id) return;

    const loadMuscleLevels = async () => {
      try {
        const levels = await getUserMuscleLevels(profile.id);
        const sorted = levels.sort((a, b) => b.current_level - a.current_level).slice(0, 6);
        setMuscleLevels(sorted);
      } catch (error) {
        console.error('Error loading muscle levels:', error);
      }
    };

    const loadBaselineStatus = async () => {
      try {
        const status = await getBaselineStatus(profile.id);
        setBaselineStatus(status);
      } catch (error) {
        console.error('Error loading baseline status:', error);
      }
    };

    loadMuscleLevels();
    loadBaselineStatus();
  }, [profile?.id]);

  const handleStartWorkout = () => {
    router.push('/workout/new');
  };

  const formatLastWorkout = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const streakMultiplier = getStreakMultiplier(userStats?.current_workout_streak || 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}
      contentContainerStyle={styles.content}
    >
      {/* Welcome Section */}
      <View style={styles.welcome}>
        <Text style={[styles.greeting, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Welcome back,
        </Text>
        <Text style={[styles.username, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {profile?.display_name || profile?.username || 'Athlete'}
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>★</Text>
          </View>
          <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {userStats?.total_points?.toLocaleString() || 0}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Total Points
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIconFire}>🔥</Text>
          </View>
          <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {userStats?.current_workout_streak || 0}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Day Streak
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIconCalendar}>📅</Text>
          </View>
          <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {userStats?.total_workouts || 0}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Workouts
          </Text>
        </View>
      </View>

      {/* Start Workout Button */}
      <TouchableOpacity style={styles.startButton} onPress={handleStartWorkout}>
        <Text style={styles.startButtonIcon}>+</Text>
        <Text style={styles.startButtonText}>Start Workout</Text>
      </TouchableOpacity>

      {/* Weekly Points */}
      <View style={[styles.weeklyCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Text style={[styles.weeklyTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          This Week
        </Text>
        <View style={styles.weeklyStats}>
          <View style={styles.weeklyStat}>
            <Text style={[styles.weeklyValue, { color: '#10B981' }]}>
              {userStats?.weekly_points?.toLocaleString() || 0}
            </Text>
            <Text style={[styles.weeklyLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Points Earned
            </Text>
          </View>
        </View>
      </View>

      {/* Last Workout */}
      {userStats?.last_workout_at && (
        <View style={[styles.lastWorkoutCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <Text style={[styles.lastWorkoutIcon, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>⏱</Text>
          <View style={styles.lastWorkoutText}>
            <Text style={[styles.lastWorkoutLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Last Workout
            </Text>
            <Text style={[styles.lastWorkoutValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {formatLastWorkout(userStats.last_workout_at as string)}
            </Text>
          </View>
        </View>
      )}

      {/* Streak Info */}
      {(userStats?.current_workout_streak ?? 0) > 0 && (
        <View style={[styles.streakCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.streakIcon}>🔥</Text>
          <View style={styles.streakText}>
            <Text style={styles.streakTitle}>
              {userStats?.current_workout_streak} Day Streak!
            </Text>
            <Text style={styles.streakDescription}>
              {streakMultiplier > 1
                ? `+${Math.round((streakMultiplier - 1) * 100)}% bonus on all points!`
                : 'Keep it up! Streak bonuses start at 3 days.'}
            </Text>
          </View>
        </View>
      )}

      {/* Baseline Progress */}
      {baselineStatus.inProgress > 0 && (
        <View style={[styles.baselineCard, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
          <View style={styles.baselineHeader}>
            <Text style={[styles.baselineTitle, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
              Baseline Mode
            </Text>
            <Text style={[styles.baselineCount, { color: isDark ? '#60A5FA' : '#3B82F6' }]}>
              {baselineStatus.inProgress} exercise{baselineStatus.inProgress !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={[styles.baselineDescription, { color: isDark ? '#BFDBFE' : '#1E40AF' }]}>
            Complete 3 workouts per exercise to establish baselines and unlock progressive overload bonuses.
          </Text>
          <View style={styles.baselineProgress}>
            <View style={[styles.baselineProgressBg, { backgroundColor: isDark ? '#1E40AF' : '#BFDBFE' }]}>
              <View
                style={[
                  styles.baselineProgressFill,
                  {
                    backgroundColor: '#3B82F6',
                    width: `${baselineStatus.total > 0 ? (baselineStatus.completed / baselineStatus.total) * 100 : 0}%`
                  }
                ]}
              />
            </View>
            <Text style={[styles.baselineProgressText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
              {baselineStatus.completed}/{baselineStatus.total} complete
            </Text>
          </View>
        </View>
      )}

      {/* Muscle Levels */}
      {muscleLevels.length > 0 && (
        <View style={[styles.muscleLevelsCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <Text style={[styles.muscleLevelsTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Muscle Levels
          </Text>
          <View style={styles.muscleLevelsGrid}>
            {muscleLevels.map((muscle) => {
              const currentXp = muscle.current_xp || 0;
              const xpNeeded = xpForLevel(muscle.current_level + 1);
              const progress = Math.min(100, (currentXp / xpNeeded) * 100);

              return (
                <View
                  key={muscle.muscle_group}
                  style={[styles.muscleLevel, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                >
                  <View style={styles.muscleLevelHeader}>
                    <Text style={[styles.muscleLevelName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                      {muscle.muscle_group}
                    </Text>
                    <Text style={[styles.muscleLevelNumber, { color: '#10B981' }]}>
                      Lv.{muscle.current_level}
                    </Text>
                  </View>
                  <View style={[styles.muscleLevelProgressBg, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
                    <View
                      style={[
                        styles.muscleLevelProgressFill,
                        { backgroundColor: '#10B981', width: `${progress}%` }
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  welcome: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
  },
  username: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
    color: '#10B981',
  },
  statIconFire: {
    fontSize: 20,
  },
  statIconCalendar: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginRight: 12,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  weeklyCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  weeklyStats: {
    flexDirection: 'row',
  },
  weeklyStat: {
    flex: 1,
  },
  weeklyValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  weeklyLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  streakIcon: {
    fontSize: 24,
  },
  streakText: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  streakDescription: {
    fontSize: 14,
    color: '#B45309',
    marginTop: 2,
  },
  lastWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lastWorkoutIcon: {
    fontSize: 20,
  },
  lastWorkoutText: {
    flex: 1,
  },
  lastWorkoutLabel: {
    fontSize: 12,
  },
  lastWorkoutValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  baselineCard: {
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  baselineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  baselineTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  baselineCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  baselineDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  baselineProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  baselineProgressBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  baselineProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  baselineProgressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  muscleLevelsCard: {
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  muscleLevelsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  muscleLevelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  muscleLevel: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
  },
  muscleLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  muscleLevelName: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  muscleLevelNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  muscleLevelProgressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  muscleLevelProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
