import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { DEFAULT_EXERCISES, MUSCLE_GROUPS, ExerciseDefinition } from '@/constants/exercises';
import { Exercise } from '@/types/database';
import { fetchExercisesFromDatabase } from '@/services/workout.service';

// Module-level cache to persist exercises across modal opens
let cachedExercises: Exercise[] | null = null;
let isFetching = false;

// Map workout types to relevant muscle groups
const WORKOUT_MUSCLE_MAP: Record<string, string[]> = {
  'Push Day': ['Chest', 'Shoulders', 'Triceps'],
  'Pull Day': ['Back', 'Biceps', 'Forearms'],
  'Leg Day': ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'],
  'Upper Body': ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
  'Lower Body': ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'],
  'Full Body': [], // Empty means all
};

// Get short label for workout type filter
const getWorkoutFilterLabel = (workoutName: string): string => {
  if (workoutName.includes('Push')) return 'Push';
  if (workoutName.includes('Pull')) return 'Pull';
  if (workoutName.includes('Leg')) return 'Legs';
  if (workoutName.includes('Upper')) return 'Upper';
  if (workoutName.includes('Lower')) return 'Lower';
  if (workoutName.includes('Full')) return 'Full Body';
  return workoutName;
};

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  isDark: boolean;
  workoutName?: string;
}

export default function ExercisePicker({
  visible,
  onClose,
  onSelectExercise,
  isDark,
  workoutName,
}: ExercisePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // 'workout' = workout-specific filter, null = all, string = specific muscle group
  const [selectedFilter, setSelectedFilter] = useState<'workout' | null | string>('workout');
  const [databaseExercises, setDatabaseExercises] = useState<Exercise[]>(cachedExercises || []);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);

  // Get muscles for the current workout type
  const workoutMuscles = useMemo(() => {
    if (!workoutName) return [];
    // Find matching workout type
    for (const [key, muscles] of Object.entries(WORKOUT_MUSCLE_MAP)) {
      if (workoutName.toLowerCase().includes(key.toLowerCase().split(' ')[0])) {
        return muscles;
      }
    }
    return [];
  }, [workoutName]);

  // Reset filter when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedFilter(workoutMuscles.length > 0 ? 'workout' : null);
      setSearchQuery('');
    }
  }, [visible, workoutMuscles.length]);

  // Fetch exercises from database when modal opens (only if not cached)
  useEffect(() => {
    if (visible && !cachedExercises && !isFetching) {
      loadExercisesFromDatabase();
    }
  }, [visible]);

  const loadExercisesFromDatabase = async () => {
    isFetching = true;
    setIsLoadingExercises(true);
    try {
      const exercises = await fetchExercisesFromDatabase();
      if (exercises.length > 0) {
        cachedExercises = exercises;
        setDatabaseExercises(exercises);
      }
    } catch (error) {
      console.error('Failed to fetch exercises from database:', error);
    } finally {
      isFetching = false;
      setIsLoadingExercises(false);
    }
  };

  // Combine database exercises with local exercises, removing duplicates
  const allExercises = useMemo(() => {
    // Convert local exercises to Exercise format
    const localAsExercises: Exercise[] = DEFAULT_EXERCISES.map((def) => ({
      id: `local-${def.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: def.name,
      description: def.description,
      exercise_type: def.exerciseType,
      muscle_group: def.muscleGroup,
      equipment: def.equipment,
      is_compound: def.isCompound,
      created_by: null,
      is_public: true,
      created_at: new Date().toISOString(),
    }));

    // If we have database exercises, merge with local (database takes precedence for duplicates)
    if (databaseExercises.length > 0) {
      const dbNames = new Set(databaseExercises.map(e => e.name.toLowerCase()));
      const uniqueLocal = localAsExercises.filter(e => !dbNames.has(e.name.toLowerCase()));
      return [...databaseExercises, ...uniqueLocal];
    }

    return localAsExercises;
  }, [databaseExercises]);

  const filteredExercises = useMemo(() => {
    const matchesMuscleFilter = (muscleGroup: string): boolean => {
      if (selectedFilter === null) return true; // All
      if (selectedFilter === 'workout') {
        // Match any muscle in the workout type
        return workoutMuscles.length === 0 || workoutMuscles.includes(muscleGroup);
      }
      // Specific muscle group
      return muscleGroup === selectedFilter;
    };

    return allExercises.filter((exercise) => {
      const matchesSearch = exercise.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesMuscle = matchesMuscleFilter(exercise.muscle_group);
      return matchesSearch && matchesMuscle;
    });
  }, [searchQuery, selectedFilter, workoutMuscles, allExercises]);

  const handleSelectExercise = (exercise: Exercise) => {
    onSelectExercise(exercise);
    onClose();
    setSearchQuery('');
  };

  const renderExercise = ({ item }: { item: Exercise }) => {
    return (
      <TouchableOpacity
        style={[styles.exerciseItem, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
        onPress={() => handleSelectExercise(item)}
      >
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {item.name}
          </Text>
          <View style={styles.exerciseMeta}>
            <Text style={[styles.muscleGroup, { color: '#10B981' }]}>
              {item.muscle_group}
            </Text>
            <Text style={[styles.exerciseType, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {item.exercise_type === 'bodyweight' ? 'Bodyweight' : 'Weighted'}
            </Text>
          </View>
        </View>
        <Text style={styles.addIcon}>⊕</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeIcon, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Add Exercise
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={[styles.searchIcon, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>🔍</Text>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                color: isDark ? '#F9FAFB' : '#111827',
              },
            ]}
            placeholder="Search exercises..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Muscle Group Filter */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              ...(workoutMuscles.length > 0 ? ['workout'] : []),
              'All',
              ...MUSCLE_GROUPS,
            ]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isActive =
                (item === 'workout' && selectedFilter === 'workout') ||
                (item === 'All' && selectedFilter === null) ||
                (item !== 'workout' && item !== 'All' && selectedFilter === item);

              const label = item === 'workout'
                ? getWorkoutFilterLabel(workoutName || '')
                : item;

              return (
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
                    isActive && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    if (item === 'workout') setSelectedFilter('workout');
                    else if (item === 'All') setSelectedFilter(null);
                    else setSelectedFilter(item);
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: isDark ? '#9CA3AF' : '#6B7280' },
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.filterList}
          />
        </View>

        {/* Exercise List - show exercises immediately, loading indicator is subtle */}
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          renderItem={renderExercise}
          contentContainerStyle={styles.exerciseList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            isLoadingExercises ? (
              <View style={styles.loadingBanner}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={[styles.loadingBannerText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  Loading more exercises...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyIcon, { color: isDark ? '#374151' : '#D1D5DB' }]}>🔍</Text>
              <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                No exercises found
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    fontSize: 24,
    fontWeight: '300',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 36,
    zIndex: 1,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 16,
  },
  filterContainer: {
    paddingBottom: 12,
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#10B981',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  exerciseList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  muscleGroup: {
    fontSize: 13,
    fontWeight: '500',
  },
  exerciseType: {
    fontSize: 13,
  },
  addIcon: {
    fontSize: 24,
    color: '#10B981',
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingBannerText: {
    fontSize: 14,
  },
});
