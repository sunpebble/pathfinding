-- Supabase Migration: 004_create_itineraries.sql
-- Core travel itinerary table

-- Create visibility enum
CREATE TYPE itinerary_visibility AS ENUM (
  'private',
  'team',
  'public'
);

CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  city_id UUID NOT NULL REFERENCES public.cities(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  visibility itinerary_visibility NOT NULL DEFAULT 'private',
  cover_image_url TEXT,
  copied_from_id UUID REFERENCES public.itineraries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Validation: end_date must be >= start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX idx_itineraries_user_id ON public.itineraries(user_id);
CREATE INDEX idx_itineraries_city_id ON public.itineraries(city_id);
CREATE INDEX idx_itineraries_visibility ON public.itineraries(visibility);
CREATE INDEX idx_itineraries_created_at ON public.itineraries(created_at DESC);

-- RLS
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

-- Users can view their own itineraries
CREATE POLICY "Users can view own itineraries"
  ON public.itineraries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public itineraries
CREATE POLICY "Users can view public itineraries"
  ON public.itineraries FOR SELECT
  USING (visibility = 'public');

-- Users can create their own itineraries
CREATE POLICY "Users can insert own itineraries"
  ON public.itineraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own itineraries
CREATE POLICY "Users can update own itineraries"
  ON public.itineraries FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own itineraries
CREATE POLICY "Users can delete own itineraries"
  ON public.itineraries FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON public.itineraries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
