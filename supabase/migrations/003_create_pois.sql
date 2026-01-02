-- Supabase Migration: 003_create_pois.sql
-- Point of Interest (POI) data for attractions, restaurants, etc.

-- Create POI category enum
CREATE TYPE poi_category AS ENUM (
  'attraction',
  'restaurant',
  'hotel',
  'shopping',
  'other'
);

CREATE TABLE IF NOT EXISTS public.pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(100),
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  category poi_category NOT NULL,
  city_id UUID NOT NULL REFERENCES public.cities(id),
  address TEXT,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
  rating_count INTEGER DEFAULT 0,
  price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),
  business_hours JSONB,
  phone VARCHAR(50),
  image_urls TEXT[],
  source VARCHAR(50) NOT NULL DEFAULT 'gaode',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pois_city_id ON public.pois(city_id);
CREATE INDEX idx_pois_category ON public.pois(category);
CREATE INDEX idx_pois_rating ON public.pois(rating DESC);
CREATE INDEX idx_pois_location ON public.pois USING GIST (
  point(longitude, latitude)
);

-- Unique constraint for external provider IDs
CREATE UNIQUE INDEX idx_pois_external_source 
  ON public.pois(external_id, source) 
  WHERE external_id IS NOT NULL;

-- RLS - POIs are public read
ALTER TABLE public.pois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view POIs"
  ON public.pois FOR SELECT
  USING (true);

-- Only service role can manage POIs
CREATE POLICY "Service role can manage POIs"
  ON public.pois FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE TRIGGER update_pois_updated_at
  BEFORE UPDATE ON public.pois
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
