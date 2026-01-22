import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { colors } from '@/constants/Colors';

// Custom SVG Icons
function CheckIcon({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17L4 12" stroke={colors.textPrimary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ClockIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={colors.accent} strokeWidth={2} />
      <Path d="M12 6V12L16 14" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ListIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 6H21" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 12H21" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 18H21" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 6H3.01" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 12H3.01" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 18H3.01" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function DumbbellIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 6.5L17.5 17.5" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 10L10 3" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M14 21L21 14" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 14L14 3" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 21L21 10" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function FlameIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C8.5 5.5 8 8.5 9 11C7 10 6 7.5 6 7.5C3.5 11 4 15 6 18C4.5 17 3 15.5 3 15.5C3.5 19 7.5 22 12 22Z"
        fill={colors.accent}
      />
      <Path
        d="M12 22C14.5 22 16 20 16 17.5C16 15 14 13 12 11C10 13 8 15 8 17.5C8 20 9.5 22 12 22Z"
        fill={colors.accentLight}
      />
    </Svg>
  );
}

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    totalPoints: string;
    completionBonus: string;
    totalSets: string;
    duration: string;
    exerciseCount: string;
  }>();

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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, animatedStyle]}>
          <View style={styles.iconCircle}>
            <CheckIcon />
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>
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
          <View style={styles.statCard}>
            <ClockIcon />
            <Text style={styles.statValue}>
              {formatDuration(duration)}
            </Text>
            <Text style={styles.statLabel}>
              Duration
            </Text>
          </View>

          <View style={styles.statCard}>
            <ListIcon />
            <Text style={styles.statValue}>
              {totalSets}
            </Text>
            <Text style={styles.statLabel}>
              Total Sets
            </Text>
          </View>

          <View style={styles.statCard}>
            <DumbbellIcon />
            <Text style={styles.statValue}>
              {exerciseCount}
            </Text>
            <Text style={styles.statLabel}>
              Exercises
            </Text>
          </View>
        </View>

        {/* Motivational Message */}
        <View style={styles.messageCard}>
          <FlameIcon />
          <Text style={styles.messageText}>
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
    backgroundColor: colors.bgPrimary,
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
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 24,
    color: colors.textPrimary,
  },
  pointsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  pointsValue: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  pointsLabel: {
    fontSize: 18,
    color: colors.accentLight,
  },
  bonusText: {
    fontSize: 14,
    color: colors.textPrimary,
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
    backgroundColor: colors.bgSecondary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    backgroundColor: colors.bgSecondary,
  },
  messageText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  doneButton: {
    backgroundColor: colors.accent,
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
});
