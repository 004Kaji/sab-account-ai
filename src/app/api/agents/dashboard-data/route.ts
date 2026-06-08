export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const [briefing, conversations, contentBrief, alerts, subAgentLogs, latestWatcher, emailedCount, repliedCount, totalUsersR, paidUsersR, latestLiftR, latestAtlasR] = await Promise.all([
      supabase.from('agent_briefings').select('*').eq('briefing_date', today).maybeSingle(),
      supabase.from('agent_conversations').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('content_briefs').select('*').eq('week_start', weekStartStr).maybeSingle(),
      supabase.from('alert_history').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('sub_agent_logs').select('agent_name, created_at, success').order('created_at', { ascending: false }).limit(50),
      supabase.from('watcher_reports').select('report, created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('accountant_outreach').select('*', { count: 'exact', head: true }).not('emailed_at', 'is', null),
      supabase.from('accountant_outreach').select('*', { count: 'exact', head: true }).eq('replied', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('plan', 'free'),
      supabase.from('agent_logs').select('actions_taken, created_at').eq('agent_name', 'lift').eq('trigger_type', 'daily_scan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('agent_logs').select('outcome, created_at, input_context').eq('agent_name', 'atlas').eq('trigger_type', 'weekly_intel').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    // Derive sub-agent last-run map
    type SubAgentLog = { agent_name: string; created_at: string; success: boolean }
    const subAgentStatus: Record<string, { lastRun: string; success: boolean }> = {}
    for (const log of ((subAgentLogs.data ?? []) as SubAgentLog[])) {
      if (!subAgentStatus[log.agent_name]) {
        subAgentStatus[log.agent_name] = { lastRun: log.created_at, success: log.success }
      }
    }

    type LiftActions = { atRiskCount?: number; upgradeSignals?: number; onboardingGaps?: number }
    const liftData = latestLiftR.data
      ? { ...(latestLiftR.data.actions_taken as LiftActions), lastRun: latestLiftR.data.created_at as string }
      : null

    const atlasData = latestAtlasR.data
      ? { summary: latestAtlasR.data.outcome as string, lastRun: latestAtlasR.data.created_at as string }
      : null

    return NextResponse.json({
      briefing: briefing.data,
      conversations: conversations.data ?? [],
      contentBrief: contentBrief.data,
      alerts: alerts.data ?? [],
      subAgentStatus,
      watcher: latestWatcher.data,
      outreach: { emailed: emailedCount.count ?? 0, replied: repliedCount.count ?? 0 },
      users: { total: totalUsersR.count ?? 0, paid: paidUsersR.count ?? 0 },
      lift: liftData,
      atlas: atlasData,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load' }, { status: 500 })
  }
}
