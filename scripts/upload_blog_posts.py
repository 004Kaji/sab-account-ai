"""
Parse AI blog post migration SQL files and upsert them into Supabase
via the REST API using the service role key.
"""
import re
import json
import ssl
import urllib.request
import urllib.error
import os
from pathlib import Path

# Fix SSL on Mac (same as basnet_voice2.py)
ssl._create_default_https_context = ssl._create_unverified_context

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://dpvnkyooweexyywcganp.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdm5reW9vd2VleHl5d2NnYW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQzNTg3NCwiZXhwIjoyMDk0MDExODc0fQ.08dXWWErceg7HW5z0bZbAyEjHeyecwdLlYhw2Tr41_Y"

MIGRATIONS = [
    Path(__file__).parent.parent / "supabase/migrations/20260615_ai_blog_posts_1.sql",
    Path(__file__).parent.parent / "supabase/migrations/20260615_ai_blog_posts_2.sql",
    Path(__file__).parent.parent / "supabase/migrations/20260615_ai_blog_posts_3.sql",
]

COLUMNS = [
    "slug", "title", "description", "excerpt", "tag", "quick_answer",
    "intro", "sections", "faqs", "cta_text", "related_slugs",
    "date_published", "read_time", "image_url", "status", "updated_at",
]

# ── Parser ────────────────────────────────────────────────────────────────────

def extract_dollar_quoted_tokens(text: str) -> list:
    """
    Walk the text character by character extracting values in the order
    they appear as SQL positional parameters. Returns a list where each
    element is the raw string value, None (for NULL), or '__NOW__' for NOW().
    """
    tokens = []
    i = 0
    length = len(text)

    while i < length:
        # Skip whitespace, commas, comments, ::jsonb / ::text[] casts
        if text[i:i+2] == "--":
            end = text.find("\n", i)
            i = end + 1 if end != -1 else length
            continue
        if text[i] in (" ", "\t", "\n", "\r", ","):
            i += 1
            continue
        # Cast suffix e.g. ::jsonb, ::text[]
        if text[i:i+2] == "::":
            end = i + 2
            while end < length and text[end] not in (" ", "\t", "\n", ",", ")"):
                end += 1
            i = end
            continue
        # Dollar-quoted string: $$...$$
        if text[i:i+2] == "$$":
            close = text.find("$$", i + 2)
            if close == -1:
                break
            tokens.append(text[i + 2 : close])
            i = close + 2
            continue
        # NULL
        if text[i:i+4].upper() == "NULL":
            tokens.append(None)
            i += 4
            continue
        # NOW()
        if text[i:i+5].upper() == "NOW()":
            tokens.append("__NOW__")
            i += 5
            continue
        i += 1

    return tokens


def parse_file(path: Path) -> list[dict]:
    content = path.read_text(encoding="utf-8")

    # Extract just the VALUES section
    m = re.search(r"VALUES\s*\((.+)\)\s*ON CONFLICT", content, re.DOTALL | re.IGNORECASE)
    if not m:
        print(f"  WARNING: could not find VALUES...ON CONFLICT in {path.name}")
        return []

    values_block = m.group(1)

    # Split on "), (" boundaries (between posts)
    # Use a regex that matches the literal ), ( between rows
    raw_posts = re.split(r"\)\s*,\s*\(", values_block)

    posts = []
    for raw in raw_posts:
        tokens = extract_dollar_quoted_tokens(raw)
        if len(tokens) < len(COLUMNS):
            print(f"  WARNING: expected {len(COLUMNS)} tokens, got {len(tokens)} — skipping post")
            continue

        row = {}
        for col, val in zip(COLUMNS, tokens):
            if val == "__NOW__" or col == "updated_at":
                continue  # let Supabase set this
            if val is None:
                row[col] = None
            elif col in ("sections", "faqs"):
                try:
                    row[col] = json.loads(val)
                except json.JSONDecodeError:
                    row[col] = []
            elif col == "related_slugs":
                try:
                    parsed = json.loads(val)
                    row[col] = parsed if isinstance(parsed, list) else []
                except json.JSONDecodeError:
                    row[col] = []
            else:
                row[col] = val

        if row.get("slug"):
            posts.append(row)

    return posts


# ── Uploader ──────────────────────────────────────────────────────────────────

def upsert_posts(posts: list[dict]) -> tuple[int, list[str]]:
    if not posts:
        return 0, []

    url = f"{SUPABASE_URL}/rest/v1/blog_posts"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    body = json.dumps(posts).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return len(posts), []
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return 0, [f"HTTP {e.code}: {err_body[:300]}"]
    except Exception as e:
        return 0, [str(e)]


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    total_ok = 0
    total_err = 0

    for path in MIGRATIONS:
        if not path.exists():
            print(f"[SKIP] {path.name} not found")
            continue

        print(f"\n[READING] {path.name}")
        posts = parse_file(path)
        print(f"  Parsed {len(posts)} posts")

        if not posts:
            continue

        for p in posts:
            print(f"  → {p.get('slug', '?')}")

        ok, errors = upsert_posts(posts)
        if errors:
            print(f"  [ERROR] {errors[0]}")
            total_err += len(posts)
        else:
            print(f"  [OK] {ok} posts upserted")
            total_ok += ok

    print(f"\n{'='*50}")
    print(f"Done — {total_ok} upserted, {total_err} failed")
    if total_ok > 0:
        print(f"Live at: https://sabaccountai.com/blog")


if __name__ == "__main__":
    main()
