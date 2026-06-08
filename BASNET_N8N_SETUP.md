# Basnet n8n Workflow Setup

All 6 workflows. Same pattern: Schedule Trigger → HTTP Request.
URL base: `https://sabaccountai.com`
Webhook secret: see AGENT_WEBHOOK_SECRET in .env.local

---

## Workflow 1 — THE HEARTBEAT (most important)

**Name:** Basnet Watcher
**Trigger:** Every 5 minutes
**Node:** HTTP Request POST

URL: `https://sabaccountai.com/api/agents/watch`
Headers: `{ "x-agent-secret": "AGENT_WEBHOOK_SECRET" }`
Body: `{}`

This is what makes Basnet always watching. Set it up first.

---

## Workflow 2 — Morning Briefing

**Name:** Morning Briefing
**Trigger:** Every day 9 PM UTC (= 7am AEST)
**Cron:** `0 21 * * *`

URL: `https://sabaccountai.com/api/agents/basnet`
Body:
```json
{
  "trigger": "morning",
  "secret": "AGENT_WEBHOOK_SECRET"
}
```

---

## Workflow 3 — Weekly Content Brief

**Name:** Weekly Content Brief
**Trigger:** Every Monday 8 PM UTC (= 6am AEST Monday)
**Cron:** `0 20 * * 1`

URL: `https://sabaccountai.com/api/agents/basnet`
Body:
```json
{
  "trigger": "morning",
  "secret": "AGENT_WEBHOOK_SECRET"
}
```

Note: Monday trigger runs Atlas + Spark in addition to standard agents.

---

## Workflow 4 — Accountant Emails

**Name:** Accountant Emails
**Trigger:** Every Friday 9 PM UTC (= 7am AEST Friday)
**Cron:** `0 21 * * 4`

URL: `https://sabaccountai.com/api/agents/sab/marketing`
Body:
```json
{
  "trigger": "accountant_emails",
  "secret": "AGENT_WEBHOOK_SECRET"
}
```

---

## Workflow 5 — Weekly Learning

**Name:** Weekly Learning
**Trigger:** Every Sunday 10 AM UTC (= 8pm AEST Sunday)
**Cron:** `0 10 * * 0`

URL: `https://sabaccountai.com/api/agents/basnet`
Body:
```json
{
  "trigger": "weekly_learn",
  "secret": "AGENT_WEBHOOK_SECRET"
}
```

---

## Workflow 6 — The Watcher (via webhooks route, alternative)

You can also trigger the heartbeat via the existing webhooks route:

URL: `https://sabaccountai.com/api/agents/webhooks`
Body:
```json
{
  "secret": "AGENT_WEBHOOK_SECRET",
  "trigger": "health_check"
}
```

---

## Note on the Watcher workflow

The watcher (`/api/agents/watch`) uses header-based auth:
- Header name: `x-agent-secret`
- Header value: your AGENT_WEBHOOK_SECRET

In n8n HTTP Request node → Headers tab → Add header.
