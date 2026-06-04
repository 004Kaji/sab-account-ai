export interface Quarter {
  label: string
  start: string
  end: string
  basDue: string
  superDue: string
}

// Returns today's date as YYYY-MM-DD in Australian Eastern time (AEST/AEDT),
// so quarter boundaries align with ATO calendar dates rather than UTC.
function aestToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
}

export function buildQuarters(): Quarter[] {
  // Parse year/month in AEDT so FY start is correct around Jul 1 boundaries
  const dateStr = aestToday() // YYYY-MM-DD
  const year    = parseInt(dateStr.slice(0, 4))
  const month   = parseInt(dateStr.slice(5, 7))
  const fyStart = month >= 7 ? year : year - 1

  return [
    {
      label:    `Q1 FY${fyStart}–${String(fyStart + 1).slice(2)} (Jul–Sep ${fyStart})`,
      start:    `${fyStart}-07-01`,
      end:      `${fyStart}-09-30`,
      basDue:   `28 Oct ${fyStart}`,
      superDue: `28 Oct ${fyStart}`,
    },
    {
      label:    `Q2 FY${fyStart}–${String(fyStart + 1).slice(2)} (Oct–Dec ${fyStart})`,
      start:    `${fyStart}-10-01`,
      end:      `${fyStart}-12-31`,
      basDue:   `28 Feb ${fyStart + 1}`,
      superDue: `28 Jan ${fyStart + 1}`,
    },
    {
      label:    `Q3 FY${fyStart}–${String(fyStart + 1).slice(2)} (Jan–Mar ${fyStart + 1})`,
      start:    `${fyStart + 1}-01-01`,
      end:      `${fyStart + 1}-03-31`,
      basDue:   `28 Apr ${fyStart + 1}`,
      superDue: `28 Apr ${fyStart + 1}`,
    },
    {
      label:    `Q4 FY${fyStart}–${String(fyStart + 1).slice(2)} (Apr–Jun ${fyStart + 1})`,
      start:    `${fyStart + 1}-04-01`,
      end:      `${fyStart + 1}-06-30`,
      basDue:   `28 Jul ${fyStart + 1}`,
      superDue: `28 Jul ${fyStart + 1}`,
    },
  ]
}

export function currentQuarterIndex(quarters: Quarter[]): number {
  const today = aestToday()
  const idx   = quarters.findIndex(q => today >= q.start && today <= q.end)
  return idx === -1 ? quarters.length - 1 : idx
}
