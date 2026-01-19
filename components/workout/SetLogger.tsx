import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { PointsResult } from '@/lib/points-engine';
import { useSettingsStore, getWeightIncrement } from '@/stores/settings.store';

interface SetLoggerProps {
  exerciseName: string;
  exerciseType: 'weighted' | 'bodyweight';
  setNumber: number;
  previousWeight?: number;
  previousReps?: number;
  onLogSet: (weight: number | null, reps: number) => PointsResult | null;
  onStartRest: (seconds: number) => void;
  isDark: boolean;
}

export default function SetLogger({
  exerciseName,
  exerciseType,
  setNumber,
  previousWeight,
  previousReps,
  onLogSet,
  onStartRest,
  isDark,
}: SetLoggerProps) {
  const { weightUnit } = useSettingsStore();
  const weightIncrement = getWeightIncrement(weightUnit);

  // previousWeight is now in display units (same as user's preferred unit)
  const [weight, setWeight] = useState(
    previousWeight !== undefined ? Math.round(previousWeight).toString() : ''
  );
  const [reps, setReps] = useState('');

  const isBodyweight = exerciseType === 'bodyweight';
  const hasPreviousSet = previousReps !== undefined && (isBodyweight || previousWeight !== undefined);

  const handleRepeatLastSet = () => {
    if (previousReps !== undefined) {
      setReps(previousReps.toString());
    }
    if (!isBodyweight && previousWeight !== undefined) {
      setWeight(Math.round(previousWeight).toString());
    }
  };

  const handleLogSet = () => {
    const repsNum = parseInt(reps, 10);
    if (isNaN(repsNum) || repsNum <= 0) return;

    // Use the display weight directly for points calculation (volume = weight × reps)
    // This way 100 lbs × 8 reps = 800 points, which is intuitive
    const weightNum = isBodyweight ? null : parseFloat(weight) || 0;
    console.log('[SetLogger] Logging set:', { weightNum, repsNum, weightUnit, rawWeight: weight });
    const result = onLogSet(weightNum, repsNum);

    if (result) {
      // Reset reps for next set
      setReps('');

      // Start rest timer
      onStartRest(90);
    }
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || 0;
    const newWeight = Math.max(0, current + delta);
    setWeight(Math.round(newWeight).toString());
  };

  const adjustReps = (delta: number) => {
    const current = parseInt(reps, 10) || 0;
    const newReps = Math.max(0, current + delta);
    setReps(newReps.toString());
  };

  return (
    <View style={styles.container}>
      {/* Previous Performance + Repeat Button */}
      {hasPreviousSet && (
        <TouchableOpacity
          style={[styles.previousContainer, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
          onPress={handleRepeatLastSet}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280' }}>↺</Text>
          <Text style={[styles.previousText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Last: {!isBodyweight && previousWeight ? `${Math.round(previousWeight)}${weightUnit} × ` : ''}{previousReps} reps
          </Text>
          <View style={styles.repeatBadge}>
            <Text style={styles.repeatBadgeText}>Tap to repeat</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Set Number */}
      <Text style={[styles.setLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        Set {setNumber}
      </Text>

      {/* Input Row */}
      <View style={styles.inputRow}>
        {/* Weight Input (if not bodyweight) */}
        {!isBodyweight && (
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Weight ({weightUnit})
            </Text>
            <View style={styles.inputWithButtons}>
              <TouchableOpacity
                style={[styles.adjustButton, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
                onPress={() => adjustWeight(-weightIncrement)}
              >
                <Text style={[styles.adjustButtonText, { color: isDark ? '#F9FAFB' : '#111827' }]}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    color: isDark ? '#F9FAFB' : '#111827',
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                  },
                ]}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              />
              <TouchableOpacity
                style={[styles.adjustButton, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
                onPress={() => adjustWeight(weightIncrement)}
              >
                <Text style={[styles.adjustButtonText, { color: isDark ? '#F9FAFB' : '#111827' }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reps Input */}
        <View style={[styles.inputGroup, isBodyweight && styles.inputGroupFull]}>
          <Text style={[styles.inputLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Reps
          </Text>
          <View style={styles.inputWithButtons}>
            <TouchableOpacity
              style={[styles.adjustButton, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
              onPress={() => adjustReps(-1)}
            >
              <Text style={[styles.adjustButtonText, { color: isDark ? '#F9FAFB' : '#111827' }]}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={[
                styles.numberInput,
                {
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  color: isDark ? '#F9FAFB' : '#111827',
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                },
              ]}
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            />
            <TouchableOpacity
              style={[styles.adjustButton, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
              onPress={() => adjustReps(1)}
            >
              <Text style={[styles.adjustButtonText, { color: isDark ? '#F9FAFB' : '#111827' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Quick Reps Buttons */}
      <View style={styles.quickRepsRow}>
        {[5, 8, 10, 12, 15].map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.quickRepButton,
              { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
              reps === num.toString() && styles.quickRepButtonActive,
            ]}
            onPress={() => setReps(num.toString())}
          >
            <Text
              style={[
                styles.quickRepText,
                { color: isDark ? '#F9FAFB' : '#111827' },
                reps === num.toString() && styles.quickRepTextActive,
              ]}
            >
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Log Set Button */}
      <TouchableOpacity
        style={[styles.logButton, !reps && styles.logButtonDisabled]}
        onPress={handleLogSet}
        disabled={!reps}
      >
        <Text style={styles.logButtonIcon}>✓</Text>
        <Text style={styles.logButtonText}>Log Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  previousContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  previousText: {
    fontSize: 14,
    flex: 1,
  },
  repeatBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  repeatBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  setLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
    minWidth: 0,
  },
  inputGroupFull: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adjustButton: {
    width: 36,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  numberInput: {
    flex: 1,
    height: 48,
    minWidth: 50,
    borderRadius: 10,
    borderWidth: 2,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  quickRepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6,
  },
  quickRepButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickRepButtonActive: {
    backgroundColor: '#10B981',
  },
  quickRepText: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickRepTextActive: {
    color: '#FFFFFF',
  },
  logButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 10,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
