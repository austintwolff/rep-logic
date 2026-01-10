import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Exercise } from '@/types/database';
import {
  calculateSetPoints,
  calculateWorkoutCompletionBonus,
  calculateNewStreak,
  PointsResult,
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
  completedAt: Date;
}

export interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: WorkoutSet[];
}

interface ActiveWorkout {
  id: string;
  name: string;
  startedAt: Date;
  exercises: WorkoutExercise[];
  totalPoints: number;
  totalVolume: number;
}

interface WorkoutState {
  activeWorkout: ActiveWorkout | null;
  currentExerciseIndex: number;
  isRestTimerActive: boolean;
  restTimeRemaining: number;
  lastPointsResult: PointsResult | null;

  // Actions
  startWorkout: (name: string) => void;
  endWorkout: () => { workout: ActiveWorkout; completionBonus: number } | null;
  cancelWorkout: () => void;

  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: string) => void;
  setCurrentExercise: (index: number) => void;

  logSet: (params: {
    weight: number | null;
    reps: number;
    setType?: 'warmup' | 'working' | 'dropset' | 'failure';
    userBodyweight: number;
    currentStreak: number;
    previousBest?: { weight: number; reps: number; oneRepMax: number } | null;
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

  startWorkout: (name: string) => {
    set({
      activeWorkout: {
        id: uuidv4(),
        name,
        startedAt: new Date(),
        exercises: [],
        totalPoints: 0,
        totalVolume: 0,
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

    const completionBonus = calculateWorkoutCompletionBonus({
      totalSets,
      durationMinutes,
    });

    const finalWorkout = {
      ...activeWorkout,
      totalPoints: activeWorkout.totalPoints + completionBonus,
    };

    set({
      activeWorkout: null,
      currentExerciseIndex: 0,
      isRestTimerActive: false,
      restTimeRemaining: 0,
      lastPointsResult: null,
    });

    return { workout: finalWorkout, completionBonus };
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

  logSet: (params) => {
    const { activeWorkout, currentExerciseIndex } = get();
    if (!activeWorkout || activeWorkout.exercises.length === 0) return null;

    const currentExercise = activeWorkout.exercises[currentExerciseIndex];
    if (!currentExercise) return null;

    const exercise = currentExercise.exercise;
    const isBodyweight = exercise.exercise_type === 'bodyweight';

    // Calculate points
    const pointsResult = calculateSetPoints(
      {
        exerciseId: exercise.id,
        exerciseType: exercise.exercise_type as 'weighted' | 'bodyweight',
        weight: params.weight,
        reps: params.reps,
        userBodyweight: params.userBodyweight,
        previousBest: params.previousBest || null,
      },
      {
        currentStreak: params.currentStreak,
        bodyweight: params.userBodyweight,
      }
    );

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
      completedAt: new Date(),
    };

    // Calculate volume
    const setVolume = isBodyweight
      ? params.userBodyweight * 0.65 * params.reps
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

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: updatedExercises,
        totalPoints: activeWorkout.totalPoints + pointsResult.finalPoints,
        totalVolume: activeWorkout.totalVolume + setVolume,
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
