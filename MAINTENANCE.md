# SAB Account AI — My Personal Maintenance Guide

Written in plain English for Sanjog Basnet.
Last updated: May 2026.

---

## Daily checks (2 minutes)

You do not need to do these every single day, but when something feels off, start here.

**1. Is the app running?**
- Go to vercel.com → your project → Deployments tab
- The top deployment should say "Ready" with a green dot
- If it says "Error" or "Failed", click it to see what went wrong

**2. Are there any errors happening right now?**
- In the same Vercel project, click the "Logs" tab
- Look for lines in red — these are errors
- One or two red lines is normal (bots probing your site)
- Many red lines in a short period means something is broken

**3. Have any new users signed up?**
- Go to supabase.com → your project → Table Editor → `profiles` table
- Sort by `created_at` descending
- You'll see your newest users at the top

**4. Are payments working?**
- Go to dashboard.stripe.com → Payments tab
- Check the most recent payments show as "Succeeded"
- If you see "Failed" payments, click them to read the reason

---

## When a user reports a bug

Follow these steps in order. Do not skip ahead.

**Step 1 — Reproduce it yourself**
Try to do exactly what the user described on your own account.
If you can reproduce it, it is a real bug. If you cannot, ask the user for more details (what browser, what device, screenshots).

**Step 2 — Which file is most likely the problem?**

| What the user says | Where to look first |
|---|---|
| "My invoice total is wrong" | `src/app/(app)/invoice/page.tsx` → `calcTotals` function |
| "The AI generation isn't working" | `src/app/api/invoice/generate/route.ts` — check your Anthropic credit at console.anthropic.com |
| "I paid but I'm still on the free plan" | Stripe webhook → dashboard.stripe.com → Webhooks → check for failed deliveries |
| "I can't log in" | supabase.com → Authentication tab → check if the user's account exists |
| "My payslip tax is wrong" | `src/lib/ato.ts` — verify the tax brackets against ato.gov.au |
| "I can't download the PDF" | `src/lib/pdf.ts` — usually a browser compatibility issue |
| "The email didn't arrive" | supabase.com → your project → check your email provider settings |

**Step 3 — Test the fix locally before deploying**
1. Open your terminal in the project folder
2. Run `npm run dev` to start the app on your computer
3. Test your fix at `http://localhost:3000`
4. Confirm the bug is gone AND nothing else broke

**Step 4 — Deploy the fix**
1. Save the file
2. In your terminal: `git add .` then `git commit -m "fix: describe what you fixed"`
3. Then: `git push`
4. Vercel automatically deploys — wait 1–2 minutes
5. Check vercel.com → Deployments → confirm it says "Ready"

**Step 5 — Tell the user it's fixed**
Reply to them with:
- What the problem was (in simple terms)
- That it has been fixed
- Ask them to try again and let you know if it persists

---

## Files I can safely edit on my own

These files control display, content, and copy. A mistake here is easy to spot and easy to fix.

| File | What it controls | How to test after changing |
|---|---|---|
| `src/app/page.tsx` | The marketing homepage — pricing display, features list, hero text | Visit your homepage after deploying |
| `src/app/(app)/dashboard/page.tsx` | The dashboard layout and ATO deadline dates | Log in and check the dashboard looks right |
| `src/app/globals.css` | Colours, fonts, spacing for the whole app | Visual check after any CSS change |
| `src/app/layout.tsx` | Browser tab title, SEO description, fonts | Check the tab title and inspect element |
| `src/lib/ato.ts` | Tax rates — but ONLY `getSuperRate()` when the government announces a change | Generate a test payslip and verify the maths manually |
| `src/app/api/invoice/generate/route.ts` | The prompt instructions sent to Claude AI | Click Generate Invoice and test the output |

---

## Files I should NOT touch without help

These files control money, security, and legal compliance. A mistake here could mean users get charged wrong, lose access to their accounts, or receive incorrect tax calculations.

| File | Why it is dangerous | Who to ask |
|---|---|---|
| `src/app/api/stripe/webhook/route.ts` | Controls whether users get upgraded after paying. A bug here = users pay but stay on free plan, or free users get Pro access | Ask Claude Code or a developer |
| `src/app/api/stripe/checkout/route.ts` | Creates the payment session. A bug here = no one can pay | Ask Claude Code or a developer |
| `src/lib/supabase.ts` | The database connection keys. Wrong key = everyone's data exposed | Do not touch |
| `src/lib/stripe.ts` | The Stripe API connection. Change nothing here | Do not touch |
| `src/lib/ato.ts` — tax brackets | The income tax brackets and Medicare levy percentages. Wrong number = illegal payslips | Only change with ATO verification + a developer review |
| `src/middleware.ts` (if it exists) | Controls who can access which pages. A bug here = anyone can bypass login | Ask Claude Code or a developer |
| Any file in `src/app/api/` | All server-side code. Mistakes can expose user data or break payments | Always test locally first, ask for help if unsure |

**The rule of thumb:** If changing the file could affect money leaving a user's bank account, or tax being calculated, or who is allowed to log in — get a second opinion before deploying.

---

## Monthly maintenance tasks

Do these on the first Monday of each month. Takes about 15 minutes.

**1. Check ATO tax rates are still current**
- Go to ato.gov.au → search "PAYG withholding tax table"
- Confirm the income tax brackets in `src/lib/ato.ts` match the current financial year
- The brackets rarely change mid-year, but always verify in July (new financial year)

**2. Check the super rate**
- Go to ato.gov.au → search "super guarantee rate"
- Confirm `getSuperRate()` in `src/lib/ato.ts` returns the correct rate
- The rate increases every 1 July — update it before then, not after

**3. Check Stripe webhook is working**
- Go to dashboard.stripe.com → Developers → Webhooks
- Click your webhook endpoint
- Check the "Recent deliveries" list — all should show green ticks (200 status)
- If you see red (4xx or 5xx errors), investigate immediately

**4. Check API costs are within budget**
- Go to console.anthropic.com → Usage
- Check how much you've spent on Claude API calls this month
- If usage is unusually high, someone may be abusing the AI generation feature (the auth check should prevent this, but verify)

**5. Run a security check**
- In your terminal, in the project folder: `npm audit`
- If it reports "high" or "critical" vulnerabilities, paste the output into Claude Code and ask how to fix them
- Do this before updating any packages so you can compare before/after

**6. Back up your database**
- Go to supabase.com → your project → Database → Backups
- Supabase creates automatic daily backups on paid plans
- Confirm the most recent backup is less than 24 hours old
- Once a month, manually download a backup as extra insurance

**7. Check your Vercel bill**
- Go to vercel.com → Billing
- Confirm the bill is roughly what you expect
- Unexpected spikes in usage could mean a bot is hitting your API routes

**8. Check UptimeRobot**
- Go to uptimerobot.com (free account)
- Confirm all monitors show green (UP)
- If you have not set it up yet, do it now — takes 5 minutes:
  1. Sign up free at uptimerobot.com
  2. Click "Add New Monitor"
  3. Type: HTTP(S)
  4. Friendly name: SAB Account AI Homepage
  5. URL: https://sabaccountai.com.au
  6. Monitoring interval: every 5 minutes
  7. Alert contact: your email (sanjog.basnet02@gmail.com)
  8. Save
  9. Repeat for: https://sabaccountai.com.au/api/health (returns {"status":"ok"} — used as the API health check monitor)
- UptimeRobot emails you within 5 minutes if the site goes down — you will know before any user reports it

---

## Emergency contacts and links

Bookmark these. When something is broken, you will be stressed — having these ready saves time.

| Service | What it is | Link |
|---|---|---|
| **Vercel** | Where your app runs. Check here first when the site is down. | vercel.com |
| **Supabase** | Your database. Check here when data is missing or logins break. | supabase.com |
| **Anthropic Console** | Your Claude AI account. Check credit balance when AI generation fails. | console.anthropic.com |
| **Stripe Dashboard** | Your payment processor. Check here when payments or upgrades fail. | dashboard.stripe.com |
| **ATO Tax Tables** | The source of truth for all tax calculations. | ato.gov.au/tax-rates |
| **ATO Super Rate** | Superannuation guarantee rate by year. | ato.gov.au/super-guarantee |
| **Vercel Status** | Check if Vercel itself is having an outage (not your fault). | vercel-status.com |
| **Supabase Status** | Check if Supabase is having an outage. | status.supabase.com |

---

## Glossary — words you need to know

**API** — Application Programming Interface. A way for two pieces of software to talk to each other. When your invoice page calls Claude AI, it uses an API. Think of it as a phone call between programs.

**Route** — A file in `src/app/api/` that handles a specific request from the browser. Like a post office box — requests arrive at a specific address, and the route handles them.

**Component** — A reusable piece of your user interface. A button, a card, a form section. Like a Lego brick — you build big things out of small reusable pieces.

**Hook** — A special React function that starts with `use` (like `useState`, `useEffect`). Hooks let your components remember things and react to changes. Named "hooks" because they "hook into" React's internal system.

**State** — Information that a component is currently holding on its "whiteboard." When state changes, the screen updates to reflect the new information.

**Props** — Short for "properties." Information passed from a parent component to a child component. Like filling in a form before handing it to someone — you give them the data they need to do their job.

**TypeScript** — The programming language your app uses. It is JavaScript (the standard web language) with extra rules that catch mistakes before they reach users. The `.ts` and `.tsx` file extensions mean TypeScript.

**Supabase** — Your database provider. Stores all your users' invoices, profiles, payslips, and records. Also handles login and authentication. Think of it as a very organised and secure spreadsheet in the cloud.

**RLS (Row Level Security)** — Database rules that act like a bouncer. They check your user ID before letting you see any data. User A can only see User A's invoices. Without RLS, any logged-in user could see everyone's data.

**Webhook** — An automatic message sent from one service to another when something happens. Stripe sends a webhook to your app when a payment succeeds. Your app listens for it and updates the database.

**JWT (JSON Web Token)** — The "ID card" a user carries after logging in. It is a long string of characters that proves who you are. Your browser sends it with every request to protected API routes. Expires after about an hour.

**Middleware** — Code that runs before a request reaches its destination. Like a security guard who checks everyone coming in the front door before they can go anywhere.

**Build** — The process of converting your TypeScript code into optimised JavaScript that browsers can run. Vercel does this automatically when you push code. If the build fails, your changes are not deployed.

**Deploy** — Sending your latest code to Vercel so it runs live on the internet. Every `git push` to your main branch triggers an automatic deploy.

**Environment variable** — A secret setting stored outside your code (on Vercel or in a `.env.local` file). Things like API keys and database passwords. They are never written directly in the code so they cannot accidentally be shared publicly.

---

*This guide was created in May 2026 as part of a codebase education session.*
*When in doubt, ask Claude Code before making changes to any file not listed in the "safe to edit" section.*
