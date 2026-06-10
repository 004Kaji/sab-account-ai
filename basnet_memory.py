"""
Basnet Memory — persistent cross-session memory.
Storage:   ~/Desktop/Basnet-Memory.db  (SQLite, built into Python)
Search:    TF-IDF keyword matching (scikit-learn, already installed)
Extraction: Claude Haiku extracts memorable facts from each exchange
"""

import sqlite3
import os
import json
import numpy as np
from pathlib import Path
from anthropic import Anthropic

DB_PATH = str(Path.home() / "Desktop" / "Basnet-Memory.db")

# Load .env.local if not already in environment
_env_file = Path(__file__).parent / ".env.local"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _k, _v = _line.split("=", 1)
        _k, _v = _k.strip(), _v.strip().strip('"')
        if _k and not os.environ.get(_k):
            os.environ[_k] = _v

# ── Database ──────────────────────────────────────────────────────────

def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''CREATE TABLE IF NOT EXISTS memories (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        content    TEXT NOT NULL,
        source_q   TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    return conn


# ── Fact extraction ───────────────────────────────────────────────────

def save_memory(question: str, answer: str) -> None:
    """Extract facts from a Q&A exchange and persist them."""
    try:
        client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
        result = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            system="""Extract 0-3 memorable facts from this Q&A that would help Basnet in future conversations.
Facts should be about Sanjog: his situation, preferences, plans, specific numbers, or upcoming events.
Return ONLY a JSON array of strings. Empty array [] if nothing worth remembering.
Examples: ["Has 5.5GB free disk space as of June 2026", "1 paid user out of 15 total", "Looking for IT jobs in Darwin"]""",
            messages=[{"role": "user", "content": f"Q: {question}\nA: {answer}"}],
        )
        block = result.content[0]
        text  = block.text if block.type == "text" else "[]"
        raw_facts: list = json.loads(text.replace("```json", "").replace("```", "").strip())
        # Normalise — Claude sometimes returns objects instead of strings
        facts = []
        for f in raw_facts:
            if isinstance(f, str):
                facts.append(f)
            elif isinstance(f, dict):
                facts.append(f.get("fact") or f.get("memory") or str(f))

        if facts:
            conn = _get_db()
            conn.executemany(
                "INSERT INTO memories (content, source_q) VALUES (?, ?)",
                [(f, question[:100]) for f in facts if f],
            )
            conn.commit()
            conn.close()
    except Exception:
        pass  # never crash voice loop on memory errors


# ── Semantic search (TF-IDF) ──────────────────────────────────────────

def search_memory(question: str, limit: int = 5) -> str:
    """Return relevant memories for the current question."""
    try:
        conn  = _get_db()
        rows  = conn.execute(
            "SELECT content FROM memories ORDER BY created_at DESC LIMIT 200"
        ).fetchall()
        conn.close()

        if not rows:
            return ""

        contents = [r[0] for r in rows]

        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        vectorizer = TfidfVectorizer(stop_words="english", min_df=1)
        docs       = [question] + contents
        tfidf      = vectorizer.fit_transform(docs)
        sims       = cosine_similarity(tfidf[0:1], tfidf[1:]).flatten()

        top_idx  = np.argsort(sims)[::-1][:limit]
        relevant = [(contents[i], sims[i]) for i in top_idx if sims[i] > 0.05]

        if not relevant:
            # Fall back to 3 most recent memories
            relevant = [(c, 0.0) for c in contents[:3]]

        if not relevant:
            return ""

        return "Relevant memories:\n" + "\n".join(f"- {mem}" for mem, _ in relevant)

    except Exception:
        return ""


# ── All memories (for debugging) ─────────────────────────────────────

def get_all_memories() -> list[dict]:
    try:
        conn = _get_db()
        rows = conn.execute(
            "SELECT id, content, source_q, created_at FROM memories ORDER BY created_at DESC"
        ).fetchall()
        conn.close()
        return [{"id": r[0], "memory": r[1], "source": r[2], "date": r[3]} for r in rows]
    except Exception:
        return []
