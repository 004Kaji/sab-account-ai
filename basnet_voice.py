"""
Basnet Voice — runs on MacBook only. NOT deployed to Vercel.
Press Enter to speak, Basnet listens for 8 seconds and responds.
Calls /api/agents/voice and speaks the response.

Requirements: pip3 install -r basnet_requirements.txt
              brew install sox ffmpeg
"""

import asyncio
import httpx
import os
import ssl
import subprocess
import tempfile
from pathlib import Path

# Fix SSL certificate issue on Mac
ssl._create_default_https_context = ssl._create_unverified_context
os.environ['PYTHONHTTPSVERIFY'] = '0'

AGENT_URL        = "https://sabaccountai.com/api/agents/voice"
WEBHOOK_SECRET   = os.environ.get("AGENT_WEBHOOK_SECRET", "")
ELEVENLABS_KEY   = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "")


async def transcribe(audio_path: str) -> str:
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


async def ask_basnet(text: str) -> str:
    if not WEBHOOK_SECRET:
        return "AGENT_WEBHOOK_SECRET not set."
    async with httpx.AsyncClient(timeout=20) as c:
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
    print("Basnet Voice — Ready")
    print("Press ENTER to speak, then talk for 8 seconds")
    print("Ctrl+C to stop")
    if not ELEVENLABS_KEY:
        print("Using Mac say (no ElevenLabs key)")
    if not WEBHOOK_SECRET:
        print("WARNING: AGENT_WEBHOOK_SECRET not set")
    print("=" * 50)

    await speak("Basnet online. Press Enter to speak.")

    while True:
        try:
            input("\nPress Enter to speak...")
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

            print(f"You:    {question}")
            print("[Thinking...]")
            answer = await ask_basnet(question)
            print(f"Basnet: {answer}\n")
            await speak(answer)

        except KeyboardInterrupt:
            print("\nBasnet signing off.")
            await speak("Basnet offline.")
            break
        except Exception as e:
            print(f"Error: {e}")
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
