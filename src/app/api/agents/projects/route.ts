export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { logAgentAction } from '@/lib/agents/utils'

// Future project agents plug in here at the same level as SAB and Personal.
// To add a new project:
//   1. Create src/lib/agents/projects/<project-name>.ts
//   2. Add a case to the switch below
//   3. Register in availableProjects
//   4. Zero changes to any other file required

const availableProjects: string[] = [
  // 'synthetic-data-marketplace',  // uncomment when ready
]

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const secret = process.env.AGENT_WEBHOOK_SECRET ?? ''
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const start = Date.now()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      project?:  string
      trigger?:  string
      question?: string
    }

    const project = body.project ?? ''
    const trigger = body.trigger ?? 'ask'

    switch (project) {
      // Future projects: add cases here
      // case 'synthetic-data-marketplace': {
      //   const { syntheticDataAgent } = await import('@/lib/agents/projects/synthetic-data')
      //   return NextResponse.json(await syntheticDataAgent(trigger, body.question))
      // }

      default:
        await logAgentAction({ agentName: 'projects', triggerType: trigger, inputContext: { project }, outcome: 'no_agent', durationMs: Date.now() - start })
        return NextResponse.json({
          message: `No agent for project: ${project || '(none specified)'}`,
          availableProjects,
        })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg })
  }
}
