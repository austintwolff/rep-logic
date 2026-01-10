import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { PointsResult } from '@/lib/points-engine';

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
  const [weight, setWeight] = useState(previousWeight?.toString() || '');
  const [reps, setReps] = useState('');
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [lastPoints, setLastPoints] = useState<PointsResult | null>(null);
  const pointsOpacity = useState(new Animated.Value(0))[0];
  const pointsScale = useState(new Animated.Value(0.5))[0];

  const isBodyweight = exerciseType === 'bodyweight';

  const handleLogSet = () => {
    const repsNum = parseInt(reps, 10);
    if (isNaN(repsNum) || repsNum <= 0) return;

    const weightNum = isBodyweight ? null : parseFloat(weight) || 0;
    const result = onLogSet(weightNum, repsNum);

    if (result) {
      setLastPoints(result);
      setShowPointsAnimation(true);

      // Animate points
      pointsOpacity.setValue(0);
      pointsScale.setValue(0.5);

      Animated.parallel([
        Animated.timing(pointsOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(pointsScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();

      // Fade out after delay
      setTimeout(() => {
        Animated.timing(pointsOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowPointsAnimation(false);
          setLastPoints(null);
        });
      }, 2000);

      // Reset reps for next set
      setReps('');

      // Start rest timer
      onStartRest(90);
    }
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || 0;
    const newWeight = Math.max(0, current + delta);
    setWeight(newWeight.toString());
  };

  const adjustReps = (delta: number) => {
    const current = parseInt(reps, 10) || 0;
    const newReps = Math.max(0, current + delta);
    setReps(newReps.toString());
  };

  return (
    <View style={styles.container}>
      {/* Previous Performance */}
      {(previousWeight || previousReps) && (
        <View style={[styles.previousContainer, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
          <FontAwesome name="history" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.previousText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Last time: {previousWeight ? `${previousWeight}kg x ` : ''}{previousReps} reps
          </Text>
        </View>
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
              Weight (kg)
            </Text>
            <View style={styles.inputWithButtons}>
              <TouchableOpacity
                style={[styles.adjustButton, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
                onPress={() => adjustWeight(-2.5)}
              >
                <FontAwesome name="minus" size={16} color={isDark ? '#F9FAFB' : '#111827'} />
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
                onPress={() => adjustWeight(2.5)}
              >
                <FontAwesome name="plus" size={16} color={isDark ? '#F9FAFB' : '#111827'} />
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
              <FontAwesome name="minus" size={16} color={isDark ? '#F9FAFB' : '#111827'} />
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
              <FontAwesome name="plus" size={16} color={isDark ? '#F9FAFB' : '#111827'} />
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
        <FontAwesome name="check" size={20} color="#FFFFFF" />
        <Text style={styles.logButtonText}>Log Set</Text>
      </TouchableOpacity>

      {/* Points Animation Overlay */}
      {showPointsAnimation && lastPoints && (
        <Animated.View
          style={[
            styles.pointsOverlay,
            {
              opacity: pointsOpacity,
              transform: [{ scale: pointsScale }],
            },
          ]}
        >
          <Text style={styles.pointsValue}>+{lastPoints.finalPoints}</Text>
          <Text style={styles.pointsLabel}>points</Text>
          {lastPoints.bonuses.length > 0 && (
            <View style={styles.bonusesContainer}>
              {lastPoints.bonuses.map((bonus, index) => (
                <Text key={index} style={styles.bonusText}>
                  {bonus.description}
                </Text>
              ))}
            </View>
          )}
        </Animated.View>
      )}
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
    borderRadius: 8,
    marginBottom: 16,
  },
  previousText: {
    fontSize: 14,
  },
  setLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
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
    gap: 8,
  },
  adjustButton: {
    width: 44,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberInput: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickRepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickRepButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 50,
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
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  pointsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pointsLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  bonusesContainer: {
    marginTop: 12,
  },
  bonusText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
});
