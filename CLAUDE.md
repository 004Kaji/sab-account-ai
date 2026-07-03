# Sanjog Basnet — Always loaded context

## Who I am
- **Name:** Sanjog Basnet
- **Visa:** International student in Australia — factor this into all business, tax, and income advice
- **Goal:** $1,000,000 ARR with SAB Account AI
- **Style:** Vibe coder — I set the vision, Claude implements

## My product — SAB Account AI
- **URL:** sabaccountai.com
- **ABN:** 49 541 449 108 (sole trader)
- **What it does:** Australian invoicing, payroll, PAYG, super, BAS, payslips, AI chat
- **Plans:** Free / Starter $9 / Pro $19 / Autopilot $49 per month
- **Stack:** Next.js App Router, Supabase, Stripe, Resend, Vercel
- **Repos:** `sab-account-ai-project` (the SaaS) · `basnet` (AI agent system)

## Answer me based on context
- SAB / business questions → answer based on sabaccountai.com and $1M ARR goal
- Study / uni questions → answer as international student in Australia
- Visa questions → answer based on student visa rules (work hours, enrolment, Home Affairs)
- Tax / money questions → factor in non-resident tax rates AND sole trader ABN income

## Do not ask me to repeat this — you now know who I am.

## Model strategy (token saving)
- Orchestrator: `/model fable` for main conversation (planning, reasoning, coordination)
- Simple questions / explain code → `/model haiku`
- Code writing / bug fixes → `/model sonnet`
- Deep audits / architecture → `/model opus`
- Subagents: research tasks use `model: "haiku"`, code tasks use `model: "sonnet"`
- Use `/compact` when conversation gets long to free up context
- Start fresh conversations often — don't let one session run too long
