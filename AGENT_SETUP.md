# AGENT SETUP — n8n Workflow Configuration

Configure these 5 workflows in your n8n instance to activate the Basnet Agent System.
All workflows POST to the webhook entry point with the AGENT_WEBHOOK_SECRET.

Replace `[your-domain]` with your production URL (e.g. `https://sabaccountai.com.au`).
Replace `[AGENT_WEBHOOK_SECRET]` with the value from your `.env.local`.

---

## Workflow 1: Morning Briefing

**Trigger:** Every day at 7:00am AEST (21:00 UTC previous day)

**Node:** HTTP Request
- Method: POST
- URL: `[your-domain]/api/agents/webhooks`
- Body (JSON):
```json
{
  "secret": "[AGENT_WEBHOOK_SECRET]",
  "trigger": "morning_briefing"
}
```

---

## Workflow 2: Weekly Content Brief

**Trigger:** Every Monday at 6:00am AEST (20:00 UTC Sunday)

**Node:** HTTP Request
- Method: POST
- URL: `[your-domain]/api/agents/webhooks`
- Body (JSON):
```json
{
  "secret": "[AGENT_WEBHOOK_SECRET]",
  "trigger": "weekly_brief"
}
```

---

## Workflow 3: Accountant Emails

**Trigger:** Every Friday at 7:00am AEST (21:00 UTC Thursday)

**Node:** HTTP Request
- Method: POST
- URL: `[your-domain]/api/agents/webhooks`
- Body (JSON):
```json
{
  "secret": "[AGENT_WEBHOOK_SECRET]",
  "trigger": "accountant_emails"
}
```

---

## Workflow 4: Product Health Check

**Trigger:** Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)

**Node:** HTTP Request
- Method: POST
- URL: `[your-domain]/api/agents/webhooks`
- Body (JSON):
```json
{
  "secret": "[AGENT_WEBHOOK_SECRET]",
  "trigger": "health_check"
}
```

---

## Workflow 5: Weekly Learning

**Trigger:** Every Sunday at 8:00pm AEST (10:00 UTC Sunday)

**Node:** HTTP Request
- Method: POST
- URL: `[your-domain]/api/agents/webhooks`
- Body (JSON):
```json
{
  "secret": "[AGENT_WEBHOOK_SECRET]",
  "trigger": "learn"
}
```

---

## Workflow 6: Visa Check (Optional)

**Trigger:** Every Monday at 8:00am AEST (22:00 UTC Sunday)

**Node:** HTTP Request
- Method: POST
- URL: `[your-domain]/api/agents/webhooks`
- Body (JSON):
```json
{
  "secret": "[AGENT_WEBHOOK_SECRET]",
  "trigger": "visa_check"
}
```

---

## Direct Agent API Reference

You can also call agents directly (without n8n) for testing or manual triggers:

### Ask anything
```bash
curl -X POST [your-domain]/api/agents/basnet \
  -H "Content-Type: application/json" \
  -d '{"trigger": "ask", "question": "What should I focus on today?"}'
```

### Manual health check
```bash
curl -X POST [your-domain]/api/agents/sab/product-health \
  -H "Content-Type: application/json" \
  -d '{"trigger": "manual"}'
```

### Morning briefing (manual)
```bash
curl -X POST [your-domain]/api/agents/basnet \
  -H "Content-Type: application/json" \
  -d '{"trigger": "morning"}'
```

### Weekly learning (manual)
```bash
curl -X POST [your-domain]/api/agents/learn \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Getting Telegram Credentials

1. Open Telegram and message **@BotFather**
2. Send `/newbot`
3. Follow the prompts — choose a name and username for your bot
4. BotFather gives you a `BOT_TOKEN` — copy it to `TELEGRAM_BOT_TOKEN` in `.env.local`
5. Send any message to your new bot
6. Visit: `https://api.telegram.org/bot[YOUR_TOKEN]/getUpdates`
7. Find your `chat_id` in the JSON response (it's a number under `message.chat.id`)
8. Copy it to `TELEGRAM_CHAT_ID` in `.env.local`

---

## Sentry Webhook Setup (Optional)

To have Sentry errors automatically analysed by the agent:

1. In Sentry: Settings → Integrations → Webhooks
2. Add webhook URL: `[your-domain]/api/agents/basnet`
3. The webhook body should contain the event details
4. The Basnet agent handles `trigger: 'sentry_alert'` automatically

---

## Generating AGENT_WEBHOOK_SECRET

Run this command and copy the output to `.env.local`:

```bash
openssl rand -hex 32
```
