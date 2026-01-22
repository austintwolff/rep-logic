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
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/Colors';

type WorkoutType = 'Push' | 'Pull' | 'Legs' | 'Full Body';
type GoalMode = 'Strength' | 'Hypertrophy' | 'Endurance';

// Custom SVG Icons
function CloseIcon({ size = 24, color = colors.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M6 6L18 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PushIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M5 12L12 5L19 12" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PullIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5V19" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M5 12L12 19L19 12" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LegsIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 4V10C8 12 6 14 6 18C6 20 7 21 8 21" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 4V10C16 12 18 14 18 18C18 20 17 21 16 21" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FullBodyIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z" stroke={colors.textPrimary} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 8V14" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M8 10L16 10" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M12 14L9 22" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M12 14L15 22" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

const WORKOUT_TYPES: { type: WorkoutType; icon: 'push' | 'pull' | 'legs' | 'full' }[] = [
  { type: 'Push', icon: 'push' },
  { type: 'Pull', icon: 'pull' },
  { type: 'Legs', icon: 'legs' },
  { type: 'Full Body', icon: 'full' },
];

const GOAL_MODES: { mode: GoalMode; reps: string; description: string }[] = [
  { mode: 'Strength', reps: '≤ 6 reps', description: 'Heavy weight, low reps' },
  { mode: 'Hypertrophy', reps: '6–12 reps', description: 'Muscle building' },
  { mode: 'Endurance', reps: '12+ reps', description: 'Lighter weight, high reps' },
];

export default function NewWorkoutScreen() {
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalMode | null>(null);
  const [showPowerUpModal, setShowPowerUpModal] = useState(false);

  const canStart = selectedType !== null && selectedGoal !== null;

  const handleStartWorkout = () => {
    if (!canStart) return;

    const workoutName = selectedType === 'Full Body' ? 'Full Body' : `${selectedType} Day`;
    router.replace(
      `/workout/deck?name=${encodeURIComponent(workoutName)}&goal=${encodeURIComponent(selectedGoal!)}`
    );
  };

  const handleClose = () => {
    router.back();
  };

  const renderTypeIcon = (icon: string) => {
    if (icon === 'push') return <PushIcon />;
    if (icon === 'pull') return <PullIcon />;
    if (icon === 'legs') return <LegsIcon />;
    if (icon === 'full') return <FullBodyIcon />;
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton} accessibilityLabel="Close">
          <CloseIcon />
        </TouchableOpacity>
        <Text style={styles.title}>
          Workout Setup
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Workout Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
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
                    isSelected && styles.typeCardSelected,
                  ]}
                  onPress={() => setSelectedType(type)}
                  activeOpacity={0.7}
                >
                  {renderTypeIcon(icon)}
                  <Text
                    style={[
                      styles.typeText,
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
          <Text style={styles.sectionTitle}>
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
                          isSelected && styles.goalTitleSelected,
                        ]}
                      >
                        {mode}
                      </Text>
                      <Text style={styles.goalDescription}>
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
          <Text style={styles.sectionTitle}>
            Power-Ups
          </Text>
          <View style={styles.powerUpRow}>
            {[1, 2, 3].map((slot) => (
              <TouchableOpacity
                key={slot}
                style={styles.powerUpSlot}
                onPress={() => setShowPowerUpModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.powerUpPlus}>+</Text>
                <Text style={styles.powerUpLabel}>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>🚀</Text>
            <Text style={styles.modalTitle}>
              Power-Ups Coming Soon
            </Text>
            <Text style={styles.modalDescription}>
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
    backgroundColor: colors.bgPrimary,
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.bgSecondary,
  },
  typeCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '1A',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  typeTextSelected: {
    color: colors.accent,
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
    backgroundColor: colors.bgSecondary,
  },
  goalCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '1A',
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
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  goalInfo: {
    gap: 2,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalTitleSelected: {
    color: colors.accent,
  },
  goalDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  repsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.bgTertiary,
  },
  repsBadgeSelected: {
    backgroundColor: colors.accent + '33',
  },
  repsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  repsTextSelected: {
    color: colors.accent,
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
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  powerUpPlus: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.textMuted,
  },
  powerUpLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  startButton: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  startButtonText: {
    color: colors.textPrimary,
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
    backgroundColor: colors.bgSecondary,
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
    color: colors.textPrimary,
  },
  modalDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    color: colors.textSecondary,
  },
  modalButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  modalButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
