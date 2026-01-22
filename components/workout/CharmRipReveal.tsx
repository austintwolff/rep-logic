import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = 500;
const SEPARATION = 90; // How far each half moves (total gap = 2x this)

interface CharmRipRevealProps {
  visible: boolean;
  cardWidth?: number;
  cardHeight?: number;
  charmTitle?: string;
  charmDescription?: string;
  onCollect: () => void;
  onAnimationComplete: () => void;
}

export function CharmRipReveal({
  visible,
  cardWidth = CARD_WIDTH,
  cardHeight = CARD_HEIGHT,
  charmTitle = 'Rage Charm',
  charmDescription = 'Next PR: +25% points',
  onCollect,
  onAnimationComplete,
}: CharmRipRevealProps) {
  const [isCollecting, setIsCollecting] = useState(false);
  const [showCharm, setShowCharm] = useState(false);
  const hasCollectedRef = useRef(false);

  // Animation values
  const topHalfY = useSharedValue(0);
  const bottomHalfY = useSharedValue(0);
  const charmOpacity = useSharedValue(0);
  const charmScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  // Reset state when visibility changes
  useEffect(() => {
    if (visible) {
      hasCollectedRef.current = false;
      setIsCollecting(false);
      setShowCharm(false);

      // Reset animation values
      topHalfY.value = 0;
      bottomHalfY.value = 0;
      charmOpacity.value = 0;
      charmScale.value = 0.8;
      glowOpacity.value = 0;
      overlayOpacity.value = 0;

      // Start the rip animation sequence
      startRipAnimation();
    }
  }, [visible]);

  const startRipAnimation = () => {
    // Fade in overlay
    overlayOpacity.value = withTiming(1, { duration: 150 });

    // Shake animation - increasing intensity
    // Small shakes first, getting bigger and faster
    topHalfY.value = withSequence(
      // Gentle shakes
      withTiming(2, { duration: 50 }),
      withTiming(-2, { duration: 50 }),
      withTiming(3, { duration: 45 }),
      withTiming(-3, { duration: 45 }),
      // Medium shakes
      withTiming(4, { duration: 40 }),
      withTiming(-4, { duration: 40 }),
      withTiming(5, { duration: 35 }),
      withTiming(-5, { duration: 35 }),
      // Intense shakes
      withTiming(6, { duration: 30 }),
      withTiming(-6, { duration: 30 }),
      withTiming(7, { duration: 25 }),
      withTiming(-7, { duration: 25 }),
      withTiming(8, { duration: 20 }),
      withTiming(-8, { duration: 20 }),
      // Final burst before opening
      withTiming(0, { duration: 50 }),
      // Open up
      withTiming(-SEPARATION, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withSpring(-SEPARATION + 5, { damping: 15, stiffness: 150 })
    );

    bottomHalfY.value = withSequence(
      // Gentle shakes (opposite direction)
      withTiming(-2, { duration: 50 }),
      withTiming(2, { duration: 50 }),
      withTiming(-3, { duration: 45 }),
      withTiming(3, { duration: 45 }),
      // Medium shakes
      withTiming(-4, { duration: 40 }),
      withTiming(4, { duration: 40 }),
      withTiming(-5, { duration: 35 }),
      withTiming(5, { duration: 35 }),
      // Intense shakes
      withTiming(-6, { duration: 30 }),
      withTiming(6, { duration: 30 }),
      withTiming(-7, { duration: 25 }),
      withTiming(7, { duration: 25 }),
      withTiming(-8, { duration: 20 }),
      withTiming(8, { duration: 20 }),
      // Final burst before opening
      withTiming(0, { duration: 50 }),
      // Open up
      withTiming(SEPARATION, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withSpring(SEPARATION - 5, { damping: 15, stiffness: 150 })
    );

    // Show charm after shake + tear opens (shake is ~600ms, open is ~350ms)
    setTimeout(() => {
      setShowCharm(true);
      charmOpacity.value = withTiming(1, { duration: 300 });
      charmScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }, 1000);
  };

  const handleCollect = () => {
    if (hasCollectedRef.current || isCollecting) return;
    hasCollectedRef.current = true;
    setIsCollecting(true);

    // Glow pulse
    glowOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 150 })
    );

    // Shrink and fade charm
    charmScale.value = withTiming(0.5, { duration: 200, easing: Easing.in(Easing.cubic) });
    charmOpacity.value = withTiming(0, { duration: 200 });

    // Notify parent of collection
    onCollect();

    // Close the rip after charm disappears
    setTimeout(() => {
      closeRip();
    }, 250);
  };

  const closeRip = () => {
    // Halves come back together
    topHalfY.value = withTiming(0, {
      duration: 350,
      easing: Easing.inOut(Easing.cubic),
    });
    bottomHalfY.value = withTiming(0, {
      duration: 350,
      easing: Easing.inOut(Easing.cubic),
    });

    // Fade overlay
    overlayOpacity.value = withDelay(200, withTiming(0, { duration: 150 }));

    // Complete after animation finishes
    setTimeout(() => {
      setShowCharm(false);
      setIsCollecting(false);
      onAnimationComplete();
    }, 500);
  };

  // Animated styles
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const topHalfStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: topHalfY.value }],
  }));

  const bottomHalfStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bottomHalfY.value }],
  }));

  const charmContainerStyle = useAnimatedStyle(() => ({
    opacity: charmOpacity.value,
    transform: [{ scale: charmScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  if (!visible) return null;

  const halfHeight = cardHeight / 2;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <View style={[styles.container, { width: cardWidth, height: cardHeight }]}>
        {/* Charm content - positioned in center, behind card halves */}
        {showCharm && (
          <View style={styles.charmLayer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleCollect}
              disabled={isCollecting}
              style={styles.charmTouchable}
            >
              <Animated.View style={[styles.charmContainer, charmContainerStyle]}>
                {/* Glow effect on tap */}
                <Animated.View style={[styles.charmGlow, glowStyle]} />

                <Text style={styles.charmTitle}>{charmTitle}</Text>
                <Text style={styles.charmDescription}>{charmDescription}</Text>

                <Text style={styles.tapHint}>Tap to collect</Text>
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}

        {/* Top half of the card */}
        <Animated.View
          style={[
            styles.cardHalf,
            styles.topHalf,
            { height: halfHeight },
            topHalfStyle
          ]}
        >
          <View style={[styles.cardContent, styles.topCardContent, { borderRadius: 20 }]}>
            {/* 3D depth gradient at bottom edge */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
              style={styles.topEdgeGradient}
            />
          </View>
        </Animated.View>

        {/* Bottom half of the card */}
        <Animated.View
          style={[
            styles.cardHalf,
            styles.bottomHalf,
            { height: halfHeight },
            bottomHalfStyle
          ]}
        >
          <View style={[styles.cardContent, styles.bottomCardContent, { borderRadius: 20 }]}>
            {/* 3D depth gradient at top edge */}
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'transparent']}
              style={styles.bottomEdgeGradient}
            />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 100,
  },
  container: {
    position: 'relative',
    overflow: 'visible',
  },
  charmLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cardHalf: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 2,
  },
  topHalf: {
    top: 0,
  },
  bottomHalf: {
    bottom: 0,
  },
  cardContent: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  topCardContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  bottomCardContent: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topEdgeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  bottomEdgeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  charmTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  charmContainer: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 40, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
    minWidth: 220,
  },
  charmGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accent,
    borderRadius: 16,
  },
  charmTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  charmDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
    textAlign: 'center',
    marginBottom: 16,
  },
  tapHint: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
