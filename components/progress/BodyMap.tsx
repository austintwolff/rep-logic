import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

interface MuscleData {
  muscle_group: string;
  current_level: number;
}

interface BodyMapProps {
  muscleLevels: MuscleData[];
  isDark: boolean;
}

// Color based on level (0-50)
const getLevelColor = (level: number): string => {
  if (level === 0) return '#374151'; // Gray for untrained
  if (level < 5) return '#6EE7B7';   // Light green
  if (level < 10) return '#34D399';  // Green
  if (level < 20) return '#10B981';  // Emerald
  if (level < 30) return '#059669';  // Dark emerald
  if (level < 40) return '#047857';  // Darker
  return '#065F46';                   // Max level - darkest
};

// Muscle group positions for the simplified body map
const MUSCLE_POSITIONS: Record<string, { x: number; y: number; front: boolean }> = {
  // Front view (left side)
  'shoulders': { x: 28, y: 52, front: true },
  'chest': { x: 50, y: 65, front: true },
  'biceps': { x: 22, y: 78, front: true },
  'forearms': { x: 18, y: 105, front: true },
  'core': { x: 50, y: 95, front: true },
  'quads': { x: 42, y: 145, front: true },
  'calves': { x: 42, y: 195, front: true },
  // Back view (right side)
  'upper back': { x: 150, y: 55, front: false },
  'lower back': { x: 150, y: 90, front: false },
  'triceps': { x: 178, y: 78, front: false },
  'glutes': { x: 150, y: 115, front: false },
  'hamstrings': { x: 158, y: 155, front: false },
};

export default function BodyMap({ muscleLevels, isDark }: BodyMapProps) {
  const getMuscleLevel = (muscleGroup: string): number => {
    const muscle = muscleLevels.find(
      m => m.muscle_group.toLowerCase() === muscleGroup.toLowerCase()
    );
    return muscle?.current_level || 0;
  };

  const baseColor = isDark ? '#1F2937' : '#E5E7EB';
  const textColor = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View style={styles.container}>
      <View style={styles.bodyContainer}>
        {/* Front View */}
        <View style={styles.viewSection}>
          <Text style={[styles.viewLabel, { color: textColor }]}>FRONT</Text>
          <Svg width={100} height={220} viewBox="0 0 100 220">
            {/* Head */}
            <Path
              d="M50 8 C60 8, 65 15, 65 25 C65 35, 60 42, 50 42 C40 42, 35 35, 35 25 C35 15, 40 8, 50 8"
              fill={baseColor}
            />
            {/* Neck */}
            <Path d="M45 42 L55 42 L55 50 L45 50 Z" fill={baseColor} />
            {/* Shoulders */}
            <Path
              d="M25 50 C35 48, 45 50, 50 50 C55 50, 65 48, 75 50 L75 60 C65 58, 55 60, 50 60 C45 60, 35 58, 25 60 Z"
              fill={getLevelColor(getMuscleLevel('shoulders'))}
            />
            {/* Chest */}
            <Path
              d="M32 60 L68 60 L68 85 C68 90, 60 95, 50 95 C40 95, 32 90, 32 85 Z"
              fill={getLevelColor(getMuscleLevel('chest'))}
            />
            {/* Arms - Biceps */}
            <G>
              <Path
                d="M25 60 L32 60 L32 95 L22 95 C20 85, 22 70, 25 60"
                fill={getLevelColor(getMuscleLevel('biceps'))}
              />
              <Path
                d="M68 60 L75 60 C78 70, 80 85, 78 95 L68 95 Z"
                fill={getLevelColor(getMuscleLevel('biceps'))}
              />
            </G>
            {/* Forearms */}
            <G>
              <Path
                d="M22 95 L32 95 L30 130 L18 130 C16 115, 18 105, 22 95"
                fill={getLevelColor(getMuscleLevel('forearms'))}
              />
              <Path
                d="M68 95 L78 95 C82 105, 84 115, 82 130 L70 130 Z"
                fill={getLevelColor(getMuscleLevel('forearms'))}
              />
            </G>
            {/* Core/Abs */}
            <Path
              d="M38 95 L62 95 L62 125 C62 130, 55 135, 50 135 C45 135, 38 130, 38 125 Z"
              fill={getLevelColor(getMuscleLevel('core'))}
            />
            {/* Quads */}
            <G>
              <Path
                d="M38 135 L50 135 L48 180 L35 180 C33 160, 35 145, 38 135"
                fill={getLevelColor(getMuscleLevel('quads'))}
              />
              <Path
                d="M50 135 L62 135 C65 145, 67 160, 65 180 L52 180 Z"
                fill={getLevelColor(getMuscleLevel('quads'))}
              />
            </G>
            {/* Calves */}
            <G>
              <Path
                d="M35 185 L48 185 L46 215 L37 215 C35 205, 34 195, 35 185"
                fill={getLevelColor(getMuscleLevel('calves'))}
              />
              <Path
                d="M52 185 L65 185 C66 195, 65 205, 63 215 L54 215 Z"
                fill={getLevelColor(getMuscleLevel('calves'))}
              />
            </G>
          </Svg>
        </View>

        {/* Back View */}
        <View style={styles.viewSection}>
          <Text style={[styles.viewLabel, { color: textColor }]}>BACK</Text>
          <Svg width={100} height={220} viewBox="0 0 100 220">
            {/* Head */}
            <Path
              d="M50 8 C60 8, 65 15, 65 25 C65 35, 60 42, 50 42 C40 42, 35 35, 35 25 C35 15, 40 8, 50 8"
              fill={baseColor}
            />
            {/* Neck */}
            <Path d="M45 42 L55 42 L55 50 L45 50 Z" fill={baseColor} />
            {/* Shoulders (back) */}
            <Path
              d="M25 50 C35 48, 45 50, 50 50 C55 50, 65 48, 75 50 L75 60 C65 58, 55 60, 50 60 C45 60, 35 58, 25 60 Z"
              fill={getLevelColor(getMuscleLevel('shoulders'))}
            />
            {/* Upper Back */}
            <Path
              d="M32 60 L68 60 L68 90 L32 90 Z"
              fill={getLevelColor(getMuscleLevel('upper back'))}
            />
            {/* Lower Back */}
            <Path
              d="M38 90 L62 90 L62 120 L38 120 Z"
              fill={getLevelColor(getMuscleLevel('lower back'))}
            />
            {/* Arms - Triceps */}
            <G>
              <Path
                d="M25 60 L32 60 L32 95 L22 95 C20 85, 22 70, 25 60"
                fill={getLevelColor(getMuscleLevel('triceps'))}
              />
              <Path
                d="M68 60 L75 60 C78 70, 80 85, 78 95 L68 95 Z"
                fill={getLevelColor(getMuscleLevel('triceps'))}
              />
            </G>
            {/* Forearms (back) */}
            <G>
              <Path
                d="M22 95 L32 95 L30 130 L18 130 C16 115, 18 105, 22 95"
                fill={getLevelColor(getMuscleLevel('forearms'))}
              />
              <Path
                d="M68 95 L78 95 C82 105, 84 115, 82 130 L70 130 Z"
                fill={getLevelColor(getMuscleLevel('forearms'))}
              />
            </G>
            {/* Glutes */}
            <Path
              d="M38 120 L62 120 L65 145 L35 145 Z"
              fill={getLevelColor(getMuscleLevel('glutes'))}
            />
            {/* Hamstrings */}
            <G>
              <Path
                d="M35 145 L50 145 L48 185 L33 185 C31 170, 32 155, 35 145"
                fill={getLevelColor(getMuscleLevel('hamstrings'))}
              />
              <Path
                d="M50 145 L65 145 C68 155, 69 170, 67 185 L52 185 Z"
                fill={getLevelColor(getMuscleLevel('hamstrings'))}
              />
            </G>
            {/* Calves (back) */}
            <G>
              <Path
                d="M33 190 L48 190 L46 215 L35 215 C33 208, 32 198, 33 190"
                fill={getLevelColor(getMuscleLevel('calves'))}
              />
              <Path
                d="M52 190 L67 190 C68 198, 67 208, 65 215 L54 215 Z"
                fill={getLevelColor(getMuscleLevel('calves'))}
              />
            </G>
          </Svg>
        </View>
      </View>

      {/* Level Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#374151' }]} />
          <Text style={[styles.legendText, { color: textColor }]}>0</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#6EE7B7' }]} />
          <Text style={[styles.legendText, { color: textColor }]}>1-4</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#34D399' }]} />
          <Text style={[styles.legendText, { color: textColor }]}>5-9</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.legendText, { color: textColor }]}>10-19</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#059669' }]} />
          <Text style={[styles.legendText, { color: textColor }]}>20+</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  bodyContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  viewSection: {
    alignItems: 'center',
  },
  viewLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
