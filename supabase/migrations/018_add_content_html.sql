-- Add content_html column for rich text support
-- Allows rendering with proper formatting, images, links, etc.

ALTER TABLE travel_guides 
ADD COLUMN IF NOT EXISTS content_html TEXT;

COMMENT ON COLUMN travel_guides.content_html IS 'HTML content for rich text rendering, includes formatting, images inline, and links';
