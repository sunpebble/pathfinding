-- Supabase Migration: 009_update_profiles_for_phone.sql
-- Add phone number field to profiles table for phone authentication

-- Add phone column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Create unique index on phone (allowing nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
ON public.profiles(phone)
WHERE phone IS NOT NULL;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone
ON public.profiles(phone);

-- Update the email column to allow empty strings for phone-only users
ALTER TABLE public.profiles
ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.profiles
ALTER COLUMN email SET DEFAULT '';

-- Update handle_new_user function to support phone registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NEW.phone
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for phone-based user lookup (service role only)
-- Note: This is already covered by existing policies since we use service role key
