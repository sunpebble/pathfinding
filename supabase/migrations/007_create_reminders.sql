-- Supabase Migration: 007_create_reminders.sql
-- Push notification reminders for itinerary items

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.itinerary_items(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reminders_item_id ON public.reminders(item_id);
CREATE INDEX idx_reminders_scheduled_at ON public.reminders(scheduled_at) 
  WHERE sent_at IS NULL;  -- Only index unsent reminders
CREATE INDEX idx_reminders_pending ON public.reminders(scheduled_at)
  WHERE sent_at IS NULL;  -- For batch processing pending reminders

-- RLS - Inherit from parent itinerary through itinerary_items and itinerary_days
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Users can view reminders for their own itineraries
CREATE POLICY "Users can view own reminders"
  ON public.reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_items item
      JOIN public.itinerary_days d ON d.id = item.day_id
      JOIN public.itineraries i ON i.id = d.itinerary_id
      WHERE item.id = item_id AND i.user_id = auth.uid()
    )
  );

-- Users can insert reminders for their own itinerary items
CREATE POLICY "Users can insert reminders for own items"
  ON public.reminders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.itinerary_items item
      JOIN public.itinerary_days d ON d.id = item.day_id
      JOIN public.itineraries i ON i.id = d.itinerary_id
      WHERE item.id = item_id AND i.user_id = auth.uid()
    )
  );

-- Users can update their own reminders
CREATE POLICY "Users can update own reminders"
  ON public.reminders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_items item
      JOIN public.itinerary_days d ON d.id = item.day_id
      JOIN public.itineraries i ON i.id = d.itinerary_id
      WHERE item.id = item_id AND i.user_id = auth.uid()
    )
  );

-- Users can delete their own reminders
CREATE POLICY "Users can delete own reminders"
  ON public.reminders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_items item
      JOIN public.itinerary_days d ON d.id = item.day_id
      JOIN public.itineraries i ON i.id = d.itinerary_id
      WHERE item.id = item_id AND i.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get pending reminders for batch processing (service role)
CREATE OR REPLACE FUNCTION public.get_pending_reminders(
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  reminder_id UUID,
  item_id UUID,
  user_id UUID,
  scheduled_at TIMESTAMPTZ,
  poi_name VARCHAR,
  itinerary_title VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS reminder_id,
    r.item_id,
    i.user_id,
    r.scheduled_at,
    p.name AS poi_name,
    i.title AS itinerary_title
  FROM public.reminders r
  JOIN public.itinerary_items item ON item.id = r.item_id
  JOIN public.itinerary_days d ON d.id = item.day_id
  JOIN public.itineraries i ON i.id = d.itinerary_id
  JOIN public.pois p ON p.id = item.poi_id
  WHERE r.sent_at IS NULL
    AND r.scheduled_at <= NOW()
  ORDER BY r.scheduled_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark reminder as sent
CREATE OR REPLACE FUNCTION public.mark_reminder_sent(
  p_reminder_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE public.reminders
  SET sent_at = NOW()
  WHERE id = p_reminder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
