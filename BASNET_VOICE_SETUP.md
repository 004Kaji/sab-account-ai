# Basnet Voice — Setup Guide

Runs on your MacBook only. Not deployed to Vercel.
Uses microphone → Whisper STT → Basnet API → Mac say (or ElevenLabs TTS).

## Install dependencies

```bash
pip3 install -r basnet_requirements.txt
brew install sox ffmpeg
```

## Download Whisper model (first run only)

```bash
python3 -c "import whisper; whisper.load_model('base')"
```

This downloads ~140MB once and caches it.

## Set environment variables

Add to your `~/.zshrc` or `~/.bash_profile`:

```bash
export AGENT_WEBHOOK_SECRET=your_secret_here
export ELEVENLABS_API_KEY=your_key     # optional
export ELEVENLABS_VOICE_ID=your_id     # optional
```

Then reload: `source ~/.zshrc`

## Run Basnet Voice

```bash
python3 basnet_voice.py
```

## Without ElevenLabs

Works immediately using Mac built-in `say -v Daniel`.
Cost: $0. Quality: good enough to start.

## With ElevenLabs (recommended)

1. Sign up at elevenlabs.io
2. Free tier: 10,000 chars/month
3. Pick any voice — or clone your own:
   - Record 30 seconds of yourself speaking clearly
   - Upload to ElevenLabs → Voice Lab → Add Voice
   - Copy the Voice ID into `ELEVENLABS_VOICE_ID`

## Test it works

```bash
python3 basnet_voice.py
```

1. Wait for "Basnet online" announcement
2. Say "Hey Basnet"
3. Wait for ping sound
4. Say "how many users do I have"
5. Basnet responds with real user count from Supabase

## Troubleshooting

**No audio recorded**: `brew install sox` and try again.

**Whisper not found**: `pip3 install openai-whisper` then check PATH.

**"AGENT_WEBHOOK_SECRET not set"**: Export the variable in your shell — see above.

**Voice not waking**: Speak clearly. "Basnet" or "Hey Basnet". If still failing,
set `WHISPER_MODEL=small` and re-run (slower but more accurate).

**ElevenLabs not working**: Falls back to `say -v Daniel` automatically.
