import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface RestTimerProps {
  timeRemaining: number;
  isActive: boolean;
  onStop: () => void;
  isDark: boolean;
}

export default function RestTimer({
  timeRemaining,
  isActive,
  onStop,
  isDark,
}: RestTimerProps) {
  if (!isActive) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
      <Text style={[styles.title, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        Rest Timer
      </Text>
      <View style={styles.row}>
        <Text style={[styles.time, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {formatTime(timeRemaining)}
        </Text>
        <TouchableOpacity onPress={onStop} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  skipText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
});
