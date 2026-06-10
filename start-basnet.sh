#!/bin/bash
# Start Basnet — one command, everything runs

PROJECT="$HOME/Desktop/sab-account-ai-project"

# Kill any existing local agent
lsof -ti:3099 | xargs kill -9 2>/dev/null

# Start local agent in background
cd "$PROJECT/local-agent"
npm run dev > /tmp/basnet-agent.log 2>&1 &
AGENT_PID=$!

# Wait for it to be ready
echo "Starting Basnet local agent..."
for i in {1..10}; do
  if curl -s http://127.0.0.1:3099/health > /dev/null 2>&1; then
    echo "Agent ready."
    break
  fi
  sleep 1
done

# Start voice
cd "$PROJECT"
source "$HOME/.basnet-venv/bin/activate"
python3 basnet_voice.py

# When voice exits, kill the agent
kill $AGENT_PID 2>/dev/null
