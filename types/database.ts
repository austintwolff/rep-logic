export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bodyweight_kg: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bodyweight_kg?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bodyweight_kg?: number | null;
          updated_at?: string;
        };
      };
      user_stats: {
        Row: {
          user_id: string;
          total_points: number;
          weekly_points: number;
          current_workout_streak: number;
          longest_workout_streak: number;
          total_workouts: number;
          total_volume_kg: number;
          current_overload_streak: number;
          last_workout_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_points?: number;
          weekly_points?: number;
          current_workout_streak?: number;
          longest_workout_streak?: number;
          total_workouts?: number;
          total_volume_kg?: number;
          current_overload_streak?: number;
          last_workout_at?: string | null;
          updated_at?: string;
        };
        Update: {
          total_points?: number;
          weekly_points?: number;
          current_workout_streak?: number;
          longest_workout_streak?: number;
          total_workouts?: number;
          total_volume_kg?: number;
          current_overload_streak?: number;
          last_workout_at?: string | null;
          updated_at?: string;
        };
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          exercise_type: 'weighted' | 'bodyweight';
          muscle_group: string;
          equipment: string[] | null;
          is_compound: boolean;
          created_by: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          exercise_type: 'weighted' | 'bodyweight';
          muscle_group: string;
          equipment?: string[] | null;
          is_compound?: boolean;
          created_by?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          exercise_type?: 'weighted' | 'bodyweight';
          muscle_group?: string;
          equipment?: string[] | null;
          is_compound?: boolean;
          is_public?: boolean;
        };
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          started_at: string;
          completed_at: string | null;
          duration_seconds: number | null;
          notes: string | null;
          total_volume_kg: number;
          total_points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          started_at?: string;
          completed_at?: string | null;
          duration_seconds?: number | null;
          notes?: string | null;
          total_volume_kg?: number;
          total_points?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          completed_at?: string | null;
          duration_seconds?: number | null;
          notes?: string | null;
          total_volume_kg?: number;
          total_points?: number;
        };
      };
      workout_sets: {
        Row: {
          id: string;
          workout_session_id: string;
          exercise_id: string;
          set_number: number;
          set_type: 'warmup' | 'working' | 'dropset' | 'failure';
          weight_kg: number | null;
          reps: number;
          rpe: number | null;
          is_bodyweight: boolean;
          points_earned: number;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_session_id: string;
          exercise_id: string;
          set_number: number;
          set_type?: 'warmup' | 'working' | 'dropset' | 'failure';
          weight_kg?: number | null;
          reps: number;
          rpe?: number | null;
          is_bodyweight?: boolean;
          points_earned?: number;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          set_number?: number;
          set_type?: 'warmup' | 'working' | 'dropset' | 'failure';
          weight_kg?: number | null;
          reps?: number;
          rpe?: number | null;
          points_earned?: number;
        };
      };
      point_transactions: {
        Row: {
          id: string;
          user_id: string;
          workout_session_id: string | null;
          workout_set_id: string | null;
          transaction_type: string;
          base_points: number;
          multiplier: number;
          final_points: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_session_id?: string | null;
          workout_set_id?: string | null;
          transaction_type: string;
          base_points: number;
          multiplier?: number;
          final_points: number;
          description?: string | null;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserStats = Database['public']['Tables']['user_stats']['Row'];
export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row'];
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row'];
export type PointTransaction = Database['public']['Tables']['point_transactions']['Row'];
