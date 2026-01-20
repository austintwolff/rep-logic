import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { PointsResult, PointBonus } from '@/lib/points-engine/types';

// Multiplier colors
const MULTIPLIER_COLORS = {
  hypertrophy_rep_range: '#8B5CF6', // Purple - rep range
  progressive_overload: '#EF4444',  // Red
  workout_streak: '#3B82F6',        // Blue
  volume_scaling: '#8B5CF6',        // Purple (same as rep range)
  weekly_consistency: '#3B82F6',    // Blue
} as const;

interface AnimatedSetRowProps {
  setNumber: number;
  weight: number | null;
  reps: number;
  isBodyweight: boolean;
  weightUnit: 'kg' | 'lbs';
  pointsResult: PointsResult;
  onAnimationComplete?: () => void;
  isDark: boolean;
}

export default function AnimatedSetRow({
  setNumber,
  weight,
  reps,
  isBodyweight,
  weightUnit,
  pointsResult,
  onAnimationComplete,
  isDark,
}: AnimatedSetRowProps) {
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const [currentBonusIndex, setCurrentBonusIndex] = useState(-1); // -1 = base phase, 0+ = bonus phases
  const [animationPhase, setAnimationPhase] = useState<'base' | 'bonus' | 'done'>('base');

  // Animation values
  const detailsScale = useSharedValue(1);
  const detailsFlash = useSharedValue(0);
  const bonusScale = useSharedValue(0);
  const bonusOpacity = useSharedValue(0);

  const pointsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get display-worthy bonuses (exclude volume_scaling penalty)
  const displayBonuses = pointsResult.bonuses.filter(
    b => b.type !== 'volume_scaling' && b.multiplier > 0
  );

  // Calculate points at each phase
  const getPointsAtPhase = (phaseIndex: number): number => {
    if (phaseIndex < 0) return pointsResult.basePoints;

    let multiplier = 1;
    for (let i = 0; i <= phaseIndex && i < displayBonuses.length; i++) {
      multiplier += displayBonuses[i].multiplier;
    }

    // Apply volume scaling if present
    const volumeBonus = pointsResult.bonuses.find(b => b.type === 'volume_scaling');
    if (volumeBonus) {
      multiplier *= volumeBonus.multiplier;
    }

    return Math.floor(pointsResult.basePoints * multiplier);
  };

  // Count up points animation
  const countUpPoints = (from: number, to: number, duration: number, onComplete?: () => void) => {
    if (pointsIntervalRef.current) {
      clearInterval(pointsIntervalRef.current);
    }

    if (from >= to) {
      setDisplayedPoints(to);
      onComplete?.();
      return;
    }

    const steps = Math.min(to - from, 15);
    const stepDuration = duration / steps;
    const increment = Math.ceil((to - from) / steps);
    let current = from;

    pointsIntervalRef.current = setInterval(() => {
      current += increment;
      if (current >= to) {
        setDisplayedPoints(to);
        if (pointsIntervalRef.current) clearInterval(pointsIntervalRef.current);
        onComplete?.();
      } else {
        setDisplayedPoints(current);
      }
    }, stepDuration);
  };

  // Start animation sequence
  useEffect(() => {
    // Phase 1: Pulse weight × reps and count to base points
    detailsScale.value = withSequence(
      withTiming(1.06, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 120, easing: Easing.in(Easing.quad) })
    );
    detailsFlash.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 250 })
    );

    countUpPoints(0, pointsResult.basePoints, 350, () => {
      // After base phase, start bonus phases
      if (displayBonuses.length > 0) {
        setTimeout(() => {
          setCurrentBonusIndex(0);
          setAnimationPhase('bonus');
        }, 150);
      } else {
        finishAnimation();
      }
    });

    return () => {
      if (pointsIntervalRef.current) clearInterval(pointsIntervalRef.current);
    };
  }, []);

  // Handle bonus phase animations
  useEffect(() => {
    if (currentBonusIndex < 0 || currentBonusIndex >= displayBonuses.length) return;

    const prevPoints = currentBonusIndex === 0
      ? pointsResult.basePoints
      : getPointsAtPhase(currentBonusIndex - 1);
    const targetPoints = getPointsAtPhase(currentBonusIndex);

    // Reset and animate bonus appearing
    bonusScale.value = 0;
    bonusOpacity.value = 0;

    bonusScale.value = withSequence(
      withTiming(1.12, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 120, easing: Easing.in(Easing.quad) }),
      withDelay(250, withTiming(0.8, { duration: 150 })),
      withTiming(0, { duration: 100 })
    );
    bonusOpacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withDelay(350, withTiming(0, { duration: 150 }))
    );

    // Count up points for this bonus
    setTimeout(() => {
      countUpPoints(prevPoints, targetPoints, 250, () => {
        // Move to next bonus or finish
        setTimeout(() => {
          if (currentBonusIndex < displayBonuses.length - 1) {
            setCurrentBonusIndex(prev => prev + 1);
          } else {
            finishAnimation();
          }
        }, 350);
      });
    }, 100);
  }, [currentBonusIndex]);

  const finishAnimation = () => {
    setDisplayedPoints(pointsResult.finalPoints);
    setAnimationPhase('done');
    setCurrentBonusIndex(-1);
    onAnimationComplete?.();
  };

  // Animated styles
  const detailsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: detailsScale.value }],
  }));

  const detailsTextAnimatedStyle = useAnimatedStyle(() => {
    const normalColor = isDark ? '#F9FAFB' : '#111827';
    const flashColor = '#10B981';
    return {
      color: interpolateColor(detailsFlash.value, [0, 1], [normalColor, flashColor]),
    };
  });

  const bonusAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bonusScale.value }],
    opacity: bonusOpacity.value,
  }));

  const currentBonus = currentBonusIndex >= 0 && currentBonusIndex < displayBonuses.length
    ? displayBonuses[currentBonusIndex]
    : null;
  const bonusColor = currentBonus
    ? MULTIPLIER_COLORS[currentBonus.type as keyof typeof MULTIPLIER_COLORS] || '#8B5CF6'
    : '#8B5CF6';

  const formatMultiplier = (bonus: PointBonus): string => {
    const multiplierValue = 1 + bonus.multiplier;
    return `×${multiplierValue.toFixed(2)}`;
  };

  const getBonusLabel = (bonus: PointBonus): string => {
    switch (bonus.type) {
      case 'hypertrophy_rep_range':
        return 'Rep Range';
      case 'progressive_overload':
        return 'PR!';
      case 'workout_streak':
        return 'Streak';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
      <Text style={[styles.setNumber, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        {setNumber}
      </Text>

      <Animated.View style={[styles.detailsContainer, detailsAnimatedStyle]}>
        <Animated.Text style={[styles.setDetails, detailsTextAnimatedStyle]}>
          {isBodyweight
            ? `${reps} reps`
            : `${weight}${weightUnit} × ${reps}`}
        </Animated.Text>
      </Animated.View>

      {/* Bonus badge - shows during bonus animation phase */}
      {currentBonus && animationPhase === 'bonus' && (
        <Animated.View
          style={[
            styles.bonusBadge,
            { backgroundColor: bonusColor },
            bonusAnimatedStyle,
          ]}
        >
          <Text style={styles.bonusText}>
            {formatMultiplier(currentBonus)} {getBonusLabel(currentBonus)}
          </Text>
        </Animated.View>
      )}

      <View style={styles.pointsContainer}>
        <Text style={styles.starIcon}>★</Text>
        <Text style={styles.pointsText}>{displayedPoints}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  detailsContainer: {
    flex: 1,
  },
  setDetails: {
    fontSize: 16,
    fontWeight: '500',
  },
  bonusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  bonusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starIcon: {
    fontSize: 12,
    color: '#10B981',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
});
