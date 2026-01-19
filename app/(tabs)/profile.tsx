import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore, kgToLbs, WeightUnit } from '@/stores/settings.store';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { profile, userStats, signOut } = useAuthStore();
  const { weightUnit, setWeightUnit } = useSettingsStore();

  const handleSignOut = () => {
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  const toggleWeightUnit = () => {
    setWeightUnit(weightUnit === 'lbs' ? 'kg' : 'lbs');
  };

  const formatVolume = (volumeKg: number) => {
    const volume = weightUnit === 'lbs' ? kgToLbs(volumeKg) : volumeKg;
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k ${weightUnit}`;
    }
    return `${Math.round(volume)} ${weightUnit}`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: '#10B981' }]}>
          <Text style={styles.avatarText}>
            {(profile?.display_name || profile?.username || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          {profile?.display_name || profile?.username || 'User'}
        </Text>
        <Text style={[styles.username, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          @{profile?.username || 'user'}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {userStats?.total_points?.toLocaleString() || 0}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Total Points
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {userStats?.total_workouts || 0}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Workouts
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {formatVolume(userStats?.total_volume_kg || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Total Volume
          </Text>
        </View>
      </View>

      {/* Streak Info */}
      <View style={[styles.streakSection, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <View style={styles.streakRow}>
          <View style={styles.streakItem}>
            <Text style={styles.streakIcon}>🔥</Text>
            <View style={styles.streakTextContainer}>
              <Text style={[styles.streakValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                {userStats?.current_workout_streak || 0}
              </Text>
              <Text style={[styles.streakLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Current Streak
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.streakItem}>
            <Text style={styles.trophyIcon}>🏆</Text>
            <View style={styles.streakTextContainer}>
              <Text style={[styles.streakValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                {userStats?.longest_workout_streak || 0}
              </Text>
              <Text style={[styles.streakLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Best Streak
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Settings
        </Text>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
        >
          <Text style={[styles.menuIcon, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>👤</Text>
          <Text style={[styles.menuText, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Edit Profile
          </Text>
          <Text style={[styles.chevron, { color: isDark ? '#4B5563' : '#9CA3AF' }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
        >
          <Text style={[styles.menuIcon, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>🔔</Text>
          <Text style={[styles.menuText, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Notifications
          </Text>
          <Text style={[styles.chevron, { color: isDark ? '#4B5563' : '#9CA3AF' }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
          onPress={toggleWeightUnit}
        >
          <Text style={[styles.menuIcon, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>⚖️</Text>
          <Text style={[styles.menuText, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Weight Unit
          </Text>
          <View style={styles.unitToggle}>
            <Text style={[
              styles.unitOption,
              weightUnit === 'lbs' && styles.unitOptionActive,
              { color: weightUnit === 'lbs' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280') }
            ]}>
              lbs
            </Text>
            <Text style={[
              styles.unitOption,
              weightUnit === 'kg' && styles.unitOptionActive,
              { color: weightUnit === 'kg' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280') }
            ]}>
              kg
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutIcon}>↪</Text>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={[styles.version, { color: isDark ? '#4B5563' : '#9CA3AF' }]}>
        Rep Logic v1.0.0
      </Text>
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
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  username: {
    fontSize: 16,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  streakSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakIcon: {
    fontSize: 24,
  },
  trophyIcon: {
    fontSize: 24,
  },
  streakTextContainer: {
    flex: 1,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  streakLabel: {
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#374151',
    marginHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  unitOptionActive: {
    backgroundColor: '#10B981',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 8,
    marginBottom: 24,
  },
  signOutIcon: {
    fontSize: 20,
    color: '#EF4444',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
  },
});
