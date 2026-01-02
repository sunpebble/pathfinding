-- Supabase Migration: 005_create_itinerary_days.sql
-- Single day within an itinerary

CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each day number must be unique within an itinerary
  CONSTRAINT unique_day_per_itinerary UNIQUE (itinerary_id, day_number)
);

-- Indexes
CREATE INDEX idx_itinerary_days_itinerary_id ON public.itinerary_days(itinerary_id);

-- RLS - Inherit from parent itinerary
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;

-- Users can view days for itineraries they can access
CREATE POLICY "Users can view days for accessible itineraries"
  ON public.itinerary_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = itinerary_id
      AND (i.user_id = auth.uid() OR i.visibility = 'public')
    )
  );

-- Users can insert days for their own itineraries
CREATE POLICY "Users can insert days for own itineraries"
  ON public.itinerary_days FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = itinerary_id AND i.user_id = auth.uid()
    )
  );

-- Users can update days for their own itineraries
CREATE POLICY "Users can update days for own itineraries"
  ON public.itinerary_days FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = itinerary_id AND i.user_id = auth.uid()
    )
  );

-- Users can delete days for their own itineraries
CREATE POLICY "Users can delete days for own itineraries"
  ON public.itinerary_days FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = itinerary_id AND i.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_itinerary_days_updated_at
  BEFORE UPDATE ON public.itinerary_days
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
