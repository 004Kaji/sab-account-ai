"""
Basnet Voice — Wake word + VAD-based conversation

Say "Basnet" (or "bosnet", "hey basnet") to wake up.
Basnet listens until you stop speaking, then responds.
No Enter key needed. Stays awake until you say "bye Basnet".

Requirements:
  pip3 install httpx openai sounddevice numpy schedule
  brew install sox  (fallback if sounddevice unavailable)

Optional (better TTS):
  Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env.local

Usage:
  python3 basnet_voice2.py
"""

import asyncio
import httpx
import json
import os
import re
import ssl
import subprocess
import tempfile
import wave
from pathlib import Path
import schedule
import threading
import time as _time
from datetime import datetime
from zoneinfo import ZoneInfo

# ── Optional real-time audio (sounddevice + numpy) ────────────────────
try:
    import sounddevice as sd
    import numpy as np
    SD_AVAILABLE = True
except ImportError:
    SD_AVAILABLE = False

# ── Whisper model — loaded once, stays in RAM ─────────────────────────
_WHISPER_MODEL = None

def _get_whisper() -> object:
    global _WHISPER_MODEL
    if _WHISPER_MODEL is None:
        try:
            import whisper as _w
            print("[Loading whisper tiny model...]", flush=True)
            _WHISPER_MODEL = _w.load_model("tiny")
            print("[Whisper ready]", flush=True)
        except Exception as e:
            print(f"[Whisper load failed: {e}]", flush=True)
    return _WHISPER_MODEL

def _transcribe_np_sync(audio_int16: "np.ndarray", prompt: str = "Basnet.") -> str:
    """Transcribe int16 numpy audio with in-memory whisper. Filters hallucinations."""
    model = _get_whisper()
    if model is None:
        return ""
    try:
        audio_f32 = audio_int16.flatten().astype(np.float32) / 32768.0
        result = model.transcribe(
            audio_f32, fp16=False, language="en",
            initial_prompt=prompt,
            condition_on_previous_text=False,
            temperature=0,
            no_speech_threshold=0.5,
        )
        # Discard if whisper itself thinks there's no speech
        segs = result.get("segments", [])
        if segs:
            avg_no_speech = sum(s.get("no_speech_prob", 0) for s in segs) / len(segs)
            if avg_no_speech > 0.5:
                return ""
        return result.get("text", "").strip()
    except Exception:
        return ""


# Fix SSL on Mac
ssl._create_default_https_context = ssl._create_unverified_context
os.environ["PYTHONHTTPSVERIFY"] = "0"

# ── Load .env.local ────────────────────────────────────────────────────
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

VERCEL_URL      = "https://sabaccountai.com"
WEBHOOK_SECRET  = os.environ.get("AGENT_WEBHOOK_SECRET", "")
ELEVENLABS_KEY  = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "")
OPENAI_KEY      = os.environ.get("OPENAI_API_KEY", "")
LOCAL_AGENT_URL = os.environ.get("LOCAL_AGENT_URL", "http://127.0.0.1:3099")

# Colours
CYAN    = "\033[96m"
GREEN   = "\033[92m"
YELLOW  = "\033[93m"
RED     = "\033[91m"
DIM     = "\033[2m"
BOLD    = "\033[1m"
RESET   = "\033[0m"

_briefing_done_date: str | None = None   # set to today's AEST date once briefing fires


# ── Voice trigger commands ─────────────────────────────────────────────
# These bypass the voice route and fire Basnet endpoints directly.

VOICE_TRIGGERS: list[tuple[list[str], str, dict]] = [
    (
        ["morning briefing", "give me my briefing", "daily briefing", "morning report"],
        f"{VERCEL_URL}/api/agents/basnet",
        {"trigger": "morning"},
    ),
    (
        ["weekly brief", "weekly summary", "this week"],
        f"{VERCEL_URL}/api/agents/basnet",
        {"trigger": "weekly"},
    ),
    (
        ["run scout", "test the site", "product health", "check the site"],
        f"{VERCEL_URL}/api/agents/sab",
        {"trigger": "scout_scan"},
    ),
    (
        ["send accountant emails", "run spark", "send the emails"],
        f"{VERCEL_URL}/api/agents/sab",
        {"trigger": "marketing_run", "data": {"marketingTrigger": "accountant_emails"}},
    ),
    (
        ["run lift", "check churn", "scan users", "check users"],
        f"{VERCEL_URL}/api/agents/sab",
        {"trigger": "lift_scan"},
    ),
    (
        ["run atlas", "market intel", "competitive scan"],
        f"{VERCEL_URL}/api/agents/sab",
        {"trigger": "atlas_scan"},
    ),
    (
        ["check compliance", "ato update", "ato updates", "check ato", "fair work update", "compliance watch", "regulatory update", "check regulations"],
        f"{VERCEL_URL}/api/agents/sab",
        {"trigger": "compliance_watch"},
    ),
    (
        ["draft social posts", "draft social post", "social media post", "social post", "facebook post", "linkedin post", "linked in post", "write a post", "draft a post", "post for facebook", "post for linkedin", "create social", "spark post", "run spark"],
        f"{VERCEL_URL}/api/agents/sab",
        {"trigger": "marketing_run", "data": {"marketingTrigger": "draft_social_posts"}},
    ),
    (
        ["write blog post", "write a blog", "spark blog", "generate blog", "new blog post", "white blog post", "white blog", "right blog post"],
        f"{VERCEL_URL}/api/agents/sab",
        {"trigger": "marketing_run", "data": {"marketingTrigger": "write_blog_post"}},
    ),
]

def match_trigger(question: str) -> tuple[str, dict] | None:
    q = question.lower()
    for phrases, url, body in VOICE_TRIGGERS:
        if any(p in q for p in phrases):
            return url, body
    return None


# ── Audio: record + transcribe ─────────────────────────────────────────

async def record(seconds: int = 8) -> str:
    tmp = tempfile.mktemp(suffix=".wav")
    subprocess.run(
        ["sox", "-d", "-r", "16000", "-c", "1", "-b", "16",
         tmp, "trim", "0", str(seconds)],
        capture_output=True,
    )
    return tmp


async def transcribe(audio_path: str) -> str:
    # Try OpenAI Whisper API first (faster, more accurate)
    if OPENAI_KEY:
        try:
            import openai
            client = openai.OpenAI(api_key=OPENAI_KEY)
            with open(audio_path, "rb") as f:
                result = client.audio.transcriptions.create(
                    model="whisper-1", file=f, language="en",
                    prompt="SAB Account AI, Basnet, Xero, MYOB, Reckon, QuickBooks, Supabase, Vercel, Stripe, GST, ABN, ATO, Spark, Flux, Atlas"
                )
            return result.text.strip()
        except Exception as e:
            print(f"{DIM}[OpenAI Whisper failed: {e} — trying local]{RESET}")

    # Fall back to in-memory whisper (fast — model already loaded)
    try:
        import soundfile as _sf
        audio_data, _ = _sf.read(audio_path, dtype="int16")
        if len(audio_data.shape) > 1:
            audio_data = audio_data[:, 0]
        text = _transcribe_np_sync(
            audio_data,
            prompt="SAB Account AI, Basnet, Xero, MYOB, Stripe, Supabase, Vercel, GST, ATO"
        )
        if text:
            return text
    except Exception:
        pass

    # Last resort: whisper CLI subprocess
    txt_path = Path("/tmp") / (Path(audio_path).stem + ".txt")
    subprocess.run(
        ["whisper", audio_path, "--model", "tiny", "--language", "en",
         "--output_format", "txt", "--output_dir", "/tmp"],
        capture_output=True, timeout=30,
    )
    if txt_path.exists():
        text = txt_path.read_text().strip()
        txt_path.unlink(missing_ok=True)
        return text
    return ""


# ── TTS: speak ────────────────────────────────────────────────────────

def _clean_for_tts(text: str) -> str:
    """Strip all markdown / code / URLs so Mac say sounds natural."""
    # Remove fenced code blocks entirely (``` ... ```)
    text = re.sub(r'```[\s\S]*?```', ' ', text)
    # Remove inline code but keep the word inside
    text = re.sub(r'`([^`\n]+)`', r'\1', text)
    # Markdown links [label](url) → just label
    text = re.sub(r'\[([^\]]+)\]\([^\)]*\)', r'\1', text)
    # Bare URLs — say reads these as "h-t-t-p-s colon slash slash..."
    text = re.sub(r'https?://\S+', '', text)
    # Markdown headers (## Title → Title)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Bold / italic — unwrap the text inside
    text = re.sub(r'\*{1,3}([^*\n]+)\*{1,3}', r'\1', text)
    text = re.sub(r'_{1,3}([^_\n]+)_{1,3}', r'\1', text)
    # Bullet list markers
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    # Horizontal rules
    text = re.sub(r'^[-_*]{3,}\s*$', '', text, flags=re.MULTILINE)
    # HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Strip known agent routing labels only — NOT domain acronyms like [GST] [ATO] [ABN]
    text = re.sub(r'\[(?:BASNET|FLUX|SPARK|ATLAS|LIFT|SCOUT|RELAY|BUILD|EXEC|APP|LOCAL|N8N|TRIGGER)\]', '', text)
    # Remaining junk chars
    text = re.sub(r'[*_`#|\\]', '', text)
    # Normalize \n \n (non-contiguous newlines) → \n\n first
    text = re.sub(r'\n[ \t]*\n', '\n\n', text)
    # Remove leading/trailing blank lines — prevents leading \n\n becoming ". hello"
    text = text.strip('\n')
    # Paragraph breaks → sentence pause; \.? eats trailing period to avoid double-dot
    text = re.sub(r'\.?\n{2,}', '. ', text)
    text = re.sub(r'\n', ' ', text)
    # Collapse whitespace
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()


async def speak(text: str):
    clean = _clean_for_tts(text)

    if ELEVENLABS_KEY and ELEVENLABS_VOICE:
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE}",
                    headers={"xi-api-key": ELEVENLABS_KEY},
                    json={
                        "text": (clean[:500].rsplit(' ', 1)[0] if len(clean) > 500 else clean),
                        "model_id": "eleven_turbo_v2",
                        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": 1.1},
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

    # Cap at 350 chars — reading 500 words aloud is unusable
    if len(clean) > 350:
        clean = clean[:350].rsplit(' ', 1)[0] + "..."
    subprocess.run(["say", "-v", "Daniel", "-r", "175", clean])


# ── Whisper name corrections ──────────────────────────────────────────

NAME_FIXES = {
    "basenet": "Basnet", "bassnet": "Basnet", "basnit": "Basnet", "smith": "Basnet",
    "flux": "Flux", "fox": "Flux", "flocks": "Flux",
    "spark": "Spark", "sparks": "Spark",
    "versa": "Vercel", "vessel": "Vercel",
    "chord": "code", "cord": "code",
    # Accounting software names Whisper often mishears
    "jaro": "Xero", "gyro": "Xero", "hero accounting": "Xero accounting",
    "zero alternative": "Xero alternative", "zero accounting": "Xero accounting",
    "myob": "MYOB", "my ob": "MYOB",
}

def fix_names(text: str) -> str:
    for wrong, right in NAME_FIXES.items():
        text = re.sub(rf"\b{wrong}\b", right, text, flags=re.IGNORECASE)
    return text


# ── Wake word + VAD constants ─────────────────────────────────────────

WAKE_WORDS = [
    # core spellings (substring match catches "basnete", "bosnete", etc.)
    "basnet", "bosnet", "basenet", "bassnet", "basnit", "bosnit",
    # boz/baz variants
    "boznet", "baznet", "boznete", "baznete", "boz net", "baz net",
    # bus/bus variants
    "bus net", "busnet", "busnete",
    # with spaces
    "bas net", "bos net",
    # with "hey"
    "hey basnet", "hey bosnet", "hey boznet",
    # common Whisper mishears with trailing sounds
    "basnett", "bosnett", "basnette", "bosnette",
    # other phonetic near-misses
    "basket", "basket net", "basnie", "boschet",
]
SLEEP_WORDS = [
    "bye basnet", "goodbye basnet", "bye bye", "that's all", "stop listening",
    "go to sleep", "sleep basnet", "thanks basnet", "thank you basnet",
    "bye for today", "goodbye for today", "that's all for today", "good night",
    "goodnight", "see you later", "talk later", "bye for now",
]

SAMPLE_RATE      = 16000
SILENCE_THRESH   = 400      # RMS below this = silence (tune up if too sensitive)
VAD_CHUNK_MS     = 30       # ms per VAD chunk
VAD_SILENCE_SECS = 1.8      # seconds of silence to stop recording
MAX_RECORD_SECS  = 45       # hard cap on recording length
WAKE_CLIP_SECS   = 1.8      # length of each wake word detection clip


# ── VAD recording (stop when user stops talking) ──────────────────────

def _record_vad_sync(max_secs: float = MAX_RECORD_SECS) -> str | None:
    """Blocking: record until silence. Returns WAV path or None if no speech."""
    chunk_samples   = int(SAMPLE_RATE * VAD_CHUNK_MS / 1000)
    silent_to_stop  = int(VAD_SILENCE_SECS * 1000 / VAD_CHUNK_MS)
    min_voice_chunks = int(200 / VAD_CHUNK_MS)  # at least 200ms of speech

    chunks: list    = []
    silent_count    = 0
    voice_count     = 0
    has_voice       = False

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1,
                        dtype="int16", blocksize=chunk_samples) as stream:
        while True:
            audio, _ = stream.read(chunk_samples)
            chunks.append(audio.copy())

            rms = float(np.sqrt(np.mean(audio.astype(np.float32) ** 2)))

            if rms > SILENCE_THRESH:
                silent_count = 0
                voice_count += 1
                if voice_count >= min_voice_chunks:
                    has_voice = True
            else:
                if has_voice:
                    silent_count += 1

            if has_voice and silent_count >= silent_to_stop:
                break
            if len(chunks) * VAD_CHUNK_MS / 1000 > max_secs:
                break

    if not has_voice:
        return None

    audio_data = np.concatenate(chunks, axis=0)
    tmp = tempfile.mktemp(suffix=".wav")
    with wave.open(tmp, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio_data.tobytes())
    return tmp


async def record_vad(max_secs: float = MAX_RECORD_SECS) -> str | None:
    """Async wrapper: record until silence. Falls back to sox if sounddevice unavailable."""
    if SD_AVAILABLE:
        return await asyncio.to_thread(_record_vad_sync, max_secs)
    # Fallback to fixed 8s recording
    return await record(seconds=8)


# ── Wake word detection ───────────────────────────────────────────────

def _normalise(text: str) -> str:
    """Lowercase, strip punctuation — so 'Bosnet.' and 'Bosnete,' both match."""
    return re.sub(r"[^\w\s]", "", text.lower()).strip()


def _is_wake_word(text: str) -> bool:
    t = _normalise(text)
    return any(w in t for w in WAKE_WORDS)


def _is_sleep_word(text: str) -> bool:
    t = _normalise(text)
    # Direct match
    if any(w in t for w in SLEEP_WORDS):
        return True
    # "bye/goodbye/good night" + any phonetic variant of "basnet"
    # catches Whisper mishearing: "Bye Vasnet", "Bye Baz Net", "Bye Bosnet" etc.
    if re.search(r'\b(bye|goodbye|good night|goodnight|see you|talk later)\b', t):
        for word in t.split():
            if re.match(r'^[bv][aeiou][sz]?n', word):
                return True
    return False


def _audio_to_wav(audio_int16: "np.ndarray") -> str:
    """Save int16 numpy audio to a temp WAV file. Returns path."""
    tmp = tempfile.mktemp(suffix=".wav")
    with wave.open(tmp, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio_int16.tobytes())
    return tmp


def _record_and_transcribe_wake_sync() -> str:
    """Record 2.5s + transcribe in one thread. Returns transcribed text or empty."""
    clip_samples = int(SAMPLE_RATE * 2.5)
    audio = sd.rec(clip_samples, samplerate=SAMPLE_RATE, channels=1, dtype="int16")
    sd.wait()
    rms = float(np.sqrt(np.mean(audio.astype(np.float32) ** 2)))
    if rms < 300:
        return ""   # background noise / silence — skip transcription
    return _transcribe_np_sync(audio, prompt="Basnet. Hey Basnet.")


async def _transcribe_wake(wav_path: str) -> str:
    """Transcribe a wake word clip — OpenAI API if available, else local whisper tiny."""
    if OPENAI_KEY:
        try:
            import openai
            client = openai.OpenAI(api_key=OPENAI_KEY)
            with open(wav_path, "rb") as f:
                result = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f,
                    language="en",
                    prompt="Basnet. Bosnet. Hey Basnet. Hey Bosnet. Basnete.",
                    temperature=0,
                )
            return result.text.strip()
        except Exception:
            pass

    # Fallback: local whisper tiny (fast, no API cost)
    try:
        txt_path = Path("/tmp") / (Path(wav_path).stem + ".txt")
        subprocess.run(
            ["whisper", wav_path, "--model", "tiny", "--language", "en",
             "--output_format", "txt", "--output_dir", "/tmp",
             "--initial_prompt", "Basnet. Bosnet. Hey Basnet."],
            capture_output=True, timeout=15,
        )
        if txt_path.exists():
            text = txt_path.read_text().strip()
            txt_path.unlink(missing_ok=True)
            return text
    except Exception:
        pass
    return ""


def _phonetic_match(text: str) -> bool:
    """Match wake word — rejects long phrases (background TV/speech = many words)."""
    t = _normalise(text).lower()
    words = t.split()

    # Background speech always transcribes as long sentences — reject anything > 5 words
    if len(words) > 5:
        return False

    # Direct wake word match
    if _is_wake_word(t):
        return True

    # Phonetic: MUST have b/v + a/o + s/z + n cluster
    for w in words:
        if re.match(r'^[bv][ao][sz]n', w):
            return True

    return False


async def wait_for_wake_word() -> tuple[str, str]:
    """
    Record 2.5s clips, transcribe in-memory, check for wake word.
    Returns (full_text, inline_question).
    """
    while True:
        text = await asyncio.to_thread(_record_and_transcribe_wake_sync)
        if not text:
            continue

        if not _phonetic_match(text):
            continue   # background noise — ignore silently

        print(f"[wake] heard: {text!r}", flush=True)

        # Strip wake word + filler to get any trailing question
        pattern = r'(?i)\b(?:hey\s+|ok\s+|hi\s+)?(?:' + \
                  '|'.join(re.escape(w) for w in WAKE_WORDS) + \
                  r')\b[,.]?\s*'
        remaining = re.sub(pattern, '', text).strip(' ,.')
        return text, remaining


def extract_blog_topic(question: str) -> str | None:
    """Extract topic from phrases like 'write blog post on Xero alternatives'."""
    m = re.search(
        r"(?:write|spark|generate|new|create)\s+(?:a\s+)?blog\s+(?:post\s+)?(?:on|about|regarding|for|called)\s+(.+)",
        question, re.IGNORECASE,
    )
    return m.group(1).strip() if m else None


# ── Local Mac agent ───────────────────────────────────────────────────
# Called directly (no Vercel hop) for file/computer/system questions.
# Falls back to Vercel voice route if local agent is down.

LOCAL_QUERY_WORDS = [
    "my files", "my folder", "my desktop", "my documents", "my downloads",
    "open file", "read file", "check file", "find file",
    "my computer", "my mac", "computer access", "file access",
    "disk space", "storage space", "ram", "memory", "cpu", "battery",
    "running apps", "running processes", "system info",
    "do you have access", "can you access", "have you got access",
    "show me my", "what's on my",
]

BUILD_QUERY_WORDS = [
    "build me", "build a", "create a website", "make a website",
    "create a landing page", "make a landing page",
    "create a game", "make a game", "build a game",
    "create an app", "make an app", "build an app",
    "write a script", "create a new agent", "make a new agent",
    "build an agent", "add an agent", "delete agent", "remove agent",
    "new agent called", "generate code", "write code for",
    "list what you built", "show what you built", "what have you built",
    "list apps", "list agents", "show agents", "show apps", "what apps",
    "delete the app", "delete the game", "delete the page", "remove the app",
]

EXEC_QUERY_WORDS = [
    "run command", "run script", "run this", "execute", "run git",
    "git status", "git pull", "git push", "git commit", "git log",
    "npm install", "npm run", "npx ", "run npm",
    "list files", "run ls", "find files", "kill process",
    "restart server", "run python", "run node",
]

APP_QUERY_WORDS = [
    "open vs code", "open vscode", "open xcode", "open terminal",
    "open finder", "open safari", "open chrome", "open slack",
    "open zoom", "open spotify", "open notes", "open calendar",
    "open messages", "open mail", "open microsoft word", "open word",
    "close vs code", "close chrome", "close slack", "close app",
    "quit app", "what apps are open", "what is running", "running apps",
]

CODE_QUERY_WORDS = [
    "check code", "check the code", "check codes",
    "review code", "review the code",
    "sab account ai code", "sab account code",
    "any errors", "any bugs", "typescript error", "build error",
    "check the project", "scan the project",
    "commit", "commit and deploy", "deploy to vercel",
    "fix the error", "fix errors", "fix the bug",
    "run audit", "full audit", "audit the code",
    "check sentry", "any runtime errors",
    "git status", "git log",
]

def is_local_query(question: str) -> bool:
    q = question.lower()
    return any(w in q for w in LOCAL_QUERY_WORDS)

def is_code_query(question: str) -> bool:
    q = question.lower()
    return any(w in q for w in CODE_QUERY_WORDS)

def is_build_query(question: str) -> bool:
    q = question.lower()
    return any(w in q for w in BUILD_QUERY_WORDS)

def is_exec_query(question: str) -> bool:
    q = question.lower()
    return any(w in q for w in EXEC_QUERY_WORDS)

def is_app_query(question: str) -> bool:
    q = question.lower()
    return any(w in q for w in APP_QUERY_WORDS)

async def call_local_agent(question: str, endpoint: str = "/ask") -> str | None:
    """Call the local Mac agent directly — no Vercel hop needed."""
    try:
        async with httpx.AsyncClient(timeout=120) as c:
            r = await c.post(
                f"{LOCAL_AGENT_URL}{endpoint}",
                headers={"x-agent-secret": WEBHOOK_SECRET} if WEBHOOK_SECRET else {},
                json={"question": question},
            )
            if r.status_code == 200:
                data = r.json()
                return data.get("answer") or data.get("response")
    except Exception:
        pass
    return None


# ── API calls ─────────────────────────────────────────────────────────

def _thinking_label(question: str) -> str:
    """Return a short label shown while waiting for Basnet to respond."""
    q = question.lower()
    if any(w in q for w in ["strategy", "what should i", "what do i focus", "big picture", "advice"]):
        return "Thinking strategically..."
    if any(w in q for w in ["code", "error", "bug", "check code", "typescript"]):
        return "Checking code..."
    if any(w in q for w in ["user", "churn", "mrr", "revenue", "paid"]):
        return "Checking user health..."
    if any(w in q for w in ["blog", "social", "email", "marketing", "write"]):
        return "Asking Spark..."
    if any(w in q for w in ["competitor", "xero", "myob", "market", "ato update"]):
        return "Asking Atlas..."
    if any(w in q for w in ["did you", "have you", "what did", "emails sent"]):
        return "Checking agent logs..."
    if " and " in q and any(w in q for w in ["check", "write", "send", "run", "fix"]):
        return "Breaking into tasks..."
    return "Thinking..."


async def call_voice(question: str, history: list, current_topic: str | None) -> dict:
    """Route question to /api/agents/voice — handles all classification internally."""
    print(f"{DIM}[{_thinking_label(question)}]{RESET}", end="", flush=True)
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(
                f"{VERCEL_URL}/api/agents/voice",
                json={
                    "secret":        WEBHOOK_SECRET,
                    "input":         question,
                    "mode":          "voice",
                    "history":       history[-10:],
                    "current_topic": current_topic,
                },
            )
            print()  # newline after thinking label
            return r.json()
    except Exception as e:
        print()
        return {"response": f"Basnet unreachable: {e}", "warning": None,
                "topic": current_topic, "is_complete": False, "next_suggestion": None}


async def fire_trigger(url: str, body: dict) -> str:
    """Fire a direct Basnet endpoint and return a short spoken summary."""
    body = {**body, "secret": WEBHOOK_SECRET}
    try:
        async with httpx.AsyncClient(timeout=180) as c:
            r = await c.post(url, json=body)
            d = r.json()
            if d.get("title") and d.get("slug"):
                saved = "Saved." if d.get("saved") else "Generated but not saved."
                return f"Blog post written. Title: {d['title']}. {saved}"
            if d.get("drafted") is not None:
                platforms = ", ".join(d.get("platforms") or [])
                return f"Drafted {d['drafted']} social posts for {platforms}. Check your dashboard to review and approve them."
            return str(
                d.get("briefing") or d.get("answer") or d.get("message") or
                d.get("result") or "Done."
            )[:400]
    except Exception as e:
        return f"Trigger failed: {e}"


# ── Open URL in Chrome ────────────────────────────────────────────────

def open_chrome(url: str):
    result = subprocess.run(["open", "-a", "Google Chrome", url], capture_output=True)
    if result.returncode != 0:
        subprocess.run(["open", url])

YES_WORDS = {"yes","yeah","yep","sure","open","show","go","ok","okay","please",
             "do it","go ahead","proceed","correct","right","absolutely","of course"}

def is_yes(text: str) -> bool:
    return any(w in text.lower() for w in YES_WORDS)

OPEN_DOMAINS = ["linkedin.com","supabase.com","vercel.com","stripe.com",
                "sentry.io","github.com","sabaccountai.com","seek.com"]


# ── Morning briefing (8am AEST, automatic) ────────────────────────────

async def morning_briefing() -> None:
    """
    Fetch the morning-brief JSON from Vercel and speak a ~60-second summary.
    Fires automatically at 8am AEST — no wake word required.
    After speaking, normal wake-word listening resumes.
    """
    global _briefing_done_date

    print(f"\n{CYAN}{BOLD}[Morning briefing — 8am AEST]{RESET}", flush=True)

    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(
                f"{VERCEL_URL}/api/agents/basnet/morning-brief",
                headers={"Authorization": f"Bearer {WEBHOOK_SECRET}"},
            )
            if r.status_code != 200:
                print(f"{RED}[morning_briefing] HTTP {r.status_code}{RESET}", flush=True)
                await speak("Morning briefing unavailable right now.")
                return
            data: dict = r.json()
    except Exception as e:
        print(f"{RED}[morning_briefing error: {e}]{RESET}", flush=True)
        await speak("Morning briefing couldn't load. Check your connection.")
        return

    mrr             = data.get("mrr", 0)
    mrr_change      = data.get("mrrChange", 0)
    signups         = data.get("newSignups24h", 0)
    alerts          = data.get("p0Alerts", [])
    days_left       = data.get("daysUntilJuly1", 0)
    kite_drafts     = data.get("kiteRepliesDraft", 0)
    content_drafts  = data.get("contentDraft", 0)
    outreach_queued = data.get("outreachQueuedToday", 0)
    total_review    = kite_drafts + content_drafts

    direction  = "up" if mrr_change >= 0 else "down"
    change_abs = abs(mrr_change)

    parts: list[str] = [
        "Good morning Sanjog. Here's your briefing.",
        f"MRR is ${mrr:,}, {direction} ${change_abs:,} this week.",
    ]

    if signups == 0:
        parts.append("No new signups in the last 24 hours.")
    elif signups == 1:
        parts.append("1 new signup in the last 24 hours.")
    else:
        parts.append(f"{signups} new signups in the last 24 hours.")

    if total_review == 0:
        parts.append("Nothing waiting for your review.")
    else:
        pieces: list[str] = []
        if content_drafts:
            pieces.append(f"{content_drafts} content draft{'s' if content_drafts != 1 else ''}")
        if kite_drafts:
            pieces.append(f"{kite_drafts} Kite repl{'ies' if kite_drafts != 1 else 'y'}")
        summary = " and ".join(pieces)
        parts.append(f"{total_review} item{'s' if total_review != 1 else ''} waiting for review — {summary}.")

    if outreach_queued > 0:
        parts.append(f"Spark has {outreach_queued} contacts queued for outreach.")

    parts.append(f"{days_left} days until the Payday Super deadline.")

    if alerts:
        names = [a.get("error_type", "unknown") for a in alerts[:2]]
        parts.append(f"Alert: {', '.join(names)}.")
    else:
        parts.append("No alerts.")

    parts.append("Have a great day.")

    script = " ".join(parts)
    print(f"\n{GREEN}{BOLD}[Morning brief]:{RESET} {script}\n", flush=True)
    await speak(script)


def _check_and_brief(loop: asyncio.AbstractEventLoop) -> None:
    """schedule callback — runs in the scheduler thread every minute.
    Fires morning_briefing() on the asyncio event loop at 8am AEST."""
    global _briefing_done_date
    try:
        now_aest = datetime.now(ZoneInfo("Australia/Sydney"))
        today    = now_aest.strftime("%Y-%m-%d")
        if now_aest.hour == 8 and _briefing_done_date != today:
            _briefing_done_date = today   # mark first — prevents double-fire if brief is slow
            asyncio.run_coroutine_threadsafe(morning_briefing(), loop)
    except Exception as e:
        print(f"{RED}[schedule error: {e}]{RESET}", flush=True)


def _start_scheduler(loop: asyncio.AbstractEventLoop) -> None:
    """Daemon thread: checks schedule every 30 seconds."""
    schedule.every(1).minutes.do(_check_and_brief, loop)
    while True:
        schedule.run_pending()
        _time.sleep(30)


# ── Main loop ─────────────────────────────────────────────────────────

async def _listen_reply(max_secs: float = 5.0) -> str:
    """Record a short follow-up reply (yes/no). Uses VAD if available, else fixed 3s."""
    if SD_AVAILABLE:
        subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"], capture_output=True)
        audio = await record_vad(max_secs=max_secs)
        if not audio:
            return ""
    else:
        subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"], capture_output=True)
        audio = await record(seconds=3)
    text = await transcribe(audio)
    Path(audio).unlink(missing_ok=True)
    return text or ""


async def _conversation_loop(
    history: list,
    current_topic_ref: list,   # mutable [str|None]
    last_url_ref: list,        # mutable [str|None]
    last_built_url_ref: list,  # mutable [str|None]
    wake_word_mode: bool,
    prefill_question: str = "",
) -> "bool | str":
    """
    Run one conversation turn.
    Returns True to stay in conversation, False for silence, "sleep" for explicit sleep word.
    prefill_question: skip recording and use this as the question (inline wake word question).
    """
    current_topic    = current_topic_ref[0]
    last_url         = last_url_ref[0]
    last_built_url   = last_built_url_ref[0]

    # ── Record speech (or use prefilled inline question) ──────────────
    if prefill_question:
        question = prefill_question
    elif wake_word_mode and SD_AVAILABLE:
        # Fire Tink in thread — recording starts immediately, no speech clipped
        asyncio.get_running_loop().run_in_executor(
            None, lambda: subprocess.run(["afplay", "/System/Library/Sounds/Tink.aiff"], capture_output=True)
        )
        print(f"{DIM}[Listening...]{RESET}", flush=True)
        audio = await record_vad(max_secs=MAX_RECORD_SECS)
        if not audio:
            return False   # silence → back to sleep
        print(f"{DIM}[Transcribing...]{RESET}")
        question = await transcribe(audio)
        Path(audio).unlink(missing_ok=True)
    else:
        print(f"{DIM}[Recording 8s — speak now...]{RESET}")
        audio = await record(seconds=8)
        print(f"{DIM}[Transcribing...]{RESET}")
        question = await transcribe(audio)
        Path(audio).unlink(missing_ok=True)

    if not question or len(question.strip()) < 3:
        print(f"{DIM}[Could not hear you]{RESET}")
        if not wake_word_mode:
            await speak("Didn't catch that. Try again.")
        return False   # silence timeout

    question = fix_names(question.strip())
    print(f"\n{BOLD}You:{RESET}    {question}")

    # ── Sleep / goodbye detection ────────────────────────────────────
    if wake_word_mode and _is_sleep_word(question):
        await speak("Going to sleep. Say Basnet when you need me.")
        current_topic_ref[0]  = None
        last_url_ref[0]       = None
        last_built_url_ref[0] = None
        return "sleep"   # explicit sleep — skip "Still there?" and go straight to wake loop

    # ── Voice triggers (morning briefing, run scout, etc.) ──────
    trigger = match_trigger(question)
    if trigger:
        t_url, t_body = trigger
        is_blog = (t_body.get("data") or {}).get("marketingTrigger") == "write_blog_post"
        label   = t_body.get("trigger", "agent").upper()
        print(f"{CYAN}[TRIGGER → {label}]{RESET}")

        if is_blog:
            blog_topic = extract_blog_topic(question)
            await speak("On it. Writing the post now — give me a minute.")
            body_sent = {**t_body, "secret": WEBHOOK_SECRET}
            if blog_topic:
                body_sent = {**body_sent, "data": {**(t_body.get("data") or {}), "topic": blog_topic}}
            try:
                async with httpx.AsyncClient(timeout=180) as _c:
                    _r = await _c.post(t_url, json=body_sent)
                    _d = _r.json()
            except Exception as _e:
                _d = {"error": str(_e)}

            if _d.get("slug") and _d.get("title"):
                post_url = f"{VERCEL_URL}/blog/{_d['slug']}"
                response = f"Blog post written: {_d['title']}."
                print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response}\n")
                await speak(response)
                history.append({"q": question, "a": response})

                await speak("Want me to open it in your browser?")
                _or = await _listen_reply()
                if _or and is_yes(_or):
                    open_chrome(post_url)
                    await speak("Opening now.")

                await speak("Want me to write another blog post?")
                _nr = await _listen_reply()
                if _nr and is_yes(_nr):
                    await speak("On it. Writing the next post now.")
                    response2 = await fire_trigger(t_url, t_body)
                    print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response2}\n")
                    await speak(response2)
            else:
                err = str(_d.get("error") or _d.get("message") or "Blog post failed.")
                print(f"\n{RED}Basnet:{RESET} {err}\n")
                await speak(err)
        else:
            is_social = (t_body.get("data") or {}).get("marketingTrigger") == "draft_social_posts"
            await speak("On it.")
            body_sent2 = {**t_body, "secret": WEBHOOK_SECRET}
            try:
                async with httpx.AsyncClient(timeout=180) as _c2:
                    _r2 = await _c2.post(t_url, json=body_sent2)
                    _d2 = _r2.json()
            except Exception as _e2:
                _d2 = {"error": str(_e2)}

            if is_social and _d2.get("drafted") is not None:
                platforms = ", ".join(_d2.get("platforms") or [])
                response = f"Drafted {_d2['drafted']} social posts for {platforms}."
                print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response}\n")
                await speak(response)
                history.append({"q": question, "a": response})

                await speak("Want me to open the dashboard so you can review and approve them?")
                _dr = await _listen_reply()
                if _dr and is_yes(_dr):
                    open_chrome(f"{VERCEL_URL}/dashboard/agent")
                    await speak("Opening dashboard now.")
            else:
                response = str(
                    _d2.get("briefing") or _d2.get("answer") or _d2.get("message") or
                    _d2.get("result") or _d2.get("error") or "Done."
                )[:400]
                print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response}\n")
                await speak(response)
                history.append({"q": question, "a": response})
        current_topic_ref[0] = current_topic
        last_url_ref[0]      = last_url
        last_built_url_ref[0] = last_built_url
        return True

    # ── "Open that/it in browser" follow-up ──────────────────────
    q_lower = question.lower()
    if any(p in q_lower for p in ["open that", "open it", "open in browser", "show me that", "show that"]):
        target_url = last_built_url or last_url
        if target_url:
            open_chrome(target_url)
            response = f"Opening {target_url}."
            print(f"\n  {GREEN}[APP]{RESET}")
            print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response}\n")
            await speak(response)
            history.append({"q": question, "a": response})
            current_topic_ref[0] = current_topic
            return True

    # ── Build / create (websites, apps, games, agents) ────────────
    if is_build_query(question):
        print(f"{DIM}[Building...]{RESET}")
        await speak("On it. Give me a moment.")
        d: dict = {}   # init so the else branch below is safe if the request fails
        try:
            async with httpx.AsyncClient(timeout=300) as c:
                r = await c.post(
                    f"{LOCAL_AGENT_URL}/build",
                    headers={"x-agent-secret": WEBHOOK_SECRET} if WEBHOOK_SECRET else {},
                    json={"task": question},
                )
                d = r.json()
                response = d.get("answer") or "Build complete."
                url_built = d.get("url")
        except Exception as e:
            response = f"Build failed: {e}"
            url_built = None
        if url_built:
            last_built_url = url_built
        else:
            file_path = d.get("filePath", "")
            if file_path.startswith("public/"):
                last_built_url = f"http://localhost:3000/{file_path.replace('public/', '')}"
            else:
                last_built_url = None
        print(f"\n  {GREEN}[BUILD]{RESET}")
        print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response}\n")
        await speak(response)
        if last_built_url:
            open_chrome(last_built_url)
            await speak("Opening in browser now.")
        history.append({"q": question, "a": response})
        last_built_url_ref[0] = last_built_url
        current_topic_ref[0]  = current_topic
        return True

    # ── Shell command execution ───────────────────────────────────
    elif is_exec_query(question):
        print(f"{DIM}[Running command...]{RESET}")
        try:
            async with httpx.AsyncClient(timeout=60) as c:
                r = await c.post(
                    f"{LOCAL_AGENT_URL}/exec",
                    headers={"x-agent-secret": WEBHOOK_SECRET} if WEBHOOK_SECRET else {},
                    json={"command": question,
                          "cwd": str(Path.home() / "Desktop" / "sab-account-ai-project")},
                )
                d = r.json()
                out = (d.get("stdout") or d.get("stderr") or "(no output)").strip()
                response = out[:500] + ("..." if len(out) > 500 else "")
                if d.get("exitCode", 0) != 0:
                    response = f"Exit code {d['exitCode']}. " + response
        except Exception as e:
            response = f"Command failed: {e}"
        print(f"\n  {GREEN}[EXEC]{RESET}")
        print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response}\n")
        await speak(response[:200])
        history.append({"q": question, "a": response})
        return True

    # ── App open/close ────────────────────────────────────────────
    elif is_app_query(question):
        print(f"{DIM}[App control...]{RESET}")
        if any(w in q_lower for w in ["what apps", "what is running", "running apps"]):
            action_body = {"action": "list"}
        elif any(w in q_lower for w in ["close", "quit"]):
            name = question.replace("close", "").replace("quit", "").replace("app", "").strip()
            action_body = {"action": "close", "name": name}
        else:
            name = re.sub(r"(?i)open\s+", "", question).strip()
            action_body = {"action": "open", "name": name}
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.post(
                    f"{LOCAL_AGENT_URL}/app",
                    headers={"x-agent-secret": WEBHOOK_SECRET} if WEBHOOK_SECRET else {},
                    json=action_body,
                )
                d = r.json()
                if d.get("apps"):
                    response = "Running: " + ", ".join(d["apps"][:10])
                elif d.get("opened"):
                    response = f"Opened {d['opened']}."
                elif d.get("closed"):
                    response = f"Closed {d['closed']}."
                else:
                    response = "Done."
        except Exception as e:
            response = f"App control failed: {e}"
        print(f"\n  {GREEN}[APP]{RESET}")
        print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response}\n")
        await speak(response)
        history.append({"q": question, "a": response})
        return True

    # ── Local Mac agent (file/computer/code queries bypass Vercel) ──
    elif is_code_query(question):
        print(f"{DIM}[Asking Flux (local)...]{RESET}")
        local_answer = await call_local_agent(question, "/technical")
        if local_answer:
            print(f"\n  {GREEN}[FLUX — LOCAL]{RESET}")
            print(f"\n{GREEN}{BOLD}Basnet:{RESET} {local_answer}\n")
            await speak(local_answer)
            history.append({"q": question, "a": local_answer})
            return True
        print(f"{DIM}[Local Flux unavailable — falling back to Vercel]{RESET}")

    if is_local_query(question):
        print(f"{DIM}[Asking local agent...]{RESET}")
        local_answer = await call_local_agent(question)
        if local_answer:
            print(f"\n{GREEN}{BOLD}Basnet:{RESET} {local_answer}\n")
            await speak(local_answer)
            history.append({"q": question, "a": local_answer})
            return True
        print(f"{DIM}[Local agent unavailable — falling back to Basnet]{RESET}")

    # ── Standard voice route ─────────────────────────────────────
    print(f"{DIM}[Asking Basnet...]{RESET}")
    data = await call_voice(question, history, current_topic)

    response       = data.get("response", "No response.")
    warning        = data.get("warning")
    topic          = data.get("topic") or current_topic
    is_done        = data.get("is_complete", False)
    suggestion     = data.get("next_suggestion")
    url            = data.get("url")
    agent_used     = data.get("agentUsed", "basnet").upper()
    classification = data.get("classification", "")

    agent_colour = {"RELAY": CYAN, "FLUX": GREEN, "LIFT": "\033[94m",
                    "ATLAS": YELLOW, "SPARK": "\033[95m"}.get(agent_used, "")
    if classification == "STRATEGY":
        print(f"  {BOLD}\033[95m[FABLE 5 — STRATEGY MODE]{RESET}")
    else:
        print(f"  {agent_colour}[{agent_used}]{RESET}")

    if warning:
        print(f"\n{YELLOW}⚠️  {warning}{RESET}")
        await speak(f"Warning. {warning}")

    print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response}\n")
    await speak(response)

    current_topic = topic
    history.append({"q": question, "a": response})
    if len(history) > 10:
        history[:] = history[-10:]   # mutate in-place so main()'s list is also trimmed

    if url and any(d in url for d in OPEN_DOMAINS):
        print(f"{DIM}[URL: {url}]{RESET}")
        await speak("Want me to open that in your browser?")
        reply = await _listen_reply()
        if reply and is_yes(reply):
            open_chrome(url)
            last_url = url
            await speak("Opening now.")

    if is_done and suggestion:
        print(f"{DIM}[Topic complete: {current_topic}]{RESET}")
        await speak(f"We covered that. {suggestion} Say yes to continue.")
        gate_reply = await _listen_reply()
        if gate_reply and is_yes(gate_reply):
            current_topic = None
            last_url = None
            history.clear()
            await speak("Starting fresh. What's next?")

    current_topic_ref[0]  = current_topic
    last_url_ref[0]       = last_url
    last_built_url_ref[0] = last_built_url
    return True


async def main():
    if SD_AVAILABLE:
        mode_line = "Say 'Basnet' to wake me up"
    else:
        mode_line = "Press Enter to speak  (install sounddevice for wake word)"

    print(f"\n{BOLD}{'='*52}{RESET}")
    print(f"{BOLD}  Basnet Voice — Always Listening{RESET}")
    print(f"  {DIM}sabaccountai.com · {mode_line}{RESET}")
    print(f"  {DIM}Say 'bye Basnet' to go back to sleep{RESET}")
    print(f"  {DIM}Morning brief fires at 8am AEST automatically{RESET}")
    print(f"{BOLD}{'='*52}{RESET}\n")

    if not WEBHOOK_SECRET:
        print(f"{RED}WARNING: AGENT_WEBHOOK_SECRET not set — auth will fail{RESET}")
    if not ELEVENLABS_KEY:
        print(f"{DIM}TTS: Mac say (set ELEVENLABS_API_KEY for better voice){RESET}")
    if not SD_AVAILABLE:
        print(f"{YELLOW}sounddevice not installed — wake word disabled. Run: pip3 install sounddevice numpy{RESET}")

    # Pre-warm whisper model in background so first detection is instant
    if SD_AVAILABLE:
        asyncio.get_running_loop().run_in_executor(None, _get_whisper)

    await speak("Basnet online.")

    # ── Start morning briefing scheduler (8am AEST, no wake word) ────────
    _loop = asyncio.get_running_loop()
    _sched_thread = threading.Thread(
        target=_start_scheduler, args=(_loop,), daemon=True,
    )
    _sched_thread.start()

    history: list              = []
    current_topic_ref: list    = [None]
    last_url_ref: list         = [None]
    last_built_url_ref: list   = [None]

    while True:
        try:
            # ── Wake word gate ────────────────────────────────────────────
            if SD_AVAILABLE:
                print(f"\n{DIM}[Sleeping — say 'Basnet' to wake me up...]{RESET}", flush=True)
                detected, inline_q = await wait_for_wake_word()
                print(f"{DIM}[Wake word: \"{detected.strip()}\"]{RESET}")
                subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"], capture_output=True)

                if inline_q and len(inline_q) > 4:
                    # User said "Basnet what time is it?" — answer immediately
                    print(f"{DIM}[Inline question: {inline_q!r}]{RESET}")
                    inline_result = await _conversation_loop(
                        history, current_topic_ref, last_url_ref, last_built_url_ref,
                        wake_word_mode=True, prefill_question=inline_q,
                    )
                    if inline_result == "sleep":
                        continue   # skip conversation loop, go back to wake word gate
                else:
                    await speak("How can I help you?")
            else:
                topic_label = f" {DIM}[{current_topic_ref[0]}]{RESET}" if current_topic_ref[0] else ""
                input(f"\nPress Enter to speak{topic_label}...")
                subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"], capture_output=True)

            # ── Conversation loop (stays awake until sleep word / 2 silent) ──
            silent_turns = 0
            while True:
                try:
                    stay = await _conversation_loop(
                        history, current_topic_ref, last_url_ref, last_built_url_ref,
                        wake_word_mode=SD_AVAILABLE,
                    )
                    if stay == "sleep":
                        # Explicit sleep word — go back to wake loop immediately, no "Still there?"
                        print(f"{DIM}[Sleep word — going back to listening for 'Basnet']{RESET}", flush=True)
                        break
                    elif stay:
                        silent_turns = 0
                        if not SD_AVAILABLE:
                            break   # fallback mode: one question at a time
                    else:
                        silent_turns += 1
                        if silent_turns >= 2 or not SD_AVAILABLE:
                            if SD_AVAILABLE:
                                print(f"{DIM}[No speech — going back to sleep]{RESET}")
                            last_built_url_ref[0] = None   # clear stale build URL on timeout
                            break
                        # one silent turn: give another chance
                        await speak("Still there?")
                except KeyboardInterrupt:
                    raise
                except Exception as e:
                    print(f"{RED}Error: {e}{RESET}")
                    await asyncio.sleep(0.5)
                    if not SD_AVAILABLE:
                        break

        except KeyboardInterrupt:
            print(f"\n{DIM}Basnet signing off.{RESET}")
            await speak("Basnet offline.")
            break
        except Exception as e:
            print(f"{RED}Outer error: {e}{RESET}")
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
