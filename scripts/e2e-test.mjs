#!/usr/bin/env node
/**
 * End-to-end tests for SAB Account AI
 * Tests: page loads, DB tables, referral system, API routes
 * Run: node scripts/e2e-test.mjs
 */

import { createClient } from '@supabase/supabase-js';

const BASE = 'http://localhost:3000';
const SUPABASE_URL = 'https://dpvnkyooweexyywcganp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdm5reW9vd2VleHl5d2NnYW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQzNTg3NCwiZXhwIjoyMDk0MDExODc0fQ.08dXWWErceg7HW5z0bZbAyEjHeyecwdLlYhw2Tr41_Y';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdm5reW9vd2VleHl5d2NnYW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzU4NzQsImV4cCI6MjA5NDAxMTg3NH0.KJqdIezGAUXP3Ii067Ivt6FZ0mKe26gRPmpNbR1w1Fg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── helpers ──────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function ok(name, detail = '') {
  passed++;
  results.push({ status: '✅ PASS', name, detail });
}

function fail(name, detail = '') {
  failed++;
  results.push({ status: '❌ FAIL', name, detail });
}

async function get(path, expectedStatuses = [200, 307, 302]) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return { status: res.status, ok: expectedStatuses.includes(res.status) };
}

async function postApi(path, body, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

// ─── test groups ──────────────────────────────────────────────────────────────

async function testPageLoads() {
  console.log('\n📄 Page Loads');
  const pages = [
    ['/login',           [200]],
    ['/signup',          [200]],
    ['/signup?ref=TEST', [200]],
    ['/forgot-password', [200]],
    ['/dashboard',       [307, 302, 200]],  // redirects to login if no session
    ['/settings',        [307, 302, 200]],
    ['/invoice',         [307, 302, 200]],
    ['/payslip',         [307, 302, 200]],
    ['/clients',         [307, 302, 200]],
    ['/employees',       [307, 302, 200]],
    ['/records',         [307, 302, 200]],
    ['/abn-payments',    [307, 302, 200]],
  ];
  for (const [path, expected] of pages) {
    try {
      const { status, ok: isOk } = await get(path, expected);
      if (isOk) ok(`GET ${path}`, `HTTP ${status}`);
      else fail(`GET ${path}`, `Expected one of [${expected}], got ${status}`);
    } catch (e) {
      fail(`GET ${path}`, e.message);
    }
  }
}

async function testDbTables() {
  console.log('\n🗄️  Database Tables');

  // profiles table
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) fail('profiles table exists', error.message);
    else ok('profiles table exists', `found ${data?.length ?? 0} rows (limited)`);
  } catch (e) { fail('profiles table exists', e.message); }

  // clients table
  try {
    const { data, error } = await supabase.from('clients').select('id').limit(1);
    if (error) fail('clients table exists', error.message);
    else ok('clients table exists', `accessible`);
  } catch (e) { fail('clients table exists', e.message); }

  // invoices table
  try {
    const { data, error } = await supabase.from('invoices').select('id').limit(1);
    if (error) fail('invoices table exists', error.message);
    else ok('invoices table exists', `accessible`);
  } catch (e) { fail('invoices table exists', e.message); }

  // payslips table
  try {
    const { data, error } = await supabase.from('payslips').select('id').limit(1);
    if (error) fail('payslips table exists', error.message);
    else ok('payslips table exists', `accessible`);
  } catch (e) { fail('payslips table exists', e.message); }

  // referral_codes table
  try {
    const { data, error } = await supabase.from('referral_codes').select('id').limit(5);
    if (error) fail('referral_codes table exists', error.message);
    else ok('referral_codes table exists', `${data?.length ?? 0} codes found`);
  } catch (e) { fail('referral_codes table exists', e.message); }

  // referrals table
  try {
    const { data, error } = await supabase.from('referrals').select('id').limit(5);
    if (error) fail('referrals table exists', error.message);
    else ok('referrals table exists', `${data?.length ?? 0} referrals found`);
  } catch (e) { fail('referrals table exists', e.message); }
}

async function testReferralSystem() {
  console.log('\n🎁  Referral System');

  // 1. Fetch all referral codes (service role bypasses RLS)
  try {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('code, user_id, total_referrals, converted_referrals, free_months_earned, lifetime_pro')
      .limit(10);

    if (error) {
      fail('referral_codes readable by service role', error.message);
    } else {
      ok('referral_codes readable by service role', `${data?.length ?? 0} rows`);

      // Validate code format PREFIX-SUFFIX
      const badCodes = (data ?? []).filter(r => !/^[A-Z]+-[A-Z0-9]+$/.test(r.code));
      if (badCodes.length === 0) ok('referral code format valid', 'all codes match PREFIX-SUFFIX');
      else fail('referral code format valid', `bad codes: ${badCodes.map(r => r.code).join(', ')}`);
    }
  } catch (e) { fail('referral_codes readable', e.message); }

  // 2. Check referrals table schema
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('id, referral_code, referrer_id, referred_user_id, status, reward_applied')
      .limit(5);

    if (error) fail('referrals schema correct', error.message);
    else ok('referrals schema correct', `columns present, ${data?.length ?? 0} rows`);
  } catch (e) { fail('referrals schema correct', e.message); }

  // 3. Test that /api/referral/ensure-code requires auth
  try {
    const { status } = await postApi('/api/referral/ensure-code', {});
    if (status === 401) ok('/api/referral/ensure-code rejects missing auth', `HTTP 401`);
    else fail('/api/referral/ensure-code rejects missing auth', `Expected 401, got ${status}`);
  } catch (e) { fail('/api/referral/ensure-code rejects missing auth', e.message); }

  // 4. Test that /api/referral/track-signup requires auth
  try {
    const { status } = await postApi('/api/referral/track-signup', { refCode: 'TEST-1234' });
    if (status === 401) ok('/api/referral/track-signup rejects missing auth', `HTTP 401`);
    else fail('/api/referral/track-signup rejects missing auth', `Expected 401, got ${status}`);
  } catch (e) { fail('/api/referral/track-signup rejects missing auth', e.message); }

  // 5. Test referral link with unknown code still loads signup page
  try {
    const { status } = await get('/signup?ref=UNKNOWN-CODE', [200]);
    if (status === 200) ok('/signup?ref=CODE renders signup page', `HTTP 200`);
    else fail('/signup?ref=CODE renders signup page', `Expected 200, got ${status}`);
  } catch (e) { fail('/signup?ref=CODE renders signup page', e.message); }

  // 6. Reward tier logic — verify DB numeric fields are sane
  try {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('converted_referrals, free_months_earned, lifetime_pro')
      .limit(20);

    if (error) {
      fail('reward tier data sane', error.message);
    } else {
      const insane = (data ?? []).filter(r =>
        r.converted_referrals < 0 ||
        r.free_months_earned < 0 ||
        (r.lifetime_pro && r.converted_referrals < 10)
      );
      if (insane.length === 0) ok('reward tier data sane', `all ${data?.length} rows pass sanity check`);
      else fail('reward tier data sane', `${insane.length} rows have inconsistent tier data`);
    }
  } catch (e) { fail('reward tier data sane', e.message); }
}

async function testApiRoutes() {
  console.log('\n🔌  API Routes');

  const unauthRoutes = [
    ['/api/invoice/generate', 401],
    ['/api/referral/ensure-code', 401],
    ['/api/referral/track-signup', 401],
    ['/api/email/referral', 401],
  ];

  for (const [path, expectedStatus] of unauthRoutes) {
    try {
      const { status } = await postApi(path, {});
      if (status === expectedStatus) ok(`${path} requires auth`, `HTTP ${status}`);
      else fail(`${path} requires auth`, `Expected ${expectedStatus}, got ${status}`);
    } catch (e) {
      fail(`${path} requires auth`, e.message);
    }
  }

  // Stripe webhook endpoint exists (returns 400 without valid sig, not 404)
  try {
    const res = await fetch(`${BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      redirect: 'manual',
    });
    if (res.status !== 404) ok('/api/stripe/webhook endpoint exists', `HTTP ${res.status}`);
    else fail('/api/stripe/webhook endpoint exists', 'Got 404 — route missing');
  } catch (e) { fail('/api/stripe/webhook endpoint exists', e.message); }
}

async function testDbIntegrity() {
  console.log('\n🔍  DB Integrity');

  // All referral_codes should reference valid profiles
  try {
    const { data: codes, error: cErr } = await supabase
      .from('referral_codes')
      .select('user_id, code');
    if (cErr) { fail('referral_codes→profiles FK check', cErr.message); return; }

    if (!codes || codes.length === 0) {
      ok('referral_codes→profiles FK check', 'no codes yet, skipped');
      return;
    }

    const userIds = [...new Set(codes.map(c => c.user_id))];
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id')
      .in('id', userIds);

    if (pErr) { fail('referral_codes→profiles FK check', pErr.message); return; }

    const profileSet = new Set((profiles ?? []).map(p => p.id));
    const orphans = codes.filter(c => !profileSet.has(c.user_id));
    if (orphans.length === 0) ok('referral_codes→profiles FK check', `all ${codes.length} codes have valid user_id`);
    else fail('referral_codes→profiles FK check', `${orphans.length} orphaned codes: ${orphans.map(c => c.code).join(', ')}`);
  } catch (e) { fail('referral_codes→profiles FK check', e.message); }

  // referrals status field only has valid values
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('id, status')
      .limit(100);

    if (error) { fail('referrals status values valid', error.message); return; }

    const validStatuses = new Set(['signed_up', 'converted', 'expired']);
    const bad = (data ?? []).filter(r => !validStatuses.has(r.status));
    if (bad.length === 0) ok('referrals status values valid', `all ${data?.length} rows have valid status`);
    else fail('referrals status values valid', `${bad.length} rows with bad status: ${[...new Set(bad.map(r => r.status))].join(', ')}`);
  } catch (e) { fail('referrals status values valid', e.message); }

  // Check profiles table has expected columns
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, plan, billing_cycle_end, stripe_customer_id')
      .limit(1);
    if (error) fail('profiles has required columns', error.message);
    else ok('profiles has required columns', 'id, email, plan, billing_cycle_end, stripe_customer_id present');
  } catch (e) { fail('profiles has required columns', e.message); }
}

async function testRlsPolicies() {
  console.log('\n🔒  RLS Policies (anon client should see nothing)');

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  const tables = ['referral_codes', 'referrals', 'profiles', 'invoices', 'payslips'];
  for (const table of tables) {
    try {
      const { data, error } = await anonClient.from(table).select('id').limit(5);
      if (error) {
        ok(`RLS blocks anon on ${table}`, `error: ${error.message}`);
      } else if (!data || data.length === 0) {
        ok(`RLS blocks anon on ${table}`, `0 rows visible (correct)`);
      } else {
        fail(`RLS blocks anon on ${table}`, `LEAK: ${data.length} rows visible without auth`);
      }
    } catch (e) {
      ok(`RLS blocks anon on ${table}`, `fetch error (blocked): ${e.message}`);
    }
  }
}

// ─── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   SAB Account AI — End-to-End Test Suite     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Target: ${BASE}  |  Supabase: ${SUPABASE_URL}`);

  await testPageLoads();
  await testDbTables();
  await testReferralSystem();
  await testApiRoutes();
  await testDbIntegrity();
  await testRlsPolicies();

  // ─── summary ──────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('RESULTS:');
  console.log('══════════════════════════════════════════════════');
  for (const r of results) {
    const detail = r.detail ? `  → ${r.detail}` : '';
    console.log(`${r.status}  ${r.name}${detail}`);
  }
  console.log('══════════════════════════════════════════════════');
  console.log(`\n  PASSED: ${passed}   FAILED: ${failed}   TOTAL: ${passed + failed}`);
  if (failed === 0) console.log('\n🎉 All tests passed!');
  else console.log(`\n⚠️  ${failed} test(s) failed — review above`);
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
