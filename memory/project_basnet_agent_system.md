---
name: project-basnet-agent-system
description: Full architecture, capabilities, and vision for the Basnet AI agent system
metadata:
  type: project
---

# Basnet AI Agent System

**Vision:** Sanjog becomes fully independent — agents handle everything while he watches live actions happening in real time.

## Architecture

```
Basnet AI Agent (Head)
├── Reads SANJOG_MASTER.md for context
├── Classifies every request
├── Delegates to the right sub-agent
└── Reports result back (email + live UI)

├── SAB Agents
│   ├── Technical Agent (Flux)
│   └── Marketing Agent (Spark)

└── Personal Agent (Relay)
```

---

## Personal Agent (Relay)
**Handles:** visa, jobs, life, web search, personal queries, bookkeeping

**Capabilities wanted:**
- Answer questions (built ✅)
- Web search with live results (built ✅)
- Open websites in Chrome (built ✅ in voice)
- Bookkeeping — track income/expenses, generate summaries
- Save notes/posts to files
- Live action feed — show what it's doing in real time

---

## SAB Technical Agent (Flux)
**Handles:** all bugs, code health, deployments for sabaccountai.com

**Capabilities wanted:**
- Read codebase and find bugs (partially built ✅)
- Fix code automatically via GitHub (built ✅ — can create PRs)
- Deploy to Vercel automatically after fix (built ✅ — Vercel deploy)
- Email Sanjog the result after deploy (built ✅ via Resend)
- Live action feed — show each step (find bug → fix → deploy → email)
- Only this agent can deploy to Vercel

---

## SAB Marketing Agent (Spark)
**Handles:** content, social media, accountant outreach

**Capabilities wanted:**
- Check real social media for trending content ideas (TikTok, LinkedIn, Instagram)
- Generate content ideas based on what's trending
- Post directly to social media
- Send emails to accountants
- Live action feed — show what it's doing

---

## Live Action Feed (Not yet built)
**The key feature Sanjog wants most:**
- A dashboard or terminal output showing each agent's live steps
- Like watching the agent work in real time instead of just waiting for a result
- e.g. "Flux: scanning Sentry errors... found 2... reading code... writing fix... creating PR... deploying..."

**Why:** Sanjog wants to enjoy watching agents work for him, not stare at a blank screen waiting.

---

## What's Built vs Missing

| Feature | Status |
|---|---|
| Voice input → Basnet → classify → route to agent | ✅ Built |
| Personal: answer + web search | ✅ Built |
| Personal: open Chrome | ✅ Built |
| Technical: read code + find bugs | ✅ Built |
| Technical: create GitHub PR | ✅ Built |
| Technical: deploy to Vercel | ✅ Built |
| Technical: email result | ✅ Built |
| Marketing: content ideas | ✅ Built |
| Personal: bookkeeping actions | ❌ Not built |
| Personal: save notes | ❌ Not built |
| Marketing: post to social media | ❌ Not built |
| Marketing: send accountant emails automatically | ✅ Built (Spark) |
| Live action feed / dashboard | ❌ Not built |
| Mac cleanup sub-agent | ❌ Not built |
