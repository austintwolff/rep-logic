import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useColorScheme } from '@/components/useColorScheme';
import { getUserMuscleLevels } from '@/services/baseline.service';
import {
  xpForMuscleLevel,
  MUSCLE_XP_CONFIG,
  calculateMuscleDecay,
  DecayStatus,
} from '@/lib/muscle-xp';
import { MuscleLevel } from '@/types/database';

// All muscle groups we track (granular)
const ALL_MUSCLE_GROUPS = [
  'chest',
  'upper back',
  'lower back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
];

// Display names for muscle groups
const MUSCLE_DISPLAY_NAMES: Record<string, string> = {
  'chest': 'Chest',
  'upper back': 'Upper Back',
  'lower back': 'Lower Back',
  'shoulders': 'Shoulders',
  'biceps': 'Biceps',
  'triceps': 'Triceps',
  'forearms': 'Forearms',
  'core': 'Core',
  'quads': 'Quadriceps',
  'hamstrings': 'Hamstrings',
  'glutes': 'Glutes',
  'calves': 'Calves',
};

// Emoji icons for each muscle group
const MUSCLE_ICONS: Record<string, string> = {
  'chest': '🫁',
  'upper back': '🔙',
  'lower back': '⬇️',
  'shoulders': '💪',
  'biceps': '💪',
  'triceps': '💪',
  'forearms': '🤚',
  'core': '🎯',
  'quads': '🦵',
  'hamstrings': '🦵',
  'glutes': '🍑',
  'calves': '🦶',
};

export default function ProgressScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { profile } = useAuthStore();

  const [muscleLevels, setMuscleLevels] = useState<MuscleLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMuscleLevels = async () => {
    if (!profile?.id) return;

    try {
      const levels = await getUserMuscleLevels(profile.id);
      setMuscleLevels(levels);
    } catch (error) {
      console.error('Error loading muscle levels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMuscleLevels();
  }, [profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMuscleLevels();
    setRefreshing(false);
  };

  // Create a complete list with all muscle groups, filling in zeros for missing ones
  // Apply decay based on last_trained_at
  const getMuscleData = (muscleGroup: string) => {
    const found = muscleLevels.find(
      m => m.muscle_group.toLowerCase() === muscleGroup.toLowerCase()
    );

    const storedLevel = found?.current_level || 0;
    const storedXp = found?.current_xp || 0;
    const lastTrainedAt = found?.last_trained_at || null;

    // Calculate XP progress as percentage (0-1)
    const xpNeeded = storedLevel >= MUSCLE_XP_CONFIG.MAX_LEVEL
      ? 0
      : xpForMuscleLevel(storedLevel + 1);
    const storedProgress = xpNeeded > 0 ? storedXp / xpNeeded : 0;

    // Apply decay
    const decay = calculateMuscleDecay(storedLevel, storedProgress, lastTrainedAt);

    return {
      muscle_group: muscleGroup,
      effectiveLevel: decay.effectiveLevel,
      effectiveProgress: decay.effectiveProgress,
      decayStatus: decay.decayStatus,
      levelsLost: decay.levelsLost,
      daysSinceTraining: decay.daysSinceTraining,
      lastTrainedAt,
    };
  };

  // Get all muscles sorted by effective level (highest first)
  const sortedMuscles = ALL_MUSCLE_GROUPS
    .map(getMuscleData)
    .sort((a, b) => b.effectiveLevel - a.effectiveLevel || b.effectiveProgress - a.effectiveProgress);

  // Calculate total level using effective (decayed) levels
  const totalLevel = sortedMuscles.reduce((sum, m) => sum + m.effectiveLevel, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isDark ? '#10B981' : '#10B981'}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Muscle Progress
        </Text>
        <View style={styles.totalLevel}>
          <Text style={[styles.totalLevelLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Total Level
          </Text>
          <Text style={styles.totalLevelValue}>{totalLevel}</Text>
        </View>
      </View>

      {/* Muscle Cards */}
      <View style={styles.muscleList}>
        {sortedMuscles.map((muscle) => {
          const isMaxLevel = muscle.effectiveLevel >= MUSCLE_XP_CONFIG.MAX_LEVEL;
          const progress = isMaxLevel ? 100 : Math.min(100, muscle.effectiveProgress * 100);
          const isDecaying = muscle.decayStatus === 'decaying' || muscle.decayStatus === 'resting';

          return (
            <View
              key={muscle.muscle_group}
              style={[styles.muscleCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
            >
              <View style={styles.muscleHeader}>
                <View style={styles.muscleInfo}>
                  <Text style={styles.muscleIcon}>
                    {MUSCLE_ICONS[muscle.muscle_group] || '💪'}
                  </Text>
                  <View>
                    <Text style={[styles.muscleName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                      {MUSCLE_DISPLAY_NAMES[muscle.muscle_group] || muscle.muscle_group}
                    </Text>
                    {isDecaying && (
                      <Text style={[styles.decayHint, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                        {muscle.decayStatus === 'decaying'
                          ? `Resting · ${muscle.levelsLost} level${muscle.levelsLost > 1 ? 's' : ''} to recover`
                          : 'Resting'}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={[
                  styles.levelBadge,
                  isMaxLevel && styles.levelBadgeMax,
                  isDecaying && !isMaxLevel && styles.levelBadgeResting,
                ]}>
                  <Text style={styles.levelText}>
                    {isMaxLevel ? 'MAX' : `Lv.${muscle.effectiveLevel}`}
                  </Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBg, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress}%` },
                      muscle.effectiveLevel === 0 && progress === 0 && styles.progressEmpty,
                      isMaxLevel && styles.progressFillMax,
                      isDecaying && !isMaxLevel && styles.progressFillResting,
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Empty State */}
      {sortedMuscles.every(m => m.effectiveLevel === 0 && m.effectiveProgress === 0) && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Complete workouts to level up your muscles!
          </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  totalLevel: {
    alignItems: 'flex-end',
  },
  totalLevelLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalLevelValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  muscleList: {
    gap: 12,
  },
  muscleCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  muscleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  muscleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  muscleIcon: {
    fontSize: 20,
  },
  muscleName: {
    fontSize: 16,
    fontWeight: '600',
  },
  decayHint: {
    fontSize: 12,
    marginTop: 2,
  },
  levelBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadgeMax: {
    backgroundColor: '#F59E0B',
  },
  levelBadgeResting: {
    backgroundColor: '#6B7280',
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressFillMax: {
    backgroundColor: '#F59E0B',
  },
  progressFillResting: {
    backgroundColor: '#6B7280',
  },
  progressEmpty: {
    backgroundColor: 'transparent',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
