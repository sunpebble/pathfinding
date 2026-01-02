-- Supabase Migration: 006_create_itinerary_items.sql
-- POI items within an itinerary day with drag-drop ordering

-- Transport mode enum for travel between items
CREATE TYPE transport_mode AS ENUM (
  'walking',
  'driving',
  'transit',
  'cycling',
  'taxi'
);

CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  poi_id UUID NOT NULL REFERENCES public.pois(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  start_time TIME,
  end_time TIME,
  transport_mode transport_mode NOT NULL DEFAULT 'walking',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Order index must be unique within a day
  CONSTRAINT unique_order_per_day UNIQUE (day_id, order_index),
  -- End time must be after start time if both specified
  CONSTRAINT valid_time_range CHECK (
    start_time IS NULL OR end_time IS NULL OR end_time > start_time
  )
);

-- Indexes
CREATE INDEX idx_itinerary_items_day_id ON public.itinerary_items(day_id);
CREATE INDEX idx_itinerary_items_poi_id ON public.itinerary_items(poi_id);
CREATE INDEX idx_itinerary_items_order ON public.itinerary_items(day_id, order_index);

-- RLS - Inherit from parent itinerary through itinerary_days
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- Users can view items for accessible itineraries
CREATE POLICY "Users can view items for accessible itineraries"
  ON public.itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_days d
      JOIN public.itineraries i ON i.id = d.itinerary_id
      WHERE d.id = day_id
      AND (i.user_id = auth.uid() OR i.visibility = 'public')
    )
  );

-- Users can insert items for their own itineraries
CREATE POLICY "Users can insert items for own itineraries"
  ON public.itinerary_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.itinerary_days d
      JOIN public.itineraries i ON i.id = d.itinerary_id
      WHERE d.id = day_id AND i.user_id = auth.uid()
    )
  );

-- Users can update items for their own itineraries
CREATE POLICY "Users can update items for own itineraries"
  ON public.itinerary_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_days d
      JOIN public.itineraries i ON i.id = d.itinerary_id
      WHERE d.id = day_id AND i.user_id = auth.uid()
    )
  );

-- Users can delete items from their own itineraries
CREATE POLICY "Users can delete items from own itineraries"
  ON public.itinerary_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_days d
      JOIN public.itineraries i ON i.id = d.itinerary_id
      WHERE d.id = day_id AND i.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_itinerary_items_updated_at
  BEFORE UPDATE ON public.itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to reorder items after drag-drop (gap-based reordering)
CREATE OR REPLACE FUNCTION public.reorder_itinerary_item(
  p_item_id UUID,
  p_new_order INTEGER
) RETURNS void AS $$
DECLARE
  v_day_id UUID;
  v_old_order INTEGER;
BEGIN
  -- Get current item info
  SELECT day_id, order_index INTO v_day_id, v_old_order
  FROM public.itinerary_items
  WHERE id = p_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  
  -- Shift items to make room
  IF p_new_order < v_old_order THEN
    -- Moving up: shift items down
    UPDATE public.itinerary_items
    SET order_index = order_index + 1
    WHERE day_id = v_day_id
      AND order_index >= p_new_order
      AND order_index < v_old_order;
  ELSE
    -- Moving down: shift items up
    UPDATE public.itinerary_items
    SET order_index = order_index - 1
    WHERE day_id = v_day_id
      AND order_index > v_old_order
      AND order_index <= p_new_order;
  END IF;
  
  -- Update the item's order
  UPDATE public.itinerary_items
  SET order_index = p_new_order
  WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
