import { View, Text, StyleSheet } from 'react-native';

interface MuscleLevelBadgeProps {
  level: number;
  isMax?: boolean;
  isResting?: boolean;
  isLevelUp?: boolean;
}

export function MuscleLevelBadge({ level, isMax, isResting, isLevelUp }: MuscleLevelBadgeProps) {
  return (
    <View style={[
      styles.badge,
      isMax && styles.badgeMax,
      isResting && styles.badgeResting,
      isLevelUp && styles.badgeLevelUp,
    ]}>
      <Text style={styles.text}>{isMax ? 'MAX' : `Lv.${level}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeMax: {
    backgroundColor: '#F59E0B',
  },
  badgeResting: {
    backgroundColor: '#6B7280',
  },
  badgeLevelUp: {
    backgroundColor: '#F59E0B',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
