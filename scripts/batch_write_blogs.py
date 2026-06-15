#!/usr/bin/env python3
"""
Batch-trigger Spark to write 40 blog posts via the /api/agents/sab endpoint.
Runs 4 posts concurrently; logs slug + title for each result.
"""

import asyncio
import aiohttp
import json
import time
import ssl

# ── Config ──────────────────────────────────────────────────────────────────
BASE_URL   = "https://sabaccountai.com/api/agents/sab"
CONCURRENCY = 4          # posts in-flight at once (keep low — each can take 60-90s)
TIMEOUT_S   = 300        # Vercel maxDuration is 300s

# SSL bypass for Mac Python
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode    = ssl.CERT_NONE

# ── 40 Australian accounting / tax topics ───────────────────────────────────
TOPICS = [
    "how to lodge BAS online in Australia",
    "small business tax return Australia 2026",
    "MYOB alternatives Australia 2026",
    "sole trader ABN registration Australia step by step",
    "small business bookkeeping Australia beginners guide",
    "ATO business expense receipts rules Australia",
    "superannuation for contractors Australia 2026",
    "tradie tax deductions Australia complete list",
    "restaurant payroll Australia award rates",
    "STP phase 2 Australia small business guide",
    "how to calculate PAYG withholding Australia",
    "ATO audit small business Australia what to expect",
    "fringe benefits tax FBT small business Australia",
    "GST-free items Australia complete list",
    "input tax credits Australia small business guide",
    "tax depreciation schedule Australia small business",
    "small business CGT concessions Australia",
    "how to pay yourself as sole trader Australia",
    "EOFY payroll reconciliation Australia checklist",
    "employee onboarding checklist Australia",
    "part-time employee entitlements Australia 2026",
    "workers compensation insurance Australia small business",
    "home office setup tax deduction Australia 2026",
    "vehicle log book ATO rules Australia",
    "crypto tax Australia small business 2026",
    "e-invoicing Australia 2026 mandatory guide",
    "annual leave payout tax Australia",
    "company tax rate Australia 2026 small business",
    "GST registration threshold Australia 2026",
    "how to register as an employer Australia",
    "termination pay tax Australia",
    "redundancy payment Australia tax and super",
    "director penalty notice Australia small business",
    "ATO payment plan small business Australia",
    "profit and loss statement sole trader Australia",
    "invoice requirements Australia ABN GST",
    "QuickBooks alternatives Australia 2026",
    "RECKON vs Xero Australia comparison 2026",
    "AI bookkeeping software Australia small business 2026",
    "cash flow management tips small business Australia",
]

# ── Core logic ───────────────────────────────────────────────────────────────
async def write_post(session: aiohttp.ClientSession, idx: int, topic: str, sem: asyncio.Semaphore):
    async with sem:
        payload = {
            "trigger": "marketing_run",
            "data": {
                "marketingTrigger": "write_blog_post",
                "topic": topic,
            },
        }
        t0 = time.time()
        print(f"[{idx+1:02d}/40] START  → {topic}")
        try:
            async with session.post(BASE_URL, json=payload, timeout=aiohttp.ClientTimeout(total=TIMEOUT_S)) as resp:
                elapsed = round(time.time() - t0, 1)
                if resp.status == 200:
                    data = await resp.json()
                    slug  = data.get("slug",  "?")
                    title = data.get("title", "?")
                    saved = data.get("saved", "?")
                    print(f"[{idx+1:02d}/40] OK     ✓ {elapsed}s — {slug} | saved={saved}")
                    return {"ok": True, "topic": topic, "slug": slug, "title": title}
                else:
                    body = await resp.text()
                    print(f"[{idx+1:02d}/40] ERROR  ✗ HTTP {resp.status} in {elapsed}s — {body[:120]}")
                    return {"ok": False, "topic": topic, "status": resp.status}
        except asyncio.TimeoutError:
            print(f"[{idx+1:02d}/40] TIMEOUT after {TIMEOUT_S}s — {topic}")
            return {"ok": False, "topic": topic, "error": "timeout"}
        except Exception as e:
            print(f"[{idx+1:02d}/40] EXCEPT — {e}")
            return {"ok": False, "topic": topic, "error": str(e)}


async def main():
    connector = aiohttp.TCPConnector(ssl=ssl_ctx)
    sem       = asyncio.Semaphore(CONCURRENCY)

    print(f"\n=== SAB Blog Batch — {len(TOPICS)} posts, {CONCURRENCY} concurrent ===\n")
    t_start = time.time()

    async with aiohttp.ClientSession(connector=connector) as session:
        tasks   = [write_post(session, i, topic, sem) for i, topic in enumerate(TOPICS)]
        results = await asyncio.gather(*tasks)

    ok  = [r for r in results if r.get("ok")]
    bad = [r for r in results if not r.get("ok")]
    elapsed = round(time.time() - t_start, 1)

    print(f"\n=== Done in {elapsed}s — {len(ok)} saved, {len(bad)} failed ===")
    if bad:
        print("\nFailed topics:")
        for r in bad:
            print(f"  - {r['topic']}  ({r.get('error') or r.get('status')})")

    # Save results log
    log_path = "/Users/sanjogbasnet/Desktop/sab-account-ai-project/scripts/batch_blog_results.json"
    with open(log_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nFull results → {log_path}")


if __name__ == "__main__":
    asyncio.run(main())
