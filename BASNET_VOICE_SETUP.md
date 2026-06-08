# Basnet Voice Setup

Runs on your MacBook only. Not deployed to Vercel.
Uses your microphone → Whisper STT → Basnet API → Mac say (or ElevenLabs TTS).

## Step 1 — Install dependencies

```bash
pip3 install -r basnet_requirements.txt
brew install sox ffmpeg
```

## Step 2 — Download Whisper model

```bash
whisper --model base --download-root ~/.cache/whisper /dev/null --language en
```

Takes ~1 minute. Downloads ~150MB.

## Step 3 — Set environment variables

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export AGENT_WEBHOOK_SECRET=aa3236372cac2fe41bf7749e21669fdd74e837008742519e2b4570ef98c43958
export AGENT_URL=https://sabaccountai.com/api/agents/voice

# Optional — only needed for ElevenLabs voice
export ELEVENLABS_API_KEY=your_key_here
export ELEVENLABS_VOICE_ID=your_voice_id_here
```

Then reload: `source ~/.zshrc`

## Step 4 — Run

```bash
python3 basnet_voice.py
```

## Without ElevenLabs (free, works right now)

Basnet will speak using Mac's built-in **Daniel** voice (Australian male).
Quality is decent. Cost: $0.

## With ElevenLabs ($5/month)

1. Sign up at elevenlabs.io
2. Get an API key
3. Choose a voice (or clone your own)
4. Set the env vars above
5. Much more natural voice

## To clone your own voice (optional, ~$22/month)

1. Record 30 seconds of yourself speaking clearly
2. Upload to ElevenLabs → Voice Cloning
3. Basnet will speak in your own voice
4. Copy the Voice ID to ELEVENLABS_VOICE_ID

## Wake word

Say: **"Hey Basnet"** or just **"Basnet"**
Wait for the Ping sound
Then ask your question (8 second window)

## Example

```
"Hey Basnet"
[Ping]
"What's my MRR?"
→ "One hundred and eighty nine dollars. Up thirty six from last week."
```

## Troubleshooting

- **sox: command not found** → `brew install sox`
- **whisper: command not found** → `pip3 install openai-whisper`
- **No audio** → Check System Preferences → Security → Microphone access for Terminal
- **API error** → Check AGENT_WEBHOOK_SECRET matches .env.local
