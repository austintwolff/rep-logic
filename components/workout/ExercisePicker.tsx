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
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DEFAULT_EXERCISES, MUSCLE_GROUPS, ExerciseDefinition } from '@/constants/exercises';
import { Exercise } from '@/types/database';
import { fetchExercisesFromDatabase } from '@/services/workout.service';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  isDark: boolean;
}

export default function ExercisePicker({
  visible,
  onClose,
  onSelectExercise,
  isDark,
}: ExercisePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [databaseExercises, setDatabaseExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [useDatabase, setUseDatabase] = useState(false);

  // Fetch exercises from database when modal opens
  useEffect(() => {
    if (visible && !useDatabase && databaseExercises.length === 0) {
      loadExercisesFromDatabase();
    }
  }, [visible]);

  const loadExercisesFromDatabase = async () => {
    setIsLoadingExercises(true);
    try {
      const exercises = await fetchExercisesFromDatabase();
      if (exercises.length > 0) {
        setDatabaseExercises(exercises);
        setUseDatabase(true);
      }
    } catch (error) {
      console.error('Failed to fetch exercises from database:', error);
    } finally {
      setIsLoadingExercises(false);
    }
  };

  const filteredExercises = useMemo(() => {
    if (useDatabase && databaseExercises.length > 0) {
      return databaseExercises.filter((exercise) => {
        const matchesSearch = exercise.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesMuscle =
          !selectedMuscleGroup || exercise.muscle_group === selectedMuscleGroup;
        return matchesSearch && matchesMuscle;
      });
    }

    // Fallback to local exercises
    return DEFAULT_EXERCISES.filter((exercise) => {
      const matchesSearch = exercise.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesMuscle =
        !selectedMuscleGroup || exercise.muscleGroup === selectedMuscleGroup;
      return matchesSearch && matchesMuscle;
    });
  }, [searchQuery, selectedMuscleGroup, useDatabase, databaseExercises]);

  const handleSelectExercise = (exerciseOrDef: Exercise | ExerciseDefinition) => {
    let exercise: Exercise;

    if ('exercise_type' in exerciseOrDef) {
      // Already an Exercise from database
      exercise = exerciseOrDef;
    } else {
      // Convert ExerciseDefinition to Exercise type
      exercise = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: exerciseOrDef.name,
        description: exerciseOrDef.description,
        exercise_type: exerciseOrDef.exerciseType,
        muscle_group: exerciseOrDef.muscleGroup,
        equipment: exerciseOrDef.equipment,
        is_compound: exerciseOrDef.isCompound,
        created_by: null,
        is_public: true,
        created_at: new Date().toISOString(),
      };
    }

    onSelectExercise(exercise);
    onClose();
    setSearchQuery('');
    setSelectedMuscleGroup(null);
  };

  const renderExercise = ({ item }: { item: Exercise | ExerciseDefinition }) => {
    const name = item.name;
    const muscleGroup = 'muscle_group' in item ? item.muscle_group : item.muscleGroup;
    const exerciseType = 'exercise_type' in item ? item.exercise_type : item.exerciseType;

    return (
      <TouchableOpacity
        style={[styles.exerciseItem, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
        onPress={() => handleSelectExercise(item)}
      >
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {name}
          </Text>
          <View style={styles.exerciseMeta}>
            <Text style={[styles.muscleGroup, { color: '#10B981' }]}>
              {muscleGroup}
            </Text>
            <Text style={[styles.exerciseType, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {exerciseType === 'bodyweight' ? 'Bodyweight' : 'Weighted'}
            </Text>
          </View>
        </View>
        <FontAwesome name="plus-circle" size={24} color="#10B981" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Add Exercise
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <FontAwesome
            name="search"
            size={16}
            color={isDark ? '#6B7280' : '#9CA3AF'}
            style={styles.searchIcon}
          />
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
            data={['All', ...MUSCLE_GROUPS]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
                  (item === 'All' ? !selectedMuscleGroup : selectedMuscleGroup === item) &&
                    styles.filterChipActive,
                ]}
                onPress={() =>
                  setSelectedMuscleGroup(item === 'All' ? null : item)
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isDark ? '#9CA3AF' : '#6B7280' },
                    (item === 'All' ? !selectedMuscleGroup : selectedMuscleGroup === item) &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.filterList}
          />
        </View>

        {/* Exercise List */}
        {isLoadingExercises ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Loading exercises...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => 'id' in item && item.id ? item.id : item.name}
            renderItem={renderExercise}
            contentContainerStyle={styles.exerciseList}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome name="search" size={48} color={isDark ? '#374151' : '#D1D5DB'} />
                <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  No exercises found
                </Text>
              </View>
            }
          />
        )}
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
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingLeft: 40,
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
  separator: {
    height: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
});
