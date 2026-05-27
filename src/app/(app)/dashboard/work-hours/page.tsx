'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { todayISO, formatDateAU } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────
type Mode = 'semester' | 'holiday'

interface WorkHourEntry {
  id: string
  work_date: string
  hours_worked: number
  employer_name: string | null
  notes: string | null
  created_at: string
}

interface LogForm {
  work_date: string
  hours_worked: string
  employer_name: string
  notes: string
}

interface FortnightPeriod {
  start: string
  end: string
  entries: WorkHourEntry[]
}

// ── Fortnight calculation ─────────────────────────────────────────────
// Australian fortnights: Monday–Sunday x2
// Anchor: Monday 19 May 2026 — all fortnights are computed relative to this.
const ANCHOR = new Date(2026, 4, 19) // months are 0-indexed; 4 = May
const MS_DAY = 24 * 60 * 60 * 1000

function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function localDateToISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fortnightFor(dateISO: string): { start: string; end: string } {
  const date = isoToLocalDate(dateISO)
  const daysSinceAnchor = Math.floor((date.getTime() - ANCHOR.getTime()) / MS_DAY)
  const fnIndex = Math.floor(daysSinceAnchor / 14)
  const startMs = ANCHOR.getTime() + fnIndex * 14 * MS_DAY
  return {
    start: localDateToISO(new Date(startMs)),
    end:   localDateToISO(new Date(startMs + 13 * MS_DAY)),
  }
}

function getCurrentFortnight() {
  const today = todayISO()
  const fn = fortnightFor(today)
  const nextStartMs = isoToLocalDate(fn.start).getTime() + 14 * MS_DAY
  return { ...fn, nextStart: localDateToISO(new Date(nextStartMs)) }
}

function formatShort(iso: string): string {
  return isoToLocalDate(iso).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function formatHours(h: number): string {
  return h % 1 === 0 ? `${h}` : h.toFixed(1)
}

function groupByFortnight(entries: WorkHourEntry[]): FortnightPeriod[] {
  const map = new Map<string, FortnightPeriod>()
  for (const e of entries) {
    const fn = fortnightFor(e.work_date)
    if (!map.has(fn.start)) {
      map.set(fn.start, { start: fn.start, end: fn.end, entries: [] })
    }
    map.get(fn.start)!.entries.push(e)
  }
  return [...map.values()].sort((a, b) => b.start.localeCompare(a.start))
}

// ── Sub-components ────────────────────────────────────────────────────
function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const isHoliday = mode === 'holiday'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.625rem',
      background: '#ffffff', border: '1px solid var(--border)',
      borderRadius: 'var(--r)', padding: '0.5rem 0.875rem',
    }}>
      <span style={{
        fontSize: '0.875rem', fontWeight: isHoliday ? 400 : 600,
        color: isHoliday ? 'var(--text3)' : 'var(--char)',
      }}>Semester</span>
      <button
        onClick={() => onChange(isHoliday ? 'semester' : 'holiday')}
        aria-label="Toggle semester / holiday mode"
        style={{
          position: 'relative', width: '40px', height: '22px', borderRadius: '11px',
          border: 'none', cursor: 'pointer', flexShrink: 0,
          background: isHoliday ? '#16a34a' : 'var(--border)',
          transition: 'background 200ms',
        }}
      >
        <span style={{
          position: 'absolute', width: '16px', height: '16px', borderRadius: '50%',
          background: '#ffffff', top: '3px',
          left: isHoliday ? '21px' : '3px',
          transition: 'left 200ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
      <span style={{
        fontSize: '0.875rem', fontWeight: isHoliday ? 600 : 400,
        color: isHoliday ? '#166534' : 'var(--text3)',
      }}>Holiday</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function WorkHoursPage() {
  const { toast } = useToast()
  const fn = getCurrentFortnight()

  const [mode, setMode]           = useState<Mode>('semester')
  const [entries, setEntries]     = useState<WorkHourEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<LogForm>({
    work_date:     todayISO(),
    hours_worked:  '',
    employer_name: '',
    notes:         '',
  })

  useEffect(() => { document.title = 'Work Hours — SAB Account AI' }, [])

  const load = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 4 weeks back, but always at least fortnight start
    const fourWeeksAgo = localDateToISO(new Date(Date.now() - 28 * MS_DAY))
    const since = fourWeeksAgo < fn.start ? fourWeeksAgo : fn.start

    const [{ data: settingsRow }, { data: hoursRows }] = await Promise.all([
      supabase
        .from('work_hours_settings')
        .select('mode')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('work_hours')
        .select('id, work_date, hours_worked, employer_name, notes, created_at')
        .eq('user_id', user.id)
        .gte('work_date', since)
        .order('work_date', { ascending: false }),
    ])

    if (settingsRow?.mode === 'semester' || settingsRow?.mode === 'holiday') {
      setMode(settingsRow.mode)
    }
    setEntries(
      (hoursRows ?? []).map(r => ({
        id:            r.id as string,
        work_date:     r.work_date as string,
        hours_worked:  Number(r.hours_worked),
        employer_name: r.employer_name as string | null,
        notes:         r.notes as string | null,
        created_at:    r.created_at as string,
      }))
    )
    setLoading(false)
  }, [fn.start])

  useEffect(() => { load() }, [load])

  // ── Derived values ─────────────────────────────────────────────
  const currentFNHours = entries
    .filter(e => e.work_date >= fn.start && e.work_date <= fn.end)
    .reduce((sum, e) => sum + e.hours_worked, 0)

  const LIMIT      = 48
  const isHoliday  = mode === 'holiday'
  const pct        = isHoliday ? 0 : Math.min(100, (currentFNHours / LIMIT) * 100)
  const remaining  = LIMIT - currentFNHours
  const showAmber  = !isHoliday && currentFNHours >= 40 && currentFNHours < LIMIT
  const showRed    = !isHoliday && currentFNHours >= LIMIT
  const barColor   = showRed ? '#dc2626' : showAmber ? '#d97706' : '#16a34a'
  const cardBorder = showRed
    ? '2px solid rgba(220,38,38,0.35)'
    : showAmber
    ? '2px solid rgba(217,119,6,0.3)'
    : '1px solid var(--border)'

  const grouped = groupByFortnight(entries)

  // ── Handlers ───────────────────────────────────────────────────
  async function handleModeChange(newMode: Mode) {
    setMode(newMode)
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('work_hours_settings')
      .upsert({ user_id: user.id, mode: newMode }, { onConflict: 'user_id' })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const hours = parseFloat(form.hours_worked)
    if (!form.work_date || isNaN(hours) || hours <= 0) {
      toast('Enter a valid date and number of hours', 'error')
      return
    }
    if (hours > 24) {
      toast('Hours per day cannot exceed 24', 'error')
      return
    }
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('work_hours').insert({
        user_id:       user.id,
        work_date:     form.work_date,
        hours_worked:  hours,
        employer_name: form.employer_name.trim() || null,
        notes:         form.notes.trim() || null,
      })
      if (error) throw error
      setForm(prev => ({ ...prev, hours_worked: '', employer_name: '', notes: '' }))
      toast('Hours logged!', 'success')
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.from('work_hours').delete().eq('id', id)
      if (error) throw error
      setEntries(prev => prev.filter(e => e.id !== id))
      toast('Entry deleted', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px', borderColor: 'var(--cream3)', borderTopColor: 'var(--ember)' }} />
      </div>
    )
  }

  return (
    <div className="page-pad" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem',
      }}>
        <div>
          <h1 className="font-display" style={{
            fontSize: '1.75rem', fontWeight: 600, color: 'var(--char)',
            letterSpacing: '-0.02em', marginBottom: '0.25rem',
          }}>
            Work Hours Tracker
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
            Student visa 48hr/fortnight limit
          </p>
        </div>
        <ModeToggle mode={mode} onChange={handleModeChange} />
      </div>

      {/* ── Holiday banner ───────────────────────────────────────── */}
      {isHoliday && (
        <div style={{
          background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)',
          borderRadius: 'var(--r)', padding: '1rem 1.25rem',
          marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.375rem', lineHeight: 1 }}>🌴</span>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#166534' }}>
            No limit — enjoy your break!
          </p>
        </div>
      )}

      {/* ── Red alert banner ─────────────────────────────────────── */}
      {showRed && (
        <div style={{
          background: 'rgba(220,38,38,0.07)', border: '2px solid rgba(220,38,38,0.45)',
          borderRadius: 'var(--r)', padding: '1rem 1.25rem', marginBottom: '1.5rem',
        }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>
            🚨 You have reached your 48hr limit for this fortnight.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#b91c1c', lineHeight: 1.5 }}>
            Working more may breach your student visa conditions. Contact your migration agent if unsure.
          </p>
        </div>
      )}

      {/* ── Amber warning banner ─────────────────────────────────── */}
      {showAmber && (
        <div style={{
          background: 'rgba(217,119,6,0.07)', border: '2px solid rgba(217,119,6,0.4)',
          borderRadius: 'var(--r)', padding: '1rem 1.25rem', marginBottom: '1.5rem',
        }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#b45309', marginBottom: '0.25rem' }}>
            ⚠️ You are approaching your 48hr limit.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
            {remaining.toFixed(1)} hrs remaining this fortnight.
          </p>
        </div>
      )}

      {/* ── Current fortnight summary card ───────────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: 'var(--r)',
        border: cardBorder, padding: '1.5rem', marginBottom: '1.5rem',
      }}>
        <p style={{
          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '0.5rem',
        }}>
          CURRENT FORTNIGHT
        </p>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text2)', fontWeight: 500, marginBottom: '0.875rem' }}>
          {formatShort(fn.start)} – {formatShort(fn.end)}
        </p>

        {/* Large hours number */}
        <p style={{
          fontSize: '3.5rem', fontWeight: 700, lineHeight: 1,
          fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em',
          color: isHoliday ? 'var(--char)' : barColor,
          marginBottom: '1.125rem',
        }}>
          {formatHours(currentFNHours)}{' '}
          <span style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text3)' }}>hrs</span>
        </p>

        {/* Progress bar */}
        {!isHoliday && (
          <>
            <div style={{
              height: '14px', borderRadius: '7px',
              background: 'var(--cream2)', overflow: 'hidden',
              marginBottom: '0.5rem',
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: '7px',
                background: barColor,
                transition: 'width 500ms ease, background 300ms',
                animation: (showRed || showAmber) ? 'wh-pulse 1.6s ease-in-out infinite' : undefined,
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '0.8125rem', marginBottom: '0.75rem',
            }}>
              <span style={{
                fontWeight: 600,
                color: remaining < 0 ? '#dc2626' : remaining <= 8 ? '#d97706' : '#16a34a',
              }}>
                {remaining >= 0
                  ? `${remaining.toFixed(1)} hrs remaining`
                  : `${Math.abs(remaining).toFixed(1)} hrs over limit`}
              </span>
              <span style={{ color: 'var(--text3)' }}>48 hr limit</span>
            </div>
          </>
        )}

        <p style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
          Fortnight resets {formatShort(fn.nextStart)}
        </p>
      </div>

      {/* ── Log hours form ───────────────────────────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: 'var(--r)',
        border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)', marginBottom: '1.125rem' }}>
          Log Hours
        </h2>
        <form onSubmit={handleSubmit}>
          <div
            className="form-grid-2"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}
          >
            <div>
              <label className="sab-label">
                Date <span style={{ color: 'var(--ember)' }}>*</span>
              </label>
              <input
                type="date"
                className="sab-input"
                value={form.work_date}
                max={todayISO()}
                onChange={e => setForm(prev => ({ ...prev, work_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="sab-label">
                Hours worked <span style={{ color: 'var(--ember)' }}>*</span>
              </label>
              <input
                type="number"
                className="sab-input"
                placeholder="e.g. 7.5"
                min="0.5"
                max="24"
                step="0.5"
                value={form.hours_worked}
                onChange={e => setForm(prev => ({ ...prev, hours_worked: e.target.value }))}
                onWheel={e => (e.target as HTMLInputElement).blur()}
                required
              />
            </div>
          </div>
          <div
            className="form-grid-2"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}
          >
            <div>
              <label className="sab-label">
                Employer{' '}
                <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                className="sab-input"
                placeholder="e.g. Woolworths"
                value={form.employer_name}
                onChange={e => setForm(prev => ({ ...prev, employer_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="sab-label">
                Notes{' '}
                <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                className="sab-input"
                placeholder="e.g. Weekend shift"
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn btn-ember" style={{ width: '100%' }}>
            {saving && (
              <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />
            )}
            {saving ? 'Saving…' : 'Log Hours'}
          </button>
        </form>
      </div>

      {/* ── History table ────────────────────────────────────────── */}
      {grouped.length > 0 ? (
        <div style={{
          background: '#ffffff', borderRadius: 'var(--r)',
          border: '1px solid var(--border)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '1.125rem 1.5rem', borderBottom: '1px solid var(--border)',
          }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--char)' }}>
              History — Last 4 Weeks
            </h2>
          </div>

          {grouped.map(period => {
            const total       = period.entries.reduce((s, e) => s + e.hours_worked, 0)
            const isCurrent   = period.start === fn.start
            const periodOver  = !isHoliday && total >= LIMIT
            const periodAmber = !isHoliday && total >= 40 && total < LIMIT
            const periodColor = periodOver ? '#dc2626' : periodAmber ? '#d97706' : 'var(--char)'
            const sorted      = [...period.entries].sort((a, b) => b.work_date.localeCompare(a.work_date))

            return (
              <div key={period.start}>
                {/* Fortnight header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.625rem 1rem', background: 'var(--cream)',
                  borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--char)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {formatShort(period.start)} – {formatShort(period.end)}
                    {isCurrent && (
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 700,
                        background: 'rgba(200,75,47,0.1)', color: 'var(--ember)',
                        padding: '0.1rem 0.5rem', borderRadius: '999px',
                      }}>
                        current
                      </span>
                    )}
                  </span>
                  <span style={{
                    fontSize: '0.875rem', fontWeight: 700,
                    fontFamily: 'var(--font-mono)', color: periodColor,
                  }}>
                    {formatHours(total)} hrs
                  </span>
                </div>

                {/* Entry rows */}
                <div className="table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '460px' }}>
                    <thead>
                      <tr style={{ background: 'var(--cream2)', borderBottom: '1px solid var(--border)' }}>
                        {(['Date', 'Hours', 'Employer', 'Notes', ''] as const).map(h => (
                          <th key={h} style={{
                            padding: '0.5rem 1rem', textAlign: 'left',
                            fontSize: '0.6875rem', fontWeight: 600,
                            color: 'var(--text3)', letterSpacing: '0.04em',
                            textTransform: 'uppercase', whiteSpace: 'nowrap',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((entry, i) => (
                        <tr
                          key={entry.id}
                          style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none' }}
                        >
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                            {formatDateAU(entry.work_date)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--char)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                            {formatHours(entry.hours_worked)}h
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text2)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.employer_name ?? '—'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text3)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.notes ?? '—'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={deletingId === entry.id}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '0.8125rem', color: 'var(--text3)',
                                padding: '0.25rem 0.5rem', borderRadius: '6px',
                                transition: 'color 150ms, background 150ms',
                                opacity: deletingId === entry.id ? 0.5 : 1,
                              }}
                              onMouseEnter={e => {
                                const el = e.currentTarget as HTMLButtonElement
                                el.style.color = '#dc2626'
                                el.style.background = 'rgba(220,38,38,0.06)'
                              }}
                              onMouseLeave={e => {
                                const el = e.currentTarget as HTMLButtonElement
                                el.style.color = 'var(--text3)'
                                el.style.background = 'none'
                              }}
                            >
                              {deletingId === entry.id ? '…' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{
          background: '#ffffff', borderRadius: 'var(--r)',
          border: '1px solid var(--border)', padding: '3rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏱</div>
          <p style={{ fontWeight: 600, color: 'var(--char)', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>
            No hours logged yet
          </p>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
            Log your first work shift above to start tracking.
          </p>
        </div>
      )}

      {/* ── Disclaimer ──────────────────────────────────────────── */}
      <p style={{
        fontSize: '0.75rem', color: 'var(--text3)', lineHeight: 1.6,
        marginTop: '1.5rem', padding: '1rem', background: 'var(--cream)',
        borderRadius: 'var(--r)',
      }}>
        <strong>Disclaimer:</strong> This tracker is a convenience tool only. Always verify your work hour conditions with your visa grant letter or a registered migration agent. Limits may vary for different visa subclasses.
      </p>

      <style>{`
        @keyframes wh-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.65; }
        }
      `}</style>
    </div>
  )
}
