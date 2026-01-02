-- Supabase Migration: 008_create_rls_policies.sql
-- Additional RLS policies and security configurations

-- Enable realtime for itineraries and items (for live collaboration)
ALTER PUBLICATION supabase_realtime ADD TABLE public.itineraries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_days;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_items;

-- Create index for user's itineraries listing (performance optimization)
CREATE INDEX idx_itineraries_user_listing ON public.itineraries(user_id, updated_at DESC);

-- Create index for public itineraries discovery
CREATE INDEX idx_itineraries_public ON public.itineraries(visibility, updated_at DESC)
  WHERE visibility = 'public';

-- Function to get user's itinerary count (for quota checking)
CREATE OR REPLACE FUNCTION public.get_user_itinerary_count(
  p_user_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.itineraries
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to duplicate an itinerary (for public itinerary copying)
CREATE OR REPLACE FUNCTION public.duplicate_itinerary(
  p_source_id UUID,
  p_new_user_id UUID,
  p_new_title VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_source_itinerary public.itineraries%ROWTYPE;
  v_new_itinerary_id UUID;
  v_day_mapping JSONB := '{}';
  v_source_day RECORD;
  v_new_day_id UUID;
  v_source_item RECORD;
BEGIN
  -- Get source itinerary
  SELECT * INTO v_source_itinerary
  FROM public.itineraries
  WHERE id = p_source_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source itinerary not found';
  END IF;
  
  -- Check if user can access the itinerary
  IF v_source_itinerary.user_id != p_new_user_id 
     AND v_source_itinerary.visibility != 'public' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Create new itinerary
  INSERT INTO public.itineraries (
    user_id, title, city_id, start_date, end_date, visibility
  ) VALUES (
    p_new_user_id,
    COALESCE(p_new_title, v_source_itinerary.title || ' (Copy)'),
    v_source_itinerary.city_id,
    v_source_itinerary.start_date,
    v_source_itinerary.end_date,
    'private'
  ) RETURNING id INTO v_new_itinerary_id;
  
  -- Copy days
  FOR v_source_day IN
    SELECT * FROM public.itinerary_days
    WHERE itinerary_id = p_source_id
    ORDER BY day_number
  LOOP
    INSERT INTO public.itinerary_days (
      itinerary_id, day_number, date
    ) VALUES (
      v_new_itinerary_id,
      v_source_day.day_number,
      v_source_day.date
    ) RETURNING id INTO v_new_day_id;
    
    -- Store day mapping
    v_day_mapping := v_day_mapping || jsonb_build_object(
      v_source_day.id::text, v_new_day_id::text
    );
  END LOOP;
  
  -- Copy items
  FOR v_source_item IN
    SELECT item.* FROM public.itinerary_items item
    JOIN public.itinerary_days d ON d.id = item.day_id
    WHERE d.itinerary_id = p_source_id
    ORDER BY d.day_number, item.order_index
  LOOP
    INSERT INTO public.itinerary_items (
      day_id, poi_id, order_index, start_time, end_time, transport_mode, notes
    ) VALUES (
      (v_day_mapping ->> v_source_item.day_id::text)::UUID,
      v_source_item.poi_id,
      v_source_item.order_index,
      v_source_item.start_time,
      v_source_item.end_time,
      v_source_item.transport_mode,
      v_source_item.notes
    );
  END LOOP;
  
  RETURN v_new_itinerary_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_itinerary_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_itinerary(UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_itinerary_item(UUID, INTEGER) TO authenticated;

-- Service role permissions for reminder processing
GRANT EXECUTE ON FUNCTION public.get_pending_reminders(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_reminder_sent(UUID) TO service_role;
