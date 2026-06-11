"""
Basnet Voice — Direct to Vercel
Press Enter to speak. Basnet listens for 8 seconds and responds.
No local agent server required — routes straight to sabaccountai.com

Requirements:
  pip3 install httpx openai
  brew install sox

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
from pathlib import Path

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

# Colours
CYAN    = "\033[96m"
GREEN   = "\033[92m"
YELLOW  = "\033[93m"
RED     = "\033[91m"
DIM     = "\033[2m"
BOLD    = "\033[1m"
RESET   = "\033[0m"


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
        ["write blog post", "write a blog", "spark blog", "generate blog", "new blog post"],
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
                    model="whisper-1", file=f, language="en"
                )
            return result.text.strip()
        except Exception as e:
            print(f"{DIM}[OpenAI Whisper failed: {e} — trying local]{RESET}")

    # Fall back to local Whisper
    txt_path = Path("/tmp") / (Path(audio_path).stem + ".txt")
    subprocess.run(
        ["whisper", audio_path,
         "--model", "small.en",
         "--language", "en",
         "--output_format", "txt",
         "--output_dir", "/tmp"],
        capture_output=True,
        env={**os.environ, "PYTHONHTTPSVERIFY": "0"},
    )
    if txt_path.exists():
        text = txt_path.read_text().strip()
        txt_path.unlink(missing_ok=True)
        return text
    return ""


# ── TTS: speak ────────────────────────────────────────────────────────

async def speak(text: str):
    if ELEVENLABS_KEY and ELEVENLABS_VOICE:
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE}",
                    headers={"xi-api-key": ELEVENLABS_KEY},
                    json={
                        "text": text,
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

    clean = re.sub(r"[*_`#]", "", text)
    subprocess.run(["say", "-v", "Daniel", "-r", "175", clean])


# ── Whisper name corrections ──────────────────────────────────────────

NAME_FIXES = {
    "basenet": "Basnet", "bassnet": "Basnet", "basnit": "Basnet", "smith": "Basnet",
    "flux": "Flux", "fox": "Flux", "flocks": "Flux",
    "spark": "Spark", "sparks": "Spark",
    "versa": "Vercel", "vessel": "Vercel",
    "chord": "code", "cord": "code",
}

def fix_names(text: str) -> str:
    for wrong, right in NAME_FIXES.items():
        text = re.sub(rf"\b{wrong}\b", right, text, flags=re.IGNORECASE)
    return text


# ── API calls ─────────────────────────────────────────────────────────

async def call_voice(question: str, history: list, current_topic: str | None) -> dict:
    """Route question to /api/agents/voice — handles all classification internally."""
    try:
        async with httpx.AsyncClient(timeout=45) as c:
            r = await c.post(
                f"{VERCEL_URL}/api/agents/voice",
                json={
                    "secret":        WEBHOOK_SECRET,
                    "input":         question,
                    "mode":          "voice",
                    "history":       history[-5:],
                    "current_topic": current_topic,
                },
            )
            return r.json()
    except Exception as e:
        return {"response": f"Basnet unreachable: {e}", "warning": None,
                "topic": current_topic, "is_complete": False, "next_suggestion": None}


async def fire_trigger(url: str, body: dict) -> str:
    """Fire a direct Basnet endpoint and return a short spoken summary."""
    body = {**body, "secret": WEBHOOK_SECRET}
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(url, json=body)
            d = r.json()
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


# ── Main loop ─────────────────────────────────────────────────────────

async def main():
    print(f"\n{BOLD}{'='*52}{RESET}")
    print(f"{BOLD}  Basnet Voice — Direct to Production{RESET}")
    print(f"  {DIM}sabaccountai.com · Press Enter to speak{RESET}")
    print(f"  {DIM}Say 'morning briefing', 'run scout', or ask anything{RESET}")
    print(f"{BOLD}{'='*52}{RESET}\n")

    if not WEBHOOK_SECRET:
        print(f"{RED}WARNING: AGENT_WEBHOOK_SECRET not set — auth will fail{RESET}")
    if not ELEVENLABS_KEY:
        print(f"{DIM}TTS: Mac say (set ELEVENLABS_API_KEY for better voice){RESET}")

    await speak("Basnet online.")

    history: list       = []
    current_topic: str | None = None
    last_url: str | None = None

    while True:
        try:
            topic_label = f" {DIM}[{current_topic}]{RESET}" if current_topic else ""
            input(f"\nPress Enter to speak{topic_label}...")
            subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"],
                           capture_output=True)
            print(f"{DIM}[Recording 8s — speak now...]{RESET}")

            audio = await record(seconds=8)
            print(f"{DIM}[Transcribing...]{RESET}")
            question = await transcribe(audio)
            Path(audio).unlink(missing_ok=True)

            if not question or len(question.strip()) < 3:
                print(f"{DIM}[Could not hear you]{RESET}")
                await speak("Didn't catch that. Try again.")
                continue

            question = fix_names(question.strip())
            print(f"\n{BOLD}You:{RESET}    {question}")

            # ── Voice triggers (morning briefing, run scout, etc.) ──────
            trigger = match_trigger(question)
            if trigger:
                t_url, t_body = trigger
                label = t_body.get("trigger", "agent").upper()
                print(f"{CYAN}[TRIGGER → {label}]{RESET}")
                await speak("On it.")
                response = await fire_trigger(t_url, t_body)
                print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response}\n")
                await speak(response)
                history.append({"q": question, "a": response})
                continue

            # ── Standard voice route ─────────────────────────────────────
            print(f"{DIM}[Asking Basnet...]{RESET}")
            data = await call_voice(question, history, current_topic)

            response   = data.get("response", "No response.")
            warning    = data.get("warning")
            topic      = data.get("topic") or current_topic
            is_done    = data.get("is_complete", False)
            suggestion = data.get("next_suggestion")
            url        = data.get("url")
            agent_used = data.get("agentUsed", "basnet").upper()

            # Print agent label
            agent_colour = {"RELAY": CYAN, "FLUX": GREEN, "LIFT": "\033[94m",
                            "ATLAS": YELLOW, "SPARK": "\033[95m"}.get(agent_used, "")
            print(f"  {agent_colour}[{agent_used}]{RESET}")

            # Speak warning first
            if warning:
                print(f"\n{YELLOW}⚠️  {warning}{RESET}")
                await speak(f"Warning. {warning}")

            print(f"\n{GREEN}{BOLD}Basnet:{RESET} {response}\n")
            await speak(response)

            # Update state
            current_topic = topic
            history.append({"q": question, "a": response})
            if len(history) > 6:
                history = history[-6:]

            # Offer to open URLs from Basnet
            if url and any(d in url for d in OPEN_DOMAINS):
                print(f"{DIM}[URL: {url}]{RESET}")
                await speak("Want me to open that in your browser?")
                subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"],
                               capture_output=True)
                print(f"{DIM}[Listening 3s...]{RESET}")
                reply_audio = await record(seconds=3)
                reply = await transcribe(reply_audio)
                Path(reply_audio).unlink(missing_ok=True)
                if reply and is_yes(reply):
                    open_chrome(url)
                    last_url = url
                    await speak("Opening now.")

            # Topic complete gate
            if is_done and suggestion:
                print(f"{DIM}[Topic complete: {current_topic}]{RESET}")
                await speak(f"We covered that. {suggestion} Say yes to continue or just press Enter.")
                subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"],
                               capture_output=True)
                gate_audio = await record(seconds=3)
                gate_reply = await transcribe(gate_audio)
                Path(gate_audio).unlink(missing_ok=True)
                if gate_reply and is_yes(gate_reply):
                    current_topic = None
                    last_url = None
                    history = []
                    await speak("Starting fresh. What's next?")

        except KeyboardInterrupt:
            print(f"\n{DIM}Basnet signing off.{RESET}")
            await speak("Basnet offline.")
            break
        except Exception as e:
            print(f"{RED}Error: {e}{RESET}")
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
