"""
Basnet Voice — runs on Sanjog's MacBook only.
NOT deployed to Vercel.

Wake word: "hey basnet" or "basnet"
Uses Whisper for STT, ElevenLabs or Mac say for TTS.
Calls /api/agents/voice on SAB Account AI.

Setup: see BASNET_VOICE_SETUP.md
"""

import asyncio
import os
import subprocess
import tempfile
import json
from pathlib import Path

import httpx

AGENT_URL       = os.environ.get("AGENT_URL", "https://sabaccountai.com/api/agents/voice")
WEBHOOK_SECRET  = os.environ["AGENT_WEBHOOK_SECRET"]
ELEVENLABS_KEY  = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "")


async def transcribe(audio_path: str) -> str:
    """Convert audio file to text using Whisper locally."""
    result = subprocess.run(
        ["whisper", audio_path, "--model", "base", "--language", "en",
         "--output_format", "txt", "--output_dir", "/tmp"],
        capture_output=True, text=True, timeout=30
    )
    txt = Path("/tmp") / Path(audio_path).with_suffix(".txt").name
    if txt.exists():
        text = txt.read_text().strip()
        txt.unlink(missing_ok=True)
        return text
    return ""


async def record_audio(seconds: int = 8) -> str:
    """Record from Mac microphone using sox."""
    tmp = tempfile.mktemp(suffix=".wav")
    subprocess.run(
        ["sox", "-d", "-r", "16000", "-c", "1", "-b", "16",
         tmp, "trim", "0", str(seconds)],
        capture_output=True, timeout=seconds + 5
    )
    return tmp


async def detect_wake_word(audio_path: str) -> bool:
    """Check if 'hey basnet' or 'basnet' was spoken."""
    result = subprocess.run(
        ["whisper", audio_path, "--model", "tiny", "--language", "en",
         "--output_format", "txt", "--output_dir", "/tmp"],
        capture_output=True, text=True, timeout=15
    )
    txt = Path("/tmp") / Path(audio_path).with_suffix(".txt").name
    if txt.exists():
        text = txt.read_text().lower()
        txt.unlink(missing_ok=True)
        return any(w in text for w in ["basnet", "hey basnet", "bas net", "base net"])
    return False


async def ask_basnet(text: str) -> tuple[str, str]:
    """Send transcribed text to Basnet API. Returns (response, agent_used)."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(AGENT_URL, json={
            "secret": WEBHOOK_SECRET,
            "input": text,
            "mode": "voice"
        })
        data = r.json()
        return data.get("response", "Something went wrong."), data.get("agentUsed", "basnet")


async def speak(text: str) -> None:
    """Convert Basnet's response to speech."""
    if ELEVENLABS_KEY and ELEVENLABS_VOICE:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE}",
                headers={"xi-api-key": ELEVENLABS_KEY},
                json={
                    "text": text,
                    "model_id": "eleven_turbo_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": 1.1}
                }
            )
        tmp = tempfile.mktemp(suffix=".mp3")
        Path(tmp).write_bytes(r.content)
        subprocess.run(["afplay", tmp])
        Path(tmp).unlink(missing_ok=True)
    else:
        # Mac built-in: Australian male voice Daniel
        clean = text.replace("'", "").replace('"', "")
        subprocess.run(["say", "-v", "Daniel", "-r", "190", clean])


async def main() -> None:
    print("=" * 50)
    print("Basnet Voice — Running on MacBook")
    print(f"Agent URL: {AGENT_URL}")
    print("Say 'Hey Basnet' to start")
    print("Ctrl+C to stop")
    print("=" * 50)

    await speak("Basnet online. Watching SAB Account AI. Say hey Basnet anytime.")

    while True:
        try:
            wake_audio = await record_audio(seconds=3)

            if not await detect_wake_word(wake_audio):
                Path(wake_audio).unlink(missing_ok=True)
                continue

            Path(wake_audio).unlink(missing_ok=True)
            subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"])
            print("\n[Basnet listening...]")

            question_audio = await record_audio(seconds=8)
            question_text = await transcribe(question_audio)
            Path(question_audio).unlink(missing_ok=True)

            if not question_text or len(question_text.strip()) < 3:
                await speak("Did not catch that. Try again.")
                continue

            print(f"Sanjog: {question_text}")
            answer, agent = await ask_basnet(question_text)
            print(f"Basnet ({agent}): {answer}\n")
            await speak(answer)

        except KeyboardInterrupt:
            print("\nBasnet Voice shutting down.")
            await speak("Basnet signing off.")
            break
        except subprocess.TimeoutExpired:
            print("[timeout — retrying]")
            await asyncio.sleep(1)
        except Exception as e:
            print(f"Error: {e}")
            await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())
