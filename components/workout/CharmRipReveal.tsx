import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/Colors';
import { CharmRarity } from '@/lib/charm-drop';

// Rarity-based colors
const RARITY_COLORS: Record<CharmRarity, { border: string; glow: string; text: string }> = {
  Common: {
    border: 'rgba(156, 163, 175, 0.5)',
    glow: '#9CA3AF',
    text: '#9CA3AF',
  },
  Rare: {
    border: 'rgba(234, 179, 8, 0.5)',
    glow: '#EAB308',
    text: '#EAB308',
  },
  Epic: {
    border: 'rgba(168, 85, 247, 0.6)',
    glow: '#A855F7',
    text: '#A855F7',
  },
};

interface CharmRipRevealProps {
  visible: boolean;
  charmTitle?: string;
  charmDescription?: string;
  charmImage?: ImageSourcePropType;
  rarity?: CharmRarity;
  onCollect: () => void;
  onAnimationComplete: () => void;
}

export function CharmRipReveal({
  visible,
  charmTitle = 'Charm',
  charmDescription = 'Bonus effect',
  charmImage,
  rarity = 'Common',
  onCollect,
  onAnimationComplete,
}: CharmRipRevealProps) {
  const rarityColors = RARITY_COLORS[rarity];
  const [isCollecting, setIsCollecting] = useState(false);
  const [showCharm, setShowCharm] = useState(false);
  const hasCollectedRef = useRef(false);

  // Animation values
  const shakeX = useSharedValue(0);
  const charmOpacity = useSharedValue(0);
  const charmScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  // Reset state when visibility changes
  useEffect(() => {
    if (visible) {
      hasCollectedRef.current = false;
      setIsCollecting(false);
      setShowCharm(false);

      // Reset animation values
      shakeX.value = 0;
      charmOpacity.value = 0;
      charmScale.value = 0.5;
      glowOpacity.value = 0;
      overlayOpacity.value = 0;

      // Start the animation sequence
      startAnimation();
    }
  }, [visible]);

  const startAnimation = () => {
    // Fade in overlay
    overlayOpacity.value = withTiming(1, { duration: 150 });

    // Shake animation - increasing intensity
    shakeX.value = withSequence(
      // Gentle shakes
      withTiming(3, { duration: 50 }),
      withTiming(-3, { duration: 50 }),
      withTiming(4, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      // Medium shakes
      withTiming(5, { duration: 40 }),
      withTiming(-5, { duration: 40 }),
      withTiming(6, { duration: 35 }),
      withTiming(-6, { duration: 35 }),
      // Intense shakes
      withTiming(8, { duration: 30 }),
      withTiming(-8, { duration: 30 }),
      withTiming(10, { duration: 25 }),
      withTiming(-10, { duration: 25 }),
      withTiming(12, { duration: 20 }),
      withTiming(-12, { duration: 20 }),
      // Return to center
      withTiming(0, { duration: 50 })
    );

    // Show charm after shake completes (~500ms)
    setTimeout(() => {
      setShowCharm(true);
      charmOpacity.value = withTiming(1, { duration: 200 });
      charmScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }, 550);
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

    // Fade out overlay and complete
    setTimeout(() => {
      overlayOpacity.value = withTiming(0, { duration: 150 });

      setTimeout(() => {
        setShowCharm(false);
        setIsCollecting(false);
        onAnimationComplete();
      }, 200);
    }, 250);
  };

  // Animated styles
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const charmContainerStyle = useAnimatedStyle(() => ({
    opacity: charmOpacity.value,
    transform: [{ scale: charmScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {/* Shake container - shakes the whole content area */}
      <Animated.View style={shakeStyle}>
        {/* Charm popup */}
        {showCharm && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleCollect}
            disabled={isCollecting}
            style={styles.charmTouchable}
          >
            <Animated.View style={[
              styles.charmContainer,
              charmContainerStyle,
              { borderColor: rarityColors.border }
            ]}>
              {/* Glow effect on tap */}
              <Animated.View style={[
                styles.charmGlow,
                glowStyle,
                { backgroundColor: rarityColors.glow }
              ]} />

              {/* Charm Image */}
              {charmImage && (
                <Image
                  source={charmImage}
                  style={styles.charmImage}
                  resizeMode="contain"
                />
              )}

              <Text style={[styles.rarityLabel, { color: rarityColors.text }]}>
                {rarity}
              </Text>
              <Text style={styles.charmTitle}>{charmTitle}</Text>
              <Text style={[styles.charmDescription, { color: rarityColors.text }]}>
                {charmDescription}
              </Text>

              <Text style={styles.tapHint}>Tap to collect</Text>
            </Animated.View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 100,
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
    backgroundColor: 'rgba(20, 20, 30, 0.98)',
    borderWidth: 2,
    minWidth: 260,
  },
  charmImage: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  charmGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  rarityLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  charmTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  charmDescription: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  tapHint: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
