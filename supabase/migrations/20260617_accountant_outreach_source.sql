-- Add source column to accountant_outreach to track where each lead came from.
-- 'tpb_register' = verified licensed practitioner from tpb.gov.au/public-register (highest quality)
-- 'tavily_search' = scraped via Tavily web search

ALTER TABLE accountant_outreach
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'tavily_search';

-- Back-fill all existing rows so the TPB priority query works cleanly
UPDATE accountant_outreach
  SET source = 'tavily_search'
  WHERE source IS NULL;
