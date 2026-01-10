import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/stores/auth.store';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { profile, userStats, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert(
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

  const formatVolume = (volumeKg: number) => {
    if (volumeKg >= 1000) {
      return `${(volumeKg / 1000).toFixed(1)}t`;
    }
    return `${Math.round(volumeKg)}kg`;
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
            <FontAwesome name="fire" size={24} color="#F59E0B" />
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
            <FontAwesome name="trophy" size={24} color="#10B981" />
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
          <FontAwesome name="user" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.menuText, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Edit Profile
          </Text>
          <FontAwesome name="chevron-right" size={16} color={isDark ? '#4B5563' : '#9CA3AF'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
        >
          <FontAwesome name="bell" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.menuText, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Notifications
          </Text>
          <FontAwesome name="chevron-right" size={16} color={isDark ? '#4B5563' : '#9CA3AF'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
        >
          <FontAwesome name="cog" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.menuText, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Preferences
          </Text>
          <FontAwesome name="chevron-right" size={16} color={isDark ? '#4B5563' : '#9CA3AF'} />
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <FontAwesome name="sign-out" size={20} color="#EF4444" />
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
  streakTextContainer: {
    flex: 1,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '700',
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
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
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
