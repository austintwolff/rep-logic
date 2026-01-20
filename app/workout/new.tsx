import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';

export default function NewWorkoutScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [workoutName, setWorkoutName] = useState('');

  const quickStartOptions = [
    { name: 'Push Day', icon: '↑' },
    { name: 'Pull Day', icon: '↓' },
    { name: 'Leg Day', icon: '⚡' },
    { name: 'Upper Body', icon: '💪' },
    { name: 'Lower Body', icon: '🦵' },
    { name: 'Full Body', icon: '🏋️' },
  ];

  const handleStartWorkout = (name: string) => {
    router.push(`/workout/active?name=${encodeURIComponent(name)}`);
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={[styles.closeIcon, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          New Workout
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Custom Name Input */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Custom Workout
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                color: isDark ? '#F9FAFB' : '#111827',
                borderColor: isDark ? '#374151' : '#E5E7EB',
              },
            ]}
            placeholder="Workout name..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={workoutName}
            onChangeText={setWorkoutName}
          />
          <TouchableOpacity
            style={[styles.startButton, !workoutName && styles.startButtonDisabled]}
            onPress={() => handleStartWorkout(workoutName || 'Workout')}
            disabled={!workoutName}
          >
            <Text style={styles.playIcon}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Start Options */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Quick Start
        </Text>
        <View style={styles.optionsGrid}>
          {quickStartOptions.map((option) => (
            <TouchableOpacity
              key={option.name}
              style={[styles.optionCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
              onPress={() => handleStartWorkout(option.name)}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[styles.optionText, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                {option.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Empty Workout */}
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
        onPress={() => handleStartWorkout('Workout')}
      >
        <Text style={styles.plusIcon}>+</Text>
        <Text style={[styles.emptyButtonText, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Start Empty Workout
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    fontSize: 24,
    fontWeight: '300',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  startButton: {
    backgroundColor: '#10B981',
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  playIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIcon: {
    fontSize: 28,
    textAlign: 'center',
    lineHeight: 34,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  plusIcon: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: '600',
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
