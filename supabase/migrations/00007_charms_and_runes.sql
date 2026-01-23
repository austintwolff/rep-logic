-- Migration: Charms and Runes System
-- Adds tables for tracking user-owned charms and runes with equipment state
-- Also adds new transaction types for charm and rune bonuses

-- ============================================================================
-- UPDATE POINT TRANSACTIONS CHECK CONSTRAINT
-- Add 'charm_bonus' and 'rune_bonus' as valid transaction types
-- ============================================================================
ALTER TABLE public.point_transactions
DROP CONSTRAINT IF EXISTS point_transactions_transaction_type_check;

ALTER TABLE public.point_transactions
ADD CONSTRAINT point_transactions_transaction_type_check
CHECK (transaction_type IN (
  'set_completed',
  'workout_completed',
  'streak_bonus',
  'overload_bonus',
  'charm_bonus',
  'rune_bonus'
));

-- ============================================================================
-- USER CHARMS (inventory of charms owned by user)
-- ============================================================================
CREATE TABLE public.user_charms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  charm_id TEXT NOT NULL,
  equipped BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique charm per user (can only own one of each type)
  UNIQUE(user_id, charm_id)
);

-- ============================================================================
-- USER RUNES (inventory of runes owned by user)
-- ============================================================================
CREATE TABLE public.user_runes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rune_id TEXT NOT NULL,
  equipped BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique rune per user (can only own one of each type)
  UNIQUE(user_id, rune_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for fetching all charms for a user
CREATE INDEX idx_user_charms_user_id ON public.user_charms(user_id);

-- Index for fetching equipped charms quickly
CREATE INDEX idx_user_charms_equipped ON public.user_charms(user_id, equipped) WHERE equipped = TRUE;

-- Index for fetching all runes for a user
CREATE INDEX idx_user_runes_user_id ON public.user_runes(user_id);

-- Index for fetching equipped runes quickly
CREATE INDEX idx_user_runes_equipped ON public.user_runes(user_id, equipped) WHERE equipped = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.user_charms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_runes ENABLE ROW LEVEL SECURITY;

-- User charms policies
CREATE POLICY "Users can view own charms" ON public.user_charms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own charms" ON public.user_charms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own charms" ON public.user_charms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own charms" ON public.user_charms
  FOR DELETE USING (auth.uid() = user_id);

-- User runes policies
CREATE POLICY "Users can view own runes" ON public.user_runes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own runes" ON public.user_runes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own runes" ON public.user_runes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own runes" ON public.user_runes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get equipped charm IDs for a user
CREATE OR REPLACE FUNCTION get_equipped_charms(p_user_id UUID)
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(charm_id), ARRAY[]::TEXT[])
  FROM public.user_charms
  WHERE user_id = p_user_id AND equipped = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to get equipped rune IDs for a user
CREATE OR REPLACE FUNCTION get_equipped_runes(p_user_id UUID)
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(rune_id), ARRAY[]::TEXT[])
  FROM public.user_runes
  WHERE user_id = p_user_id AND equipped = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to award a charm to a user (handles duplicates gracefully)
CREATE OR REPLACE FUNCTION award_charm(p_user_id UUID, p_charm_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.user_charms (user_id, charm_id)
  VALUES (p_user_id, p_charm_id)
  ON CONFLICT (user_id, charm_id) DO NOTHING;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award a rune to a user (handles duplicates gracefully)
CREATE OR REPLACE FUNCTION award_rune(p_user_id UUID, p_rune_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.user_runes (user_id, rune_id)
  VALUES (p_user_id, p_rune_id)
  ON CONFLICT (user_id, rune_id) DO NOTHING;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
