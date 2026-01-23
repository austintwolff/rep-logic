import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores/auth.store';
import { getUserRunes } from '@/services/workout.service';
import { RUNE_DEFINITIONS, getRuneById } from '@/lib/runes';

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
  const { user } = useAuthStore();

  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalMode | null>(null);
  const [showRuneModal, setShowRuneModal] = useState(false);
  const [selectedRuneId, setSelectedRuneId] = useState<string | null>(null);
  const [userRunes, setUserRunes] = useState<{ runeId: string; equipped: boolean }[]>([]);
  const [isLoadingRunes, setIsLoadingRunes] = useState(true);

  // Fetch user's unlocked runes
  useEffect(() => {
    async function loadUserRunes() {
      if (!user?.id) {
        setIsLoadingRunes(false);
        return;
      }

      try {
        const runes = await getUserRunes(user.id);
        setUserRunes(runes);
        // Auto-select the first equipped rune, or the first rune if none equipped
        const equippedRune = runes.find(r => r.equipped);
        if (equippedRune) {
          setSelectedRuneId(equippedRune.runeId);
        } else if (runes.length > 0) {
          setSelectedRuneId(runes[0].runeId);
        }
      } catch (error) {
        console.error('Error loading user runes:', error);
      } finally {
        setIsLoadingRunes(false);
      }
    }

    loadUserRunes();
  }, [user?.id]);

  const canStart = selectedType !== null && selectedGoal !== null;

  const handleStartWorkout = () => {
    if (!canStart) return;

    const workoutName = selectedType === 'Full Body' ? 'Full Body' : `${selectedType} Day`;
    const runeParam = selectedRuneId ? `&rune=${encodeURIComponent(selectedRuneId)}` : '';
    router.replace(
      `/workout/deck?name=${encodeURIComponent(workoutName)}&goal=${encodeURIComponent(selectedGoal!)}${runeParam}`
    );
  };

  // Get the selected rune definition for display
  const selectedRune = selectedRuneId ? getRuneById(selectedRuneId) : null;

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

        {/* Runes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Rune
          </Text>
          {isLoadingRunes ? (
            <View style={styles.runeLoadingContainer}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : userRunes.length === 0 ? (
            <View style={styles.runeEmptyContainer}>
              <Text style={styles.runeEmptyText}>No runes unlocked yet</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.runeSlot,
                selectedRune && styles.runeSlotSelected,
              ]}
              onPress={() => setShowRuneModal(true)}
              activeOpacity={0.7}
            >
              {selectedRune ? (
                <>
                  <Text style={styles.runeIcon}>🔮</Text>
                  <View style={styles.runeInfo}>
                    <Text style={styles.runeName}>{selectedRune.name}</Text>
                    <Text style={styles.runeDescription}>{selectedRune.description}</Text>
                  </View>
                  <Text style={styles.runeChangeText}>Change</Text>
                </>
              ) : (
                <>
                  <Text style={styles.runePlus}>+</Text>
                  <Text style={styles.runeLabel}>Select a Rune</Text>
                </>
              )}
            </TouchableOpacity>
          )}
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

      {/* Rune Selection Modal */}
      <Modal
        visible={showRuneModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRuneModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRuneModal(false)}
        >
          <View style={styles.runeModalContent}>
            <Text style={styles.runeModalTitle}>Select a Rune</Text>
            <Text style={styles.runeModalSubtitle}>
              Runes provide bonuses to your entire workout
            </Text>
            <ScrollView style={styles.runeList} showsVerticalScrollIndicator={false}>
              {userRunes.map(({ runeId }) => {
                const rune = getRuneById(runeId);
                if (!rune) return null;
                const isSelected = selectedRuneId === runeId;
                return (
                  <TouchableOpacity
                    key={runeId}
                    style={[
                      styles.runeOption,
                      isSelected && styles.runeOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedRuneId(runeId);
                      setShowRuneModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.runeOptionLeft}>
                      <Text style={styles.runeOptionIcon}>🔮</Text>
                      <View style={styles.runeOptionInfo}>
                        <Text style={[
                          styles.runeOptionName,
                          isSelected && styles.runeOptionNameSelected,
                        ]}>
                          {rune.name}
                        </Text>
                        <Text style={styles.runeOptionDescription}>
                          {rune.description}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={styles.runeCheckmark}>
                        <Text style={styles.runeCheckmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.runeModalCloseButton}
              onPress={() => setShowRuneModal(false)}
            >
              <Text style={styles.runeModalCloseText}>Cancel</Text>
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
  // Runes
  runeLoadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  runeEmptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
  },
  runeEmptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  runeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    gap: 12,
  },
  runeSlotSelected: {
    borderStyle: 'solid',
    borderColor: colors.accent,
    backgroundColor: colors.accent + '1A',
  },
  runeIcon: {
    fontSize: 28,
  },
  runeInfo: {
    flex: 1,
    gap: 2,
  },
  runeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  runeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  runeChangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  runePlus: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.textMuted,
  },
  runeLabel: {
    fontSize: 14,
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
    padding: 20,
  },
  // Rune Modal
  runeModalContent: {
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
  },
  runeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  runeModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 20,
  },
  runeList: {
    maxHeight: 300,
  },
  runeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.bgTertiary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  runeOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '1A',
  },
  runeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  runeOptionIcon: {
    fontSize: 24,
  },
  runeOptionInfo: {
    flex: 1,
    gap: 2,
  },
  runeOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  runeOptionNameSelected: {
    color: colors.accent,
  },
  runeOptionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  runeCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runeCheckmarkText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  runeModalCloseButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  runeModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
