-- Supabase Migration: 002_create_cities.sql
-- Reference data for destination cities

CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  timezone VARCHAR(50) NOT NULL,
  country_code CHAR(2) NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cities_name ON public.cities(name);
CREATE INDEX idx_cities_country_code ON public.cities(country_code);

-- RLS - Cities are public read
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cities"
  ON public.cities FOR SELECT
  USING (true);

-- Only service role can insert/update cities (admin operations)
CREATE POLICY "Service role can manage cities"
  ON public.cities FOR ALL
  USING (auth.role() = 'service_role');
