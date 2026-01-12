import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, UserStats } from '@/types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userStats: UserStats | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  fetchUserStats: () => Promise<void>;
  refreshUserStats: () => Promise<void>;
  updateBodyweight: (bodyweightKg: number) => Promise<void>;
}

// MOCK DATA FOR TESTING (auth disabled)
const MOCK_PROFILE = {
  id: 'test-user-123',
  username: 'TestUser',
  display_name: 'Test User',
  avatar_url: null,
  bodyweight_kg: 75,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_USER_STATS = {
  user_id: 'test-user-123',
  total_points: 1250,
  weekly_points: 320,
  current_workout_streak: 5,
  longest_workout_streak: 12,
  total_workouts: 24,
  total_volume_kg: 45000,
  current_overload_streak: 3,
  last_workout_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
  updated_at: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  userStats: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isInitialized: true,
      });

      if (session?.user) {
        await get().fetchProfile();
        await get().fetchUserStats();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });

        if (session?.user) {
          await get().fetchProfile();
          await get().fetchUserStats();
        } else {
          set({ profile: null, userStats: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signUp: async (email: string, password: string, username: string) => {
    set({ isLoading: true });

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username,
        },
      },
    });

    if (error) {
      set({ isLoading: false });
      throw error;
    }

    set({ isLoading: false });
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    console.log('[Auth] Signing in...');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Sign in error:', error);
      set({ isLoading: false });
      throw error;
    }

    console.log('[Auth] Sign in successful, user:', data.session?.user?.id);

    // Set session directly from response (don't wait for onAuthStateChange)
    set({
      session: data.session,
      user: data.session?.user ?? null,
      isLoading: false,
    });

    // Fetch profile and stats
    if (data.session?.user) {
      console.log('[Auth] Fetching profile and stats...');
      await get().fetchProfile();
      await get().fetchUserStats();
      console.log('[Auth] Done fetching profile and stats');
    }
  },

  signOut: async () => {
    set({ isLoading: true });

    const { error } = await supabase.auth.signOut();

    if (error) {
      set({ isLoading: false });
      throw error;
    }

    set({
      session: null,
      user: null,
      profile: null,
      userStats: null,
      isLoading: false,
    });
  },

  fetchProfile: async () => {
    const user = get().user;
    if (!user) {
      console.log('[Auth] fetchProfile: No user');
      return;
    }

    console.log('[Auth] Fetching profile for user:', user.id);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[Auth] Error fetching profile:', error);
      // If profile doesn't exist, try to create it from user metadata
      if (error.code === 'PGRST116') {
        console.log('[Auth] Profile not found, creating from user metadata');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
            display_name: user.user_metadata?.display_name || user.user_metadata?.username || 'Athlete',
          })
          .select()
          .single();

        if (createError) {
          console.error('[Auth] Error creating profile:', createError);
          return;
        }
        console.log('[Auth] Created profile:', newProfile);
        set({ profile: newProfile });
      }
      return;
    }

    console.log('[Auth] Fetched profile:', data);
    set({ profile: data });
  },

  fetchUserStats: async () => {
    const user = get().user;
    if (!user) {
      console.log('[Auth] fetchUserStats: No user');
      return;
    }

    console.log('[Auth] Fetching user stats for user:', user.id);
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[Auth] Error fetching user stats:', error);
      // If user stats don't exist, create them
      if (error.code === 'PGRST116') {
        console.log('[Auth] User stats not found, creating');
        const { data: newStats, error: createError } = await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            total_points: 0,
            weekly_points: 0,
            current_workout_streak: 0,
            longest_workout_streak: 0,
            total_workouts: 0,
            total_volume_kg: 0,
          })
          .select()
          .single();

        if (createError) {
          console.error('[Auth] Error creating user stats:', createError);
          return;
        }
        console.log('[Auth] Created user stats:', newStats);
        set({ userStats: newStats });
      }
      return;
    }

    console.log('[Auth] Fetched user stats:', data);
    set({ userStats: data });
  },

  refreshUserStats: async () => {
    await get().fetchUserStats();
  },

  updateBodyweight: async (bodyweightKg: number) => {
    const user = get().user;
    if (!user) return;

    const { error } = await (supabase
      .from('profiles') as any)
      .update({ bodyweight_kg: bodyweightKg })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating bodyweight:', error);
      throw error;
    }

    await get().fetchProfile();
  },
}));
