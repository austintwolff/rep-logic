import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface RestTimerProps {
  timeRemaining: number;
  isActive: boolean;
  onStop: () => void;
  onAdjust: (seconds: number) => void;
  isDark: boolean;
}

export default function RestTimer({
  timeRemaining,
  isActive,
  onStop,
  onAdjust,
  isDark,
}: RestTimerProps) {
  if (!isActive) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = timeRemaining / 90; // Assuming 90s default

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Rest Timer
        </Text>
        <TouchableOpacity onPress={onStop} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timerContainer}>
        <Text style={[styles.time, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {formatTime(timeRemaining)}
        </Text>
      </View>

      <View style={styles.adjustButtons}>
        <TouchableOpacity
          style={[styles.adjustButton, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
          onPress={() => onAdjust(-15)}
        >
          <Text style={[styles.adjustText, { color: isDark ? '#F9FAFB' : '#111827' }]}>-15s</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.adjustButton, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
          onPress={() => onAdjust(15)}
        >
          <Text style={[styles.adjustText, { color: isDark ? '#F9FAFB' : '#111827' }]}>+15s</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.adjustButton, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
          onPress={() => onAdjust(30)}
        >
          <Text style={[styles.adjustText, { color: isDark ? '#F9FAFB' : '#111827' }]}>+30s</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(100, progress * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  time: {
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  adjustButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  adjustButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  adjustText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
});
