"""
Basnet Voice — runs on MacBook only. NOT deployed to Vercel.
Press Enter to speak, Basnet listens for 8 seconds and responds.
All queries routed to local agent on port 3099. Vercel not contacted.

Requirements: pip3 install -r basnet_requirements.txt
              brew install sox ffmpeg
              cd local-agent && npm run dev   (must be running)
"""

import asyncio
import httpx
import os
import ssl
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

# Fix SSL certificate issue on Mac
ssl._create_default_https_context = ssl._create_unverified_context
os.environ['PYTHONHTTPSVERIFY'] = '0'

# Load .env.local automatically so no manual export needed
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

LOCAL_AGENT_URL  = "http://127.0.0.1:3099"
WEBHOOK_SECRET   = os.environ.get("AGENT_WEBHOOK_SECRET", "")
ELEVENLABS_KEY   = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "")


async def transcribe(audio_path: str) -> str:
    txt_path = Path("/tmp") / (Path(audio_path).stem + ".txt")
    subprocess.run(
        [
            "whisper", audio_path,
            "--model", "small.en",
            "--language", "en",
            "--output_format", "txt",
            "--output_dir", "/tmp",
        ],
        capture_output=True,
        env={**os.environ, "PYTHONHTTPSVERIFY": "0"},
    )
    if txt_path.exists():
        text = txt_path.read_text().strip()
        txt_path.unlink(missing_ok=True)
        return text
    return ""


async def record(seconds: int = 8) -> str:
    tmp = tempfile.mktemp(suffix=".wav")
    subprocess.run(
        ["sox", "-d", "-r", "16000", "-c", "1", "-b", "16",
         tmp, "trim", "0", str(seconds)],
        capture_output=True,
    )
    return tmp


VERCEL_URL = "https://sabaccountai.com"

# Voice commands that trigger Vercel agent endpoints directly
# Format: phrase → (url, body)
_VOICE_TRIGGERS: list[tuple[list[str], str, dict]] = [
    (
        ["send accountant emails", "send the emails", "run spark"],
        f"{VERCEL_URL}/api/agents/sab",
        {"trigger": "marketing_run", "data": {"marketingTrigger": "accountant_emails"}},
    ),
    (
        ["run scout", "scan the product", "test the site"],
        f"{VERCEL_URL}/api/agents/sab",
        {"trigger": "scout_scan"},
    ),
    (
        ["run lift", "check for churn", "scan users"],
        f"{VERCEL_URL}/api/agents/sab",
        {"trigger": "lift_scan"},
    ),
    (
        ["morning briefing", "give me my briefing", "daily briefing"],
        f"{VERCEL_URL}/api/agents/basnet",
        {"trigger": "morning"},
    ),
    (
        ["weekly brief", "weekly summary"],
        f"{VERCEL_URL}/api/agents/basnet",
        {"trigger": "weekly"},
    ),
    (
        ["run learn", "learning loop", "basnet learn"],
        f"{VERCEL_URL}/api/agents/learn",
        {},
    ),
]

async def fire_agent(url: str, body: dict) -> dict:
    """Fire a Vercel agent endpoint and return its response."""
    body["secret"] = WEBHOOK_SECRET
    try:
        async with httpx.AsyncClient(timeout=45) as c:
            r = await c.post(url, json=body)
            d = r.json()
            answer = (d.get("response") or d.get("answer") or
                      d.get("message") or d.get("result") or "Done.")
            return {"response": str(answer)[:300], "url": None, "warning": None,
                    "topic": None, "is_complete": False, "next_suggestion": None}
    except Exception as e:
        return {"response": f"Agent unreachable: {e}", "url": None, "warning": None,
                "topic": None, "is_complete": False, "next_suggestion": None}

def match_voice_trigger(question: str) -> tuple[str, dict] | None:
    q = question.lower()
    for phrases, url, body in _VOICE_TRIGGERS:
        if any(p in q for p in phrases):
            return url, body
    return None

# ── Local classification — mirrors classification.ts ───────────────────

_KEYWORDS: dict[str, list[str]] = {
    "mac":       ['ram', 'disk', 'cpu', 'battery', 'uptime', 'hard drive', 'ssd',
                  'my mac', 'how much space', 'free space'],
    "technical": ['error', 'bug', 'build', 'stripe webhook', 'supabase', 'sentry',
                  'deploy', 'code', 'payg', 'test', 'rls', 'ssl', 'security',
                  'working', 'broken', 'passing', 'endpoint', 'api', 'route',
                  'check my system', 'run flux', 'health check', 'site working',
                  'is the site', 'is sab', 'any errors', 'any bugs', 'status',
                  'commit', 'push', 'git', 'pr ', 'pull request', 'audit',
                  'fix the', 'fix errors', 'run flux', 'flux check'],
    "health":    ['churn', 'at risk', 'inactive', 'retention', 'not using',
                  'upgrade', 'conversion', 'lost user', 'user', 'signup', 'mrr',
                  'revenue', 'paid users'],
    "intel":     ['competitor', 'xero', 'myob', 'market', 'ato update',
                  'law change', 'payday super', 'pricing', 'what are competitors', 'news'],
    "marketing": ['tiktok', 'blog', 'post', 'content', 'what to write', 'topic',
                  'hook', 'linkedin', 'facebook', 'accountant', 'instagram', 'twitter'],
    "personal":  ['visa', 'pr', 'university', 'goals', 'dream', 'north star',
                  'tired', 'overwhelmed', 'should i', 'what do i do', 'job', 'jobs',
                  'work', 'employment', 'career', 'apply', 'resume', 'darwin', 'sydney',
                  'melbourne', 'brisbane', 'perth', 'adelaide', 'find me', 'search for',
                  'look up', 'study', 'assignment', 'course', 'semester', 'fee',
                  'money', 'finance', 'budget', 'income', 'expense', 'part time',
                  'full time', 'casual', 'internship', 'salary', 'wage', 'weather',
                  'how much does', 'price of', 'cost of', 'where is', 'what is the',
                  'hire', 'hiring', 'find me', 'how do i', 'how to get'],
}

# mac checked before personal so "mac memory" doesn't hit web search
_PRIORITY = ["mac", "technical", "health", "intel", "marketing", "personal"]

# Phrase triggers for ambiguous words (require Mac-specific context)
_MAC_PHRASE: list[tuple[str, list[str]]] = [
    ('memory',  ['mac', 'ram', 'computer', 'macbook']),
    ('storage', ['mac', 'computer', 'macbook', 'disk']),
    ('process', ['mac', 'cpu', 'computer', 'macbook']),
    ('system',  ['mac', 'macbook', 'computer']),
    ('slow',    ['mac', 'macbook', 'computer']),
    ('running', ['mac', 'macbook', 'slow']),
]

# Classification → local agent route
_ROUTE: dict[str, str] = {
    "mac":       "ask",
    "personal":  "ask",
    "technical": "technical",
    "health":    "health-check",
    "intel":     "intel",
    "marketing": "marketing",
    "general":   "ask",
}

def classify_local(question: str) -> str:
    q = question.lower()
    # Mac phrase triggers (ambiguous keywords need context)
    for trigger, ctx in _MAC_PHRASE:
        if trigger in q and any(c in q for c in ctx):
            return "mac"
    # Standard keyword matching in priority order
    for cls in _PRIORITY:
        if any(k in q for k in _KEYWORDS[cls]):
            return cls
    return "general"


AGENT_COLORS = {
    "RELAY":    "\033[96m",   # cyan
    "SPARK":    "\033[95m",   # magenta
    "ATLAS":    "\033[93m",   # yellow
    "FLUX":     "\033[92m",   # green
    "LIFT":     "\033[94m",   # blue
}
RESET = "\033[0m"
DIM   = "\033[2m"

async def ask_local(question: str, route: str, mem_context: str = "", history: list = []) -> dict:
    """Call /stream on the local agent, print live progress, return final result."""
    import json as _json
    # Technical route needs longer timeout — tsc + build + deploy can take 5+ minutes
    timeout = 360 if route == "technical" else 60
    try:
        async with httpx.AsyncClient(timeout=timeout) as c:
            async with c.stream(
                "POST",
                f"{LOCAL_AGENT_URL}/stream",
                headers={"x-agent-secret": WEBHOOK_SECRET, "Content-Type": "application/json"},
                json={"question": question, "route": route, "mem_context": mem_context,
                      "history": [{"q": h["q"], "a": h["a"]} for h in history[-6:]]},
            ) as r:
                async for raw_line in r.aiter_lines():
                    if not raw_line.strip():
                        continue
                    try:
                        line = _json.loads(raw_line)
                    except Exception:
                        continue

                    if line.get("type") == "progress":
                        agent = line.get("agent", "BASNET")
                        msg   = line.get("message", "")
                        color = AGENT_COLORS.get(agent, "\033[97m")
                        print(f"  {color}[{agent}]{RESET} {DIM}{msg}{RESET}")

                    elif line.get("type") == "result":
                        return {
                            "response":        line.get("answer", "No response."),
                            "url":             line.get("url"),
                            "warning":         None,
                            "topic":           None,
                            "is_complete":     False,
                            "next_suggestion": None,
                            "suggestion":      line.get("suggestion"),
                            "next_action":     line.get("nextAction"),
                        }
    except Exception as e:
        import traceback
        print(f"  \033[91m[ERROR]{RESET} {type(e).__name__}: {e}")
        print(traceback.format_exc()[:300])
    return {"response": "Local agent unreachable. Is `npm run dev` running in local-agent/?",
            "url": None, "warning": None, "topic": None, "is_complete": False, "next_suggestion": None}

YES_WORDS = {"yes", "yeah", "yep", "sure", "open", "show", "go", "do it", "ok", "okay", "please",
             "submit", "commit", "deploy", "send", "do that", "go ahead", "proceed", "correct", "right"}
FILTER_WORDS = {"filter", "sort", "recent", "latest", "new", "today", "date", "newest"}

def is_yes(text: str) -> bool:
    return any(w in text.lower() for w in YES_WORDS)

def is_filter_request(text: str) -> bool:
    return any(w in text.lower() for w in FILTER_WORDS)

def build_filtered_url(base_url: str, request: str) -> str:
    """Build a filtered version of a URL based on a natural language request."""
    r = request.lower()
    # SEEK — add sort by date
    if "seek.com" in base_url and any(w in r for w in ["recent", "latest", "new", "date", "newest", "today"]):
        sep = "&" if "?" in base_url else "?"
        return base_url + sep + "sortmode=ListedDate"
    # LinkedIn — sort by recent
    if "linkedin.com" in base_url and any(w in r for w in ["recent", "latest", "new", "date"]):
        sep = "&" if "?" in base_url else "?"
        return base_url + sep + "f_TPR=r86400"  # last 24 hours
    return base_url

def open_in_chrome(url: str):
    """Open URL as a new tab in existing Chrome window."""
    result = subprocess.run(
        ["open", "-a", "Google Chrome", url],
        capture_output=True
    )
    if result.returncode != 0:
        # Fallback to default browser
        subprocess.run(["open", url])

async def ask_to_open_browser(url: str) -> bool:
    await speak("Want me to open that in your browser?")
    subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"])
    print("[Listening for 3 seconds...]")
    audio = await record(seconds=3)
    reply = await transcribe(audio)
    Path(audio).unlink(missing_ok=True)
    print(f"[You said: {reply}]")
    return is_yes(reply)


async def speak(text: str):
    if ELEVENLABS_KEY and ELEVENLABS_VOICE:
        async with httpx.AsyncClient() as c:
            try:
                r = await c.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE}",
                    headers={"xi-api-key": ELEVENLABS_KEY},
                    json={
                        "text": text,
                        "model_id": "eleven_turbo_v2",
                        "voice_settings": {
                            "stability": 0.5,
                            "similarity_boost": 0.75,
                            "speed": 1.1,
                        },
                    },
                )
                if r.status_code == 200:
                    tmp = tempfile.mktemp(suffix=".mp3")
                    Path(tmp).write_bytes(r.content)
                    subprocess.run(["afplay", tmp])
                    Path(tmp).unlink(missing_ok=True)
                    return
            except Exception:
                pass

    clean = text.replace("'", "").replace('"', "")
    subprocess.run(["say", "-v", "Daniel", clean])


async def main():
    print("=" * 50)
    print("Basnet Voice — Fully Local")
    print("Press ENTER to speak, then talk for 8 seconds")
    print("Agents: mac · personal · marketing · intel · technical · health")
    print("Ctrl+C to stop")
    if not ELEVENLABS_KEY:
        print("TTS: Mac say (no ElevenLabs key)")
    if not WEBHOOK_SECRET:
        print("WARNING: AGENT_WEBHOOK_SECRET not set")
    print("=" * 50)

    await speak("Basnet online. Press Enter to speak.")

    print("[Initialising memory...]")
    from basnet_memory import search_memory, save_memory
    print("[Memory ready — Basnet remembers everything.]")

    last_url      = None
    history       = []     # in-session only; long-term memory handled by mem0
    current_topic = None

    while True:
        try:
            topic_label = f" [{current_topic}]" if current_topic else ""
            input(f"\nPress Enter to speak{topic_label}...")
            subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"])
            print("[Recording for 8 seconds — speak now...]")

            q_audio  = await record(seconds=8)
            print("[Transcribing...]")
            question = await transcribe(q_audio)
            Path(q_audio).unlink(missing_ok=True)

            if not question or len(question) < 3:
                print("[Could not hear you clearly]")
                await speak("Did not catch that. Try again.")
                continue

            # Fix Whisper mis-spellings of agent names (case-insensitive word match)
            _NAME_FIXES = {
                # Agent names
                'smith': 'Basnet', 'basenet': 'Basnet', 'bassnet': 'Basnet', 'basnit': 'Basnet',
                'fox': 'Flux', 'flocks': 'Flux', 'flex': 'Flux',
                'sparks': 'Spark', 'park': 'Spark',
                # Common Whisper mishearings
                'chord': 'code', 'cord': 'code', 'cords': 'code',
                'core': 'code', 'chord': 'code',
                'the chord': 'the code', 'check chord': 'check code',
                'fixed the chord': 'fix the code',
                'versa': 'Vercel', 'versaille': 'Vercel', 'vessel': 'Vercel',
            }
            import re as _re
            _q = question
            for wrong, right in _NAME_FIXES.items():
                _q = _re.sub(rf'\b{wrong}\b', right, _q, flags=_re.IGNORECASE)
            if _q != question:
                print(f"[Corrected: {question} → {_q}]")
                question = _q

            print(f"You:    {question}")

            # Handle follow-up filter/navigation on the last opened URL (local, no API call)
            if last_url and is_filter_request(question):
                filtered = build_filtered_url(last_url, question)
                print(f"[Navigating to: {filtered}]")
                open_in_chrome(filtered)
                last_url = filtered
                await speak("Done. Filtered.")
                continue

            # Check voice-triggered agent commands first
            trigger = match_voice_trigger(question)
            if trigger:
                t_url, t_body = trigger
                label = t_body.get("trigger", "agent").upper()
                print(f"[TRIGGER → {label}]")
                await speak("On it.")
                data = await fire_agent(t_url, t_body)
            else:
                cls   = classify_local(question)
                route = _ROUTE[cls]
                print(f"[{cls.upper()} → /{route}]")

                # Retrieve relevant memories before asking
                mem_context = await asyncio.get_event_loop().run_in_executor(
                    None, search_memory, question
                )
                if mem_context:
                    print(f"  \033[2m[Memory: found relevant context]\033[0m")

                data = await ask_local(question, route, mem_context, history)

            response       = data.get("response", "No response.")
            url            = data.get("url")
            warning        = data.get("warning")
            topic          = data.get("topic") or current_topic
            is_complete    = data.get("is_complete", False)
            next_suggestion = data.get("next_suggestion")

            # ── Speak warning first if risk detected ──
            if warning:
                print(f"⚠️  Warning: {warning}")
                await speak(f"Warning. {warning}")

            print(f"Basnet: {response}\n")
            await speak(response)

            # ── Save to long-term memory (background) ──
            asyncio.get_event_loop().run_in_executor(
                None, save_memory, question, response
            )

            # ── Flux conversation loop ─────────────────────────────────
            suggestion  = data.get("suggestion")
            next_action = data.get("next_action")

            while suggestion and next_action and next_action != "done":
                await speak(suggestion)
                subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"])
                print("[Listening for 5 seconds...]")
                follow_audio = await record(seconds=5)
                follow_reply = await transcribe(follow_audio)
                Path(follow_audio).unlink(missing_ok=True)
                print(f"[You said: {follow_reply}]")

                if not follow_reply or not is_yes(follow_reply):
                    break

                # Map next_action to a question Flux understands
                _action_map = {
                    "commit_deploy":    "commit and deploy",
                    "deploy":           "deploy to vercel",
                    "sentry":           "check sentry",
                    "audit":            "run full audit",
                    "fix":              "fix errors",
                    "fix_commit_deploy":"fix errors commit and deploy",
                    "create_issues":    "check sentry",
                }
                follow_q = _action_map.get(next_action, next_action)
                print(f"[FLUX follow-up → {follow_q}]")
                follow_data = await ask_local(follow_q, "technical", "", history)
                follow_resp = follow_data.get("response", "Done.")
                print(f"Basnet: {follow_resp}\n")
                await speak(follow_resp)
                asyncio.get_event_loop().run_in_executor(None, save_memory, follow_q, follow_resp)
                suggestion  = follow_data.get("suggestion")
                next_action = follow_data.get("next_action")

            # ── Update session state ──
            current_topic = topic
            history.append({"q": question, "a": response})
            if len(history) > 5:
                history = history[-5:]

            # ── Offer browser only for genuinely useful URLs ──
            _SKIP_DOMAINS = ['facebook.com', 'twitter.com', 'instagram.com', 'reddit.com',
                             'youtube.com', 'tiktok.com', 'pinterest.com']
            useful_url = url and not any(d in url for d in _SKIP_DOMAINS)
            if useful_url:
                print(f"[URL: {url}]")
                should_open = await ask_to_open_browser(url)
                if should_open:
                    open_in_chrome(url)
                    last_url = url
                    await speak("Opening now.")

            # ── Topic completion gate ──
            if is_complete:
                gate_msg = next_suggestion or "Ready to move on?"
                print(f"\n[Topic complete: {current_topic}]")
                await speak(f"We have covered that. {gate_msg} Say yes to continue or press Enter to stay here.")
                subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"])
                print("[Listening for 3 seconds...]")
                gate_audio = await record(seconds=3)
                gate_reply = await transcribe(gate_audio)
                Path(gate_audio).unlink(missing_ok=True)
                print(f"[You said: {gate_reply}]")
                if is_yes(gate_reply):
                    current_topic = None
                    last_url = None
                    history = []
                    await speak("Starting fresh. What's next?")

        except KeyboardInterrupt:
            print("\nBasnet signing off.")
            await speak("Basnet offline.")
            break
        except Exception as e:
            print(f"Error: {e}")
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
