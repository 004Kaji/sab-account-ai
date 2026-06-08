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

    const [briefing, conversations, contentBrief, alerts, subAgentLogs, latestWatcher, emailedCount, repliedCount] = await Promise.all([
      supabase.from('agent_briefings').select('*').eq('briefing_date', today).maybeSingle(),
      supabase.from('agent_conversations').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('content_briefs').select('*').eq('week_start', weekStartStr).maybeSingle(),
      supabase.from('alert_history').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('sub_agent_logs').select('agent_name, created_at, success').order('created_at', { ascending: false }).limit(50),
      supabase.from('watcher_reports').select('report, created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('accountant_outreach').select('*', { count: 'exact', head: true }).not('emailed_at', 'is', null),
      supabase.from('accountant_outreach').select('*', { count: 'exact', head: true }).eq('replied', true),
    ])

    // Derive sub-agent last-run map
    type SubAgentLog = { agent_name: string; created_at: string; success: boolean }
    const subAgentStatus: Record<string, { lastRun: string; success: boolean }> = {}
    for (const log of ((subAgentLogs.data ?? []) as SubAgentLog[])) {
      if (!subAgentStatus[log.agent_name]) {
        subAgentStatus[log.agent_name] = { lastRun: log.created_at, success: log.success }
      }
    }

    return NextResponse.json({
      briefing: briefing.data,
      conversations: conversations.data ?? [],
      contentBrief: contentBrief.data,
      alerts: alerts.data ?? [],
      subAgentStatus,
      watcher: latestWatcher.data,
      outreach: { emailed: emailedCount.count ?? 0, replied: repliedCount.count ?? 0 },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load' }, { status: 500 })
  }
}
