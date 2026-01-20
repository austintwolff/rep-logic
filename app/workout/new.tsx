import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';

type WorkoutType = 'Push' | 'Pull' | 'Legs' | 'Full Body';
type GoalMode = 'Strength' | 'Hypertrophy' | 'Endurance';

const WORKOUT_TYPES: { type: WorkoutType; icon: string }[] = [
  { type: 'Push', icon: '↑' },
  { type: 'Pull', icon: '↓' },
  { type: 'Legs', icon: '🦵' },
  { type: 'Full Body', icon: '🏋️' },
];

const GOAL_MODES: { mode: GoalMode; reps: string; description: string }[] = [
  { mode: 'Strength', reps: '≤ 6 reps', description: 'Heavy weight, low reps' },
  { mode: 'Hypertrophy', reps: '6–12 reps', description: 'Muscle building' },
  { mode: 'Endurance', reps: '12+ reps', description: 'Lighter weight, high reps' },
];

export default function NewWorkoutScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalMode | null>(null);
  const [showPowerUpModal, setShowPowerUpModal] = useState(false);

  const canStart = selectedType !== null && selectedGoal !== null;

  const handleStartWorkout = () => {
    if (!canStart) return;

    const workoutName = selectedType === 'Full Body' ? 'Full Body' : `${selectedType} Day`;
    router.push(
      `/workout/active?name=${encodeURIComponent(workoutName)}&goal=${encodeURIComponent(selectedGoal!)}`
    );
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
          Workout Setup
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Workout Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Workout Type
          </Text>
          <View style={styles.typeGrid}>
            {WORKOUT_TYPES.map(({ type, icon }) => {
              const isSelected = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeCard,
                    { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
                    isSelected && styles.typeCardSelected,
                  ]}
                  onPress={() => setSelectedType(type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeIcon}>{icon}</Text>
                  <Text
                    style={[
                      styles.typeText,
                      { color: isDark ? '#F9FAFB' : '#111827' },
                      isSelected && styles.typeTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Goal Mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Goal Mode
          </Text>
          <View style={styles.goalList}>
            {GOAL_MODES.map(({ mode, reps, description }) => {
              const isSelected = selectedGoal === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.goalCard,
                    { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
                    isSelected && styles.goalCardSelected,
                  ]}
                  onPress={() => setSelectedGoal(mode)}
                  activeOpacity={0.7}
                >
                  <View style={styles.goalLeft}>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.goalInfo}>
                      <Text
                        style={[
                          styles.goalTitle,
                          { color: isDark ? '#F9FAFB' : '#111827' },
                          isSelected && styles.goalTitleSelected,
                        ]}
                      >
                        {mode}
                      </Text>
                      <Text style={[styles.goalDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {description}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.repsBadge, isSelected && styles.repsBadgeSelected]}>
                    <Text style={[styles.repsText, isSelected && styles.repsTextSelected]}>
                      {reps}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Power-Ups */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Power-Ups
          </Text>
          <View style={styles.powerUpRow}>
            {[1, 2, 3].map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.powerUpSlot, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
                onPress={() => setShowPowerUpModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.powerUpPlus, { color: isDark ? '#4B5563' : '#9CA3AF' }]}>+</Text>
                <Text style={[styles.powerUpLabel, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                  Slot {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startButton, !canStart && styles.startButtonDisabled]}
          onPress={handleStartWorkout}
          disabled={!canStart}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Power-Up Modal */}
      <Modal
        visible={showPowerUpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPowerUpModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPowerUpModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.modalIcon}>🚀</Text>
            <Text style={[styles.modalTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              Power-Ups Coming Soon
            </Text>
            <Text style={[styles.modalDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Boost your workouts with special power-ups in a future update!
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPowerUpModal(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Workout Type
  typeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  typeIcon: {
    fontSize: 28,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: '#10B981',
  },
  // Goal Mode
  goalList: {
    gap: 10,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  goalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#10B981',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  goalInfo: {
    gap: 2,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalTitleSelected: {
    color: '#10B981',
  },
  goalDescription: {
    fontSize: 13,
  },
  repsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  repsBadgeSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  repsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  repsTextSelected: {
    color: '#10B981',
  },
  // Power-Ups
  powerUpRow: {
    flexDirection: 'row',
    gap: 12,
  },
  powerUpSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  powerUpPlus: {
    fontSize: 28,
    fontWeight: '300',
  },
  powerUpLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  startButton: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonDisabled: {
    backgroundColor: '#6B7280',
    shadowOpacity: 0,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    width: '100%',
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
