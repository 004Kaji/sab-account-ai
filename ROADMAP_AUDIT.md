# SAB Account AI — Roadmap Audit
_Audit date: 2026-06-25 · Branch: audit/roadmap_

---

## 1. What SAB Currently Does Well (Strengths to Protect)

### Core Accounting Engine
- **ATO-accurate PAYG withholding** — NAT 1004 Scale 1 & 2 coefficient tables implemented verbatim, including Medicare levy, LITO, HELP/HECS repayment, and residency status (citizen/PR, international student, WHM, temp work visa).
- **GST calculation is correct** — 10% ex-GST formula, with an explicit "never change this" comment documenting past caution. Do not refactor.
- **Payday Super readiness** — Mandatory from 1 July 2026, already tracked and flagged on dashboards and in chat. First-mover advantage over competitors.
- **BAS tracking** — GST collected vs credits, quarterly/monthly deadline reminders, ATO calendar awareness.

### AI Chat (Autopilot)
- **15+ tool calls** — create/send invoice, create/send payslip, process payroll for all employees, query BAS/super due, customer ledger, and more.
- **Confirm cards** — Payslip and invoice previews before any email is sent. The safety UX is good; do not remove this.
- **Streaming output** — Real-time token delivery via Anthropic SDK.
- **Proactive reminders** — Cron-injected BAS/super/payslip reminders show in chat as "reminder" message kind.

### Invoicing
- **Full invoice lifecycle** — Draft → pending → paid → overdue, with AI generation (Claude Haiku parses natural language into line items), PDF, email delivery, Stripe checkout for client payments, and recurring invoice scheduling.
- **Quotes** — Separate document type with conversion-to-invoice flow.

### Payroll & Payslips
- **Penalty rates** — Award rates per industry (1.5× Saturday, 2× Sunday/PH, evening rates).
- **Leave accrual** — Annual and personal leave tracking.
- **Salary sacrifice** — Super contributions tracked separately.
- **Bulk payroll** — "Process payroll for all employees" via single chat command.

### Monetisation
- **Stripe integration is solid** — Subscription lifecycle (trial → active → past_due → cancelled), idempotent webhook deduplication via `stripe_events` table, customer portal, one-off Stripe checkout for client invoice payment.
- **Referral system** — Refer 1 friend → 1 month free → Tier 2 → Lifetime Pro; tracked in DB.

### Security Fundamentals
- **Row-Level Security** on all Supabase tables.
- **TFN masked** as XXX-XXX-123 in PDFs and UI.
- **CSP / HSTS headers** set.
- **QStash** for async email delivery (resilient queue, not blocking request).

---

## 2. Every Missing Feature — Ranked by Revenue Impact

| # | Feature | Revenue Impact | Why |
|---|---------|---------------|-----|
| 1 | **Tax return export (ITR4/ITR5 pre-filled for accountant)** | Very High | Sole traders' #1 annual pain point; unlocks accountant B2B channel |
| 2 | **Accountant share portal (read-only access link)** | Very High | Accountants recommending SAB = lowest CAC possible |
| 3 | **Bank account / Open Banking auto-import** | High | Manual record entry is the #1 reason users abandon bookkeeping tools |
| 4 | **Expense receipt OCR (photo → expense record)** | High | Sole traders live on receipts; typing them in kills retention |
| 5 | **STP (Single Touch Payroll) export to ATO** | High | Employers legally required; SAB can't replace an accountant without this |
| 6 | **Multi-user / team access with roles** | High | Blocks agencies, accountant firms, and any business with a bookkeeper |
| 7 | **Time tracking / timesheets → auto-calculate payslip gross** | Medium | Hourly workers must manually count hours before creating payslip |
| 8 | **Dunning / failed payment retry emails** | Medium | Stripe handles retries but SAB sends no user-facing reminders; silent churn |
| 9 | **Client portal (invoice status, payment history)** | Medium | Removes "did you get my invoice?" emails from user workflow |
| 10 | **SuperStream / super fund validation** | Medium | Mistyped fund = compliance breach; validation = trust signal |
| 11 | **Bulk invoice actions (multi-select, mark paid, re-send)** | Medium | Power users with 50+ invoices won't stay without this |
| 12 | **Invoice templates / custom branding (logo, colours, fonts)** | Low-Medium | Agencies and design-conscious freelancers churn without it |
| 13 | **Multi-currency (USD/NZD)** | Low | Export services and expat contractors need non-AUD billing |
| 14 | **Two-factor authentication (TOTP)** | Low | Required by enterprise/accountant buyers; not general freelancers |
| 15 | **Payroll auto-pay (bank debit → employee transfer)** | Low | Requires banking licence; not achievable short-term |

---

## 3. Every UX/Flow Problem That Would Cause a User to Churn

### High Churn Risk
1. **Invoice pagination missing** — Supabase query loads all invoices (`select('*')` with no `.limit()`). A user with 200+ invoices will hit timeout or browser freeze.
2. **Silent email failures** — Emails are queued via QStash with `Promise.allSettled`. If the queue fails, the invoice is marked paid but the client never receives the email. User discovers this days later when chasing payment.
3. **No recovery from chat tool error** — If Claude returns malformed JSON for a tool call, the chat shows an error with no retry button. User is stuck.
4. **Recurring invoice no preview** — User ticks "recurring invoice" but no preview shows "next invoice will be created on [date]". Surprise auto-created invoice causes confusion.
5. **Salary sacrifice not on payslip PDF** — Deduction not line-itemed; employee sees lower take-home with no explanation.

### Medium Churn Risk
6. **Referral modal tied to `localStorage` login count** — User on two devices sees modal twice; feels spammy.
7. **No bulk actions on invoices list** — 50 invoices = 50 individual actions. Power users leave.
8. **Overdue invoices not salient on dashboard** — Red text on due date, but no "X days overdue" badge, no total outstanding amount highlighted.
9. **PDF generation shows no progress** — Large invoice triggers a blank wait; user thinks button is broken.
10. **No visible invoice number collision warning** — Duplicate invoice numbers possible (no server-side uniqueness check), creating audit confusion later.

### Low Churn Risk (but visible friction)
11. **Inline styles everywhere** — No dark mode possible, no theming, visual inconsistency as codebase grows.
12. **No pagination on chat history** — Very old messages may not be retrieved; long-time users notice context gaps.
13. **No file size limit on logo upload** — 50MB logo silently slows the entire app.

---

## 4. Every Compliance or Technical Risk That Could Kill the Business

### Business-Killing Risk

1. **SAB implies ATO authority without being a registered tax agent.**
   - App labels calculations "ATO-verified" but the footer says "not a registered tax agent."
   - If a user underpays tax due to a SAB calculation error and the ATO penalises them, SAB faces reputational and potential legal liability.
   - **Fix:** More prominent disclaimer on every ATO-specific calculation surface. Consult a tax lawyer about safe-harbour wording.

2. **No STP lodgement = payroll compliance gap.**
   - Employers with 1+ employees must lodge STP to ATO on every payday. SAB creates payslips but cannot lodge STP.
   - If users believe SAB handles this, they may miss lodgement deadlines.
   - **Fix:** Prominent "You must lodge STP with ATO separately" warning on every payslip. Long-term: EPOS registration + STP export.

3. **Plan enforcement enforced client-side only (invoices, chat).**
   - Free plan's 3-invoice/month limit is checked in the browser only — a user can bypass it by calling the Supabase insert directly.
   - Chat route (`/api/chat`) logs a plan warning but does **not** return 403. Non-Autopilot users can access the AI.
   - **Fix:** Server-side plan checks in every API route. This is also a revenue leak.

4. **Rate limit soft fallback (Redis down → unlimited).**
   - If Upstash Redis goes offline, `checkRateLimit` returns `{ allowed: true }` for all requests.
   - A free user could generate unlimited Claude API calls during a Redis outage.
   - **Fix:** On Redis failure, default to deny or use an in-process LRU counter as backup.

### High Risk

5. **Admin password is hardcoded in source.**
   - `/admin` uses a hardcoded password check. If it ever lands in a public commit or is visible in Sentry, the admin panel is fully exposed.
   - **Fix:** Move to `ADMIN_PASSWORD` env var; rotate periodically; consider IP allowlist.

6. **No downgrade on subscription cancellation.**
   - When a subscription is cancelled or expires, Stripe fires `customer.subscription.deleted`. If this webhook doesn't immediately set `plan = 'free'` in the profiles table, the user retains Pro/Autopilot access indefinitely.
   - **Fix:** Confirm the webhook handler immediately downgrades the profile; write a test for this path.

7. **No audit trail on invoices or payslips.**
   - No immutable log of who created, modified, or deleted a document.
   - If a payment is disputed, there is no evidence of the invoice's original state.
   - **Fix:** Append-only `audit_log` table (table_name, row_id, action, diff, actor_id, timestamp).

8. **Stripe event race condition on referral rewards.**
   - `checkout.session.completed` (invoice payment) and `customer.subscription.created` (referral conversion) can arrive concurrently.
   - If the referral reward is applied before the subscription is confirmed, the user might get a reward against a failed payment.
   - **Fix:** Apply referral reward only after subscription status is `active`.

### Medium Risk

9. **Referral code enumeration.**
   - Referral codes are short alphanumeric strings exposed in `?ref=CODE` URLs. An attacker can brute-force valid codes.
   - **Fix:** Use longer, opaque tokens (UUID or 32-char hex). Store hashed in DB.

10. **Email delivery unverified.**
    - Resend sends emails but SAB has no webhook from Resend to confirm delivery.
    - Users and accountants may never receive critical invoice/payslip emails with no indication.
    - **Fix:** Resend webhook → update `email_queue` row with `delivered_at` or `failed_at`.

11. **Payday Super banner hard-coded expiry date.**
    - `showPaydayBanner = Date.now() < new Date('2026-07-28').getTime()` — stale after 28 July 2026.
    - **Fix:** Move expiry to env var or cron-controlled feature flag.

---

## 5. The 10 Highest-Impact Changes to Reach $1M ARR — Ranked

| Rank | Change | Revenue Mechanism | Effort (hours) |
|------|--------|------------------|---------------|
| **1** | **Server-side plan enforcement on all routes** | Stop revenue leakage; free users consuming AI credits at no cost. Prerequisite for trust in billing. | 8–12 h |
| **2** | **Mixpanel / Segment funnel + cohort tracking** | You cannot optimise what you don't measure. Identify exact step where users drop off (signup → invoice → upgrade). Without this, all other bets are guesses. | 6–10 h |
| **3** | **Email delivery tracking (Resend webhook → DB)** | Silent email failures are invisible churn. Fix: users trust invoices and payslips are delivered. | 4–6 h |
| **4** | **Accountant read-only share link** | One accountant can recommend SAB to 20+ clients. Lowest CAC acquisition channel. Share link requires no backend role system — just a signed read-only token and a stripped-down view. | 20–30 h |
| **5** | **Tax return export (pre-filled PDF / CSV for accountant)** | Sole traders' #1 annual pain point. Converts "nice tool" into "essential tool". Increases LTV and justifies Pro/Autopilot upgrades. | 30–40 h |
| **6** | **Dunning email sequence on failed payments** | Stripe retries payments automatically but SAB sends no user-facing warnings. A 3-email sequence (day 3 / day 7 / day 14) recovers ~20–30% of failed subscriptions. | 8–12 h |
| **7** | **Invoice pagination + bulk actions** | Required to retain any user with >50 invoices. Without it, growth stalls at power-user segment. | 10–14 h |
| **8** | **Expense receipt OCR (image → record via Claude Vision)** | Eliminates the single biggest manual-entry friction. Upsell driver: "Just photograph your receipts". Claude Vision makes this buildable in days. | 16–24 h |
| **9** | **Audit trail table** | Required for accountant partnerships, ATO compliance, and any enterprise sale. Enables "export your audit log" feature for Pro. | 8–12 h |
| **10** | **Rate limit fallback (in-memory LRU) + Redis panic thresholds** | Prevents cost explosion during infrastructure incidents. Also required to confidently offer Autopilot at scale. | 4–6 h |

**Total estimated effort: ~114–166 hours (~3–5 weeks of focused work.**

---

## 6. Suggested Pricing Changes

### Current Pricing
| Plan | Price | Key Limits |
|------|-------|-----------|
| Free | $0 | 3 invoices/month |
| Starter | $9/mo | Unlimited invoices |
| Pro | $19/mo | + Payslips, BAS |
| Autopilot | $49/mo | + AI Chat |

### Recommendations

**A. Introduce an Annual billing discount (20%).**
- Starter → $86/yr ($7.17/mo effective)
- Pro → $182/yr ($15.17/mo)
- Autopilot → $470/yr ($39.17/mo)
- Impact: Reduces churn, improves cash flow, increases LTV. Standard in SaaS; easy to add via Stripe annual price IDs.

**B. Raise Autopilot to $69/mo when Accountant Portal + Tax Export ship.**
- Justification: At $49, it is underpriced relative to MYOB ($65+) and Xero ($70+). The AI + compliance positioning supports premium.
- Wait until both features are live before raising price.

**C. Add a "Teams" tier at $99/mo (3 users) when multi-user ships.**
- Accountant firms and small agencies are willing to pay $99–$149 for multi-user bookkeeping.
- Unlocks the B2B2C channel.

**D. Keep the Free plan but tighten it.**
- Current: 3 invoices/month → enforce this server-side (currently only client-side).
- Add: AI invoice generation limited to 5 uses/month (not unlimited).
- Free is a valid acquisition tool but needs real limits to drive upgrades.

**E. Do not add per-invoice or per-payslip metering (yet).**
- Complexity not justified until >2,000 paying users. Flat rates are simpler to sell and support.

---

## 7. One-Line Positioning Statement

> **SAB Account AI is the AI-powered accountant for Australian sole traders and small employers — handling invoices, payroll, tax, and BAS compliance through a single chat interface, without needing an accountant for day-to-day tasks.**
