import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    totalPoints: string;
    completionBonus: string;
    totalSets: string;
    duration: string;
    exerciseCount: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [displayedPoints, setDisplayedPoints] = useState(0);
  const totalPoints = parseInt(params.totalPoints || '0', 10);
  const completionBonus = parseInt(params.completionBonus || '0', 10);
  const totalSets = parseInt(params.totalSets || '0', 10);
  const duration = parseInt(params.duration || '0', 10);
  const exerciseCount = parseInt(params.exerciseCount || '0', 10);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Animate in
    scale.value = withSpring(1, { damping: 12 });
    opacity.value = withTiming(1, { duration: 500 });

    // Count up points
    const increment = Math.ceil(totalPoints / 30);
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= totalPoints) {
        setDisplayedPoints(totalPoints);
        clearInterval(interval);
      } else {
        setDisplayedPoints(current);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [totalPoints]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  const handleDone = () => {
    // Dismiss the workout modal and go back to tabs
    router.dismissAll();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, animatedStyle]}>
          <View style={styles.iconCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Workout Complete!
        </Text>

        {/* Points Display */}
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsValue}>+{displayedPoints.toLocaleString()}</Text>
          <Text style={styles.pointsLabel}>points earned</Text>
          {completionBonus > 0 && (
            <Text style={styles.bonusText}>
              Includes +{completionBonus} completion bonus!
            </Text>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.statIconClock}>⏱</Text>
            <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {formatDuration(duration)}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Duration
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.statIconList}>≡</Text>
            <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {totalSets}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Total Sets
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.statIconHeart}>💪</Text>
            <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              {exerciseCount}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Exercises
            </Text>
          </View>
        </View>

        {/* Motivational Message */}
        <View style={[styles.messageCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <Text style={styles.fireIcon}>🔥</Text>
          <Text style={[styles.messageText, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Great work! Keep the momentum going!
          </Text>
        </View>
      </View>

      {/* Done Button */}
      <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  checkIcon: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 24,
  },
  pointsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  pointsValue: {
    fontSize: 56,
    fontWeight: '800',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  pointsLabel: {
    fontSize: 18,
    color: '#10B981',
    opacity: 0.8,
  },
  bonusText: {
    fontSize: 14,
    color: '#F59E0B',
    marginTop: 8,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconClock: {
    fontSize: 24,
    color: '#6366F1',
  },
  statIconList: {
    fontSize: 24,
    color: '#F59E0B',
  },
  statIconHeart: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  fireIcon: {
    fontSize: 20,
  },
  messageText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
