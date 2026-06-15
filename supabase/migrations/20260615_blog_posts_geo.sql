-- Add GEO ai_summary field to blog_posts (image_url already exists)
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS ai_summary text;
