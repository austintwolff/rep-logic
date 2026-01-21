import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Exercise } from '@/types/database';
import {
  calculateSetPoints,
  calculateWorkoutCompletionBonus,
  PointsResult,
  ExerciseBaselineData,
  POINTS_CONFIG,
  GoalBucket,
  checkForPR,
} from '@/lib/points-engine';

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  setType: 'warmup' | 'working' | 'dropset' | 'failure';
  weight: number | null;
  reps: number;
  isBodyweight: boolean;
  pointsEarned: number;
  isPR: boolean;
  completedAt: Date;
  muscleGroups: string[]; // All muscles this set worked
}

export interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  isCompleted: boolean; // Marked when user finishes and returns to deck
}

interface ActiveWorkout {
  id: string;
  name: string;
  goal: GoalBucket;
  startedAt: Date;
  exercises: WorkoutExercise[];
  totalPoints: number;
  totalVolume: number;
  muscleSetsCount: Map<string, number>; // Track sets per muscle group
}

interface WorkoutState {
  activeWorkout: ActiveWorkout | null;
  currentExerciseIndex: number;
  isRestTimerActive: boolean;
  restTimeRemaining: number;
  lastPointsResult: PointsResult | null;
  exerciseBaselines: Map<string, ExerciseBaselineData>; // Loaded baselines

  // Actions
  startWorkout: (name: string, goal: GoalBucket) => void;
  endWorkout: () => { workout: ActiveWorkout; completionBonus: number } | null;
  cancelWorkout: () => void;

  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: string) => void;
  setCurrentExercise: (index: number) => void;
  markExerciseCompleted: (exerciseId: string) => void;

  setExerciseBaselines: (baselines: Map<string, ExerciseBaselineData>) => void;

  logSet: (params: {
    weight: number | null;
    reps: number;
    setType?: 'warmup' | 'working' | 'dropset' | 'failure';
    userBodyweight: number;
    currentStreak: number;
    muscleGroups?: string[]; // For compound exercises
  }) => PointsResult | null;

  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  tickRestTimer: () => void;
  clearLastPointsResult: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeWorkout: null,
  currentExerciseIndex: 0,
  isRestTimerActive: false,
  restTimeRemaining: 0,
  lastPointsResult: null,
  exerciseBaselines: new Map(),

  startWorkout: (name: string, goal: GoalBucket) => {
    set({
      activeWorkout: {
        id: uuidv4(),
        name,
        goal,
        startedAt: new Date(),
        exercises: [],
        totalPoints: 0,
        totalVolume: 0,
        muscleSetsCount: new Map(),
      },
      currentExerciseIndex: 0,
      isRestTimerActive: false,
      restTimeRemaining: 0,
      lastPointsResult: null,
    });
  },

  endWorkout: () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return null;

    const durationMinutes = Math.floor(
      (new Date().getTime() - activeWorkout.startedAt.getTime()) / 60000
    );

    const totalSets = activeWorkout.exercises.reduce(
      (sum, ex) => sum + ex.sets.length,
      0
    );

    const completionResult = calculateWorkoutCompletionBonus({
      totalSets,
      durationMinutes,
      exerciseCount: activeWorkout.exercises.length,
    });

    const finalWorkout = {
      ...activeWorkout,
      totalPoints: activeWorkout.totalPoints + completionResult.bonusPoints,
    };

    set({
      activeWorkout: null,
      currentExerciseIndex: 0,
      isRestTimerActive: false,
      restTimeRemaining: 0,
      lastPointsResult: null,
    });

    return { workout: finalWorkout, completionBonus: completionResult.bonusPoints };
  },

  cancelWorkout: () => {
    set({
      activeWorkout: null,
      currentExerciseIndex: 0,
      isRestTimerActive: false,
      restTimeRemaining: 0,
      lastPointsResult: null,
    });
  },

  addExercise: (exercise: Exercise) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const workoutExercise: WorkoutExercise = {
      id: uuidv4(),
      exercise,
      sets: [],
      isCompleted: false,
    };

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: [...activeWorkout.exercises, workoutExercise],
      },
      currentExerciseIndex: activeWorkout.exercises.length,
    });
  },

  removeExercise: (exerciseId: string) => {
    const { activeWorkout, currentExerciseIndex } = get();
    if (!activeWorkout) return;

    const newExercises = activeWorkout.exercises.filter(
      (ex) => ex.id !== exerciseId
    );

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: newExercises,
      },
      currentExerciseIndex: Math.min(
        currentExerciseIndex,
        Math.max(0, newExercises.length - 1)
      ),
    });
  },

  setCurrentExercise: (index: number) => {
    set({ currentExerciseIndex: index });
  },

  markExerciseCompleted: (exerciseId: string) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((ex) => {
      if (ex.id === exerciseId) {
        return { ...ex, isCompleted: true };
      }
      return ex;
    });

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: updatedExercises,
      },
    });
  },

  setExerciseBaselines: (baselines: Map<string, ExerciseBaselineData>) => {
    set({ exerciseBaselines: baselines });
  },

  logSet: (params) => {
    console.log('[WorkoutStore] logSet called with:', { weight: params.weight, reps: params.reps });
    const { activeWorkout, currentExerciseIndex, exerciseBaselines } = get();
    if (!activeWorkout || activeWorkout.exercises.length === 0) return null;

    const currentExercise = activeWorkout.exercises[currentExerciseIndex];
    if (!currentExercise) return null;

    const exercise = currentExercise.exercise;
    const isBodyweight = exercise.exercise_type === 'bodyweight';
    const primaryMuscle = exercise.muscle_group;

    // Determine all muscle groups this set works
    const muscleGroups = params.muscleGroups?.length
      ? params.muscleGroups
      : [primaryMuscle];

    // Get current set count for primary muscle (for volume scaling)
    const currentMuscleSets = activeWorkout.muscleSetsCount.get(primaryMuscle) || 0;

    // Get baseline for this exercise
    const baseline = exerciseBaselines.get(exercise.id) || null;

    // Calculate points
    const pointsResult = calculateSetPoints(
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseType: exercise.exercise_type as 'weighted' | 'bodyweight',
        isCompound: exercise.is_compound,
        primaryMuscle,
        weight: params.weight,
        reps: params.reps,
        setNumberInWorkout: currentExercise.sets.length + 1,
        setsForMuscleInWorkout: currentMuscleSets + 1,
        userBodyweight: params.userBodyweight,
      },
      baseline,
      params.currentStreak
    );

    // Check for PR within the workout's goal bucket
    const effectiveWeight = isBodyweight
      ? params.userBodyweight * POINTS_CONFIG.BODYWEIGHT_FACTOR
      : (params.weight || 0);
    const prResult = checkForPR(effectiveWeight, params.reps, activeWorkout.goal, baseline);

    const newSet: WorkoutSet = {
      id: uuidv4(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      setNumber: currentExercise.sets.length + 1,
      setType: params.setType || 'working',
      weight: params.weight,
      reps: params.reps,
      isBodyweight,
      pointsEarned: pointsResult.finalPoints,
      isPR: prResult.isPR,
      completedAt: new Date(),
      muscleGroups,
    };

    // Calculate volume
    const setVolume = isBodyweight
      ? params.userBodyweight * POINTS_CONFIG.BODYWEIGHT_FACTOR * params.reps
      : (params.weight || 0) * params.reps;

    const updatedExercises = activeWorkout.exercises.map((ex, index) => {
      if (index === currentExerciseIndex) {
        return {
          ...ex,
          sets: [...ex.sets, newSet],
        };
      }
      return ex;
    });

    // Update muscle set counts for all muscles worked
    const newMuscleSetsCount = new Map(activeWorkout.muscleSetsCount);
    for (const muscle of muscleGroups) {
      newMuscleSetsCount.set(muscle, (newMuscleSetsCount.get(muscle) || 0) + 1);
    }

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: updatedExercises,
        totalPoints: activeWorkout.totalPoints + pointsResult.finalPoints,
        totalVolume: activeWorkout.totalVolume + setVolume,
        muscleSetsCount: newMuscleSetsCount,
      },
      lastPointsResult: pointsResult,
    });

    return pointsResult;
  },

  startRestTimer: (seconds: number) => {
    set({
      isRestTimerActive: true,
      restTimeRemaining: seconds,
    });
  },

  stopRestTimer: () => {
    set({
      isRestTimerActive: false,
      restTimeRemaining: 0,
    });
  },

  tickRestTimer: () => {
    const { restTimeRemaining, isRestTimerActive } = get();
    if (!isRestTimerActive) return;

    if (restTimeRemaining <= 1) {
      set({
        isRestTimerActive: false,
        restTimeRemaining: 0,
      });
    } else {
      set({
        restTimeRemaining: restTimeRemaining - 1,
      });
    }
  },

  clearLastPointsResult: () => {
    set({ lastPointsResult: null });
  },
}));
