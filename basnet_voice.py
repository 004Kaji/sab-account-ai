"""
Basnet Voice — runs on MacBook only. NOT deployed to Vercel.
Say "Hey Basnet" to wake, then ask your question.
Calls /api/agents/voice and speaks the response.

Requirements: pip3 install -r basnet_requirements.txt
              brew install sox ffmpeg
"""

import asyncio
import httpx
import os
import subprocess
import tempfile
from pathlib import Path

AGENT_URL        = "https://sabaccountai.com.au/api/agents/voice"
WEBHOOK_SECRET   = os.environ.get("AGENT_WEBHOOK_SECRET", "")
ELEVENLABS_KEY   = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "")


async def transcribe(audio_path: str) -> str:
    txt_path = Path("/tmp") / (Path(audio_path).stem + ".txt")
    subprocess.run(
        [
            "whisper", audio_path,
            "--model", "base",
            "--language", "en",
            "--output_format", "txt",
            "--output_dir", "/tmp",
        ],
        capture_output=True,
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


def detect_wake(audio_path: str) -> bool:
    txt_path = Path("/tmp") / (Path(audio_path).stem + ".txt")
    subprocess.run(
        [
            "whisper", audio_path,
            "--model", "tiny",
            "--language", "en",
            "--output_format", "txt",
            "--output_dir", "/tmp",
        ],
        capture_output=True,
    )
    if txt_path.exists():
        text = txt_path.read_text().lower()
        txt_path.unlink(missing_ok=True)
        return any(w in text for w in ["basnet", "hey basnet", "bas net"])
    return False


async def ask_basnet(text: str) -> str:
    if not WEBHOOK_SECRET:
        return "AGENT_WEBHOOK_SECRET not set."
    async with httpx.AsyncClient(timeout=15) as c:
        try:
            r = await c.post(AGENT_URL, json={
                "secret": WEBHOOK_SECRET,
                "input":  text,
                "mode":   "voice",
            })
            return r.json().get("response", "Could not reach Basnet.")
        except Exception as e:
            return f"Connection error: {e}"


async def speak(text: str):
    # Option A: ElevenLabs (if key set)
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
                pass  # Fall through to Mac say

    # Option B: Mac built-in (free fallback)
    clean = text.replace("'", "").replace('"', "")
    subprocess.run(["say", "-v", "Daniel", clean])


async def main():
    print("=" * 50)
    print("Basnet Voice — Running")
    print("Say 'Hey Basnet' to start")
    print("Ctrl+C to stop")
    if not ELEVENLABS_KEY:
        print("No ElevenLabs key — using Mac say")
    if not WEBHOOK_SECRET:
        print("WARNING: AGENT_WEBHOOK_SECRET not set")
    print("=" * 50)

    await speak("Basnet online. Watching SAB Account AI. Say hey Basnet anytime.")

    while True:
        try:
            wake_audio = await record(seconds=3)
            detected   = detect_wake(wake_audio)
            Path(wake_audio).unlink(missing_ok=True)

            if not detected:
                continue

            # Wake word detected
            subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"])
            print("\n[Listening...]")

            q_audio  = await record(seconds=8)
            question = await transcribe(q_audio)
            Path(q_audio).unlink(missing_ok=True)

            if not question or len(question) < 3:
                await speak("Did not catch that.")
                continue

            print(f"You:    {question}")
            answer = await ask_basnet(question)
            print(f"Basnet: {answer}\n")
            await speak(answer)

        except KeyboardInterrupt:
            print("\nBasnet signing off.")
            await speak("Basnet offline.")
            break
        except Exception as e:
            print(f"Error: {e}")
            await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())
