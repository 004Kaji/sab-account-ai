-- Agent-generated blog posts stored in Supabase and served via dynamic route.
-- Static TSX posts take precedence due to Next.js routing rules.

CREATE TABLE IF NOT EXISTS blog_posts (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug             text        UNIQUE NOT NULL,
  title            text        NOT NULL,
  description      text        NOT NULL,
  excerpt          text        NOT NULL,
  tag              text        NOT NULL DEFAULT 'Tax',
  quick_answer     text,
  intro            text        NOT NULL DEFAULT '',
  sections         jsonb       NOT NULL DEFAULT '[]',
  faqs             jsonb       NOT NULL DEFAULT '[]',
  cta_text         text,
  related_slugs    text[]      DEFAULT '{}',
  keywords         text[]      DEFAULT '{}',
  word_count       integer,
  status           text        NOT NULL DEFAULT 'published'
                               CHECK (status IN ('draft', 'published')),
  date_published   text        NOT NULL,
  read_time        text        NOT NULL DEFAULT '8 min read',
  created_by       text        DEFAULT 'spark',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access on blog_posts"
  ON blog_posts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon can read published blog posts"
  ON blog_posts FOR SELECT TO anon
  USING (status = 'published');

CREATE INDEX IF NOT EXISTS blog_posts_status_idx     ON blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_created_at_idx ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx       ON blog_posts(slug);
