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
LOCAL_AGENT_URL = os.environ.get("LOCAL_AGENT_URL", "http://127.0.0.1:3099")

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
    "list files", "ls ", "find files", "kill process",
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
    last_built_url: str | None = None

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
                is_blog = (t_body.get("data") or {}).get("marketingTrigger") == "write_blog_post"
                label   = t_body.get("trigger", "agent").upper()
                print(f"{CYAN}[TRIGGER → {label}]{RESET}")

                if is_blog:
                    await speak("On it. Writing the post now — give me a minute.")
                    body_sent = {**t_body, "secret": WEBHOOK_SECRET}
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

                        # Offer to open in browser
                        await speak("Want me to open it in your browser?")
                        subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"], capture_output=True)
                        _oa = await record(seconds=3)
                        _or = await transcribe(_oa)
                        Path(_oa).unlink(missing_ok=True)
                        if _or and is_yes(_or):
                            open_chrome(post_url)
                            await speak("Opening now.")

                        # Offer to write another
                        await speak("Want me to write another blog post?")
                        subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"], capture_output=True)
                        _na = await record(seconds=3)
                        _nr = await transcribe(_na)
                        Path(_na).unlink(missing_ok=True)
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

                        # Offer to open dashboard
                        await speak("Want me to open the dashboard so you can review and approve them?")
                        subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"], capture_output=True)
                        _da = await record(seconds=3)
                        _dr = await transcribe(_da)
                        Path(_da).unlink(missing_ok=True)
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
                continue

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
                    continue
                # No URL to open — fall through to normal routing

            # ── Build / create (websites, apps, games, agents) ────────────
            if is_build_query(question):
                print(f"{DIM}[Building...]{RESET}")
                await speak("On it. Give me a moment.")
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
                    # local file — build a localhost URL
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
                continue

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
                continue

            # ── App open/close ────────────────────────────────────────────
            elif is_app_query(question):
                print(f"{DIM}[App control...]{RESET}")
                q_lower = question.lower()
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
                continue

            # ── Local Mac agent (file/computer/code queries bypass Vercel) ──
            elif is_code_query(question):
                print(f"{DIM}[Asking Flux (local)...]{RESET}")
                local_answer = await call_local_agent(question, "/technical")
                if local_answer:
                    print(f"\n  {GREEN}[FLUX — LOCAL]{RESET}")
                    print(f"\n{GREEN}{BOLD}Basnet:{RESET} {local_answer}\n")
                    await speak(local_answer)
                    history.append({"q": question, "a": local_answer})
                    continue
                print(f"{DIM}[Local Flux unavailable — falling back to Vercel]{RESET}")

            if is_local_query(question):
                print(f"{DIM}[Asking local agent...]{RESET}")
                local_answer = await call_local_agent(question)
                if local_answer:
                    print(f"\n{GREEN}{BOLD}Basnet:{RESET} {local_answer}\n")
                    await speak(local_answer)
                    history.append({"q": question, "a": local_answer})
                    continue
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

            # Print agent label — show Fable 5 badge on strategy mode
            agent_colour = {"RELAY": CYAN, "FLUX": GREEN, "LIFT": "\033[94m",
                            "ATLAS": YELLOW, "SPARK": "\033[95m"}.get(agent_used, "")
            if classification == "STRATEGY":
                print(f"  {BOLD}\033[95m[FABLE 5 — STRATEGY MODE]{RESET}")
            else:
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
