# Basnet Agent — n8n Workflow Setup

## Install n8n locally

```bash
npx n8n
# Opens at: http://localhost:5678
```

## Environment variable needed in n8n

All HTTP Request nodes need this header:

```
Key:   x-agent-secret
Value: [your AGENT_WEBHOOK_SECRET value]
```

---

## The 7 workflows to create

### WORKFLOW 1 — THE HEARTBEAT (most important)

```
Name:    Basnet Watcher
Trigger: Schedule — every 5 minutes
Node:    HTTP Request
Method:  POST
URL:     https://sabaccountai.com/api/agents/watch
Headers: { "x-agent-secret": "AGENT_WEBHOOK_SECRET" }
Body:    {}
```

This makes Basnet always watching.
**Set up this one first.**

---

### WORKFLOW 2 — MORNING BRIEFING

```
Name:    Basnet Morning
Trigger: Schedule — 7:00am AEST daily
         (21:00 UTC previous day)
Node:    HTTP Request
Method:  POST
URL:     https://sabaccountai.com/api/agents/basnet
Headers: { "x-agent-secret": "AGENT_WEBHOOK_SECRET" }
Body:    { "trigger": "morning" }
```

---

### WORKFLOW 3 — WEEKLY BRIEF + ATLAS

```
Name:    Basnet Weekly
Trigger: Schedule — Monday 6:00am AEST
         (Sunday 20:00 UTC)
Node:    HTTP Request
Method:  POST
URL:     https://sabaccountai.com/api/agents/basnet
Headers: { "x-agent-secret": "AGENT_WEBHOOK_SECRET" }
Body:    { "trigger": "weekly" }
```

Runs: Spark weekly brief + Relay goal check + Atlas market intel + brand monitor.

---

### WORKFLOW 4 — FRIDAY ACCOUNTANT EMAILS

```
Name:    Spark Accountant Emails
Trigger: Schedule — Friday 7:00am AEST
         (Thursday 21:00 UTC)
Node:    HTTP Request
Method:  POST
URL:     https://sabaccountai.com/api/agents/sab
Headers: { "x-agent-secret": "AGENT_WEBHOOK_SECRET" }
Body:    { "trigger": "marketing_run",
           "data": { "marketingTrigger": "accountant_emails" } }
```

---

### WORKFLOW 5 — DAILY SCOUT SCAN

```
Name:    Scout Daily
Trigger: Schedule — 2:00am AEST daily
         (16:00 UTC previous day)
Node:    HTTP Request
Method:  POST
URL:     https://sabaccountai.com/api/agents/sab
Headers: { "x-agent-secret": "AGENT_WEBHOOK_SECRET" }
Body:    { "trigger": "scout_scan" }
```

Runs at 2am so any product failures are caught before the 7am briefing.

---

### WORKFLOW 6 — DAILY LIFT SCAN

```
Name:    Lift Daily
Trigger: Schedule — 3:00am AEST daily
         (17:00 UTC previous day)
Node:    HTTP Request
Method:  POST
URL:     https://sabaccountai.com/api/agents/sab
Headers: { "x-agent-secret": "AGENT_WEBHOOK_SECRET" }
Body:    { "trigger": "lift_scan" }
```

---

### WORKFLOW 7 — WEEKLY LEARNING

```
Name:    Basnet Learn
Trigger: Schedule — Sunday 8:00pm AEST
         (Sunday 10:00 UTC)
Node:    HTTP Request
Method:  POST
URL:     https://sabaccountai.com/api/agents/learn
Headers: { "x-agent-secret": "AGENT_WEBHOOK_SECRET" }
Body:    {}
```

Reviews the week, updates SANJOG_LEARNINGS.md, sends summary email.

---

## Setup order

1. Install n8n: `npx n8n`
2. Create Workflow 1 (heartbeat) first
3. Activate it — check the watch endpoint receives calls
4. Create Workflows 2–7 in order
5. Activate all 7
6. Check your inbox — morning briefing should arrive within 24 hours

---

## Verify n8n is working

After activating Workflow 1, check the `watcher_reports` table in Supabase.
New rows should appear every 5 minutes.
If no rows after 10 minutes: check n8n execution log.

---

## Run n8n permanently on Mac

```bash
# Instead of npx n8n (stops when terminal closes):
npm install -g n8n
n8n start --tunnel
```

Or add to Mac login items via a launchd plist.

---

## Note on Scout and Lift

Workflows 5 and 6 also run automatically inside Workflow 1 (the heartbeat)
via `runWatcherCycle()`. The dedicated Scout and Lift workflows run deeper
daily scans at quieter times. If you only want minimal setup,
Workflows 1 + 2 + 7 is enough to start.
