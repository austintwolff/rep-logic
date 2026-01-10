import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  SafeAreaView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DEFAULT_EXERCISES, MUSCLE_GROUPS, ExerciseDefinition } from '@/constants/exercises';
import { Exercise } from '@/types/database';

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

  const filteredExercises = useMemo(() => {
    return DEFAULT_EXERCISES.filter((exercise) => {
      const matchesSearch = exercise.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesMuscle =
        !selectedMuscleGroup || exercise.muscleGroup === selectedMuscleGroup;
      return matchesSearch && matchesMuscle;
    });
  }, [searchQuery, selectedMuscleGroup]);

  const handleSelectExercise = (exerciseDef: ExerciseDefinition) => {
    // Convert ExerciseDefinition to Exercise type
    const exercise: Exercise = {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: exerciseDef.name,
      description: exerciseDef.description,
      exercise_type: exerciseDef.exerciseType,
      muscle_group: exerciseDef.muscleGroup,
      equipment: exerciseDef.equipment,
      is_compound: exerciseDef.isCompound,
      created_by: null,
      is_public: true,
      created_at: new Date().toISOString(),
    };

    onSelectExercise(exercise);
    onClose();
    setSearchQuery('');
    setSelectedMuscleGroup(null);
  };

  const renderExercise = ({ item }: { item: ExerciseDefinition }) => (
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
            {item.muscleGroup}
          </Text>
          <Text style={[styles.exerciseType, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {item.exerciseType === 'bodyweight' ? 'Bodyweight' : 'Weighted'}
          </Text>
        </View>
      </View>
      <FontAwesome name="plus-circle" size={24} color="#10B981" />
    </TouchableOpacity>
  );

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
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.name}
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
});
