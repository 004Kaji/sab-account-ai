// Australian Modern Award penalty rates by industry.
// Sources: Fair Work Act 2009, Modern Award schedules (2024–25 rates).
// Rates shown are for the most common classification level.
// Employers must verify their specific classification at fairwork.gov.au

export interface AwardRates {
  awardName:     string
  awardShort:    string
  // Evening penalty — not all Awards have one
  evening?: {
    mult:      number  // e.g. 1.15 = 115%
    afterHour: number  // 24h, e.g. 19 = 7pm
    label:     string
  }
  saturday:      number  // e.g. 1.25 = 125%
  sunday:        number
  publicHoliday: number
  note?:         string
}

export const AWARD_RATES: Record<string, AwardRates> = {
  'Café / Coffee Shop': {
    awardName:  'Restaurant Industry Award 2020',
    awardShort: 'Restaurant Award',
    evening:    { mult: 1.15, afterHour: 19, label: 'Evening (after 7pm)' },
    saturday:   1.25,
    sunday:     1.75,
    publicHoliday: 2.25,
    note: 'Rates are for Level 1. Verify your employee\'s classification at fairwork.gov.au',
  },
  'Restaurant': {
    awardName:  'Restaurant Industry Award 2020',
    awardShort: 'Restaurant Award',
    evening:    { mult: 1.15, afterHour: 19, label: 'Evening (after 7pm)' },
    saturday:   1.25,
    sunday:     1.75,
    publicHoliday: 2.25,
    note: 'Rates are for Level 1. Verify your employee\'s classification at fairwork.gov.au',
  },
  'Hotel / Bar / Club': {
    awardName:  'Hospitality Industry (General) Award 2020',
    awardShort: 'Hospitality Award',
    evening:    { mult: 1.15, afterHour: 19, label: 'Evening (after 7pm)' },
    saturday:   1.25,
    sunday:     1.75,
    publicHoliday: 2.25,
    note: 'Rates are for Level 1. Verify your employee\'s classification at fairwork.gov.au',
  },
  'Retail (Shop, Supermarket)': {
    awardName:  'General Retail Industry Award 2020',
    awardShort: 'Retail Award',
    saturday:   1.25,
    sunday:     2.00,
    publicHoliday: 2.25,
    note: 'Casual employees receive a 25% casual loading instead of weekend penalty rates',
  },
  'Hair & Beauty (Salon, Spa)': {
    awardName:  'Hair and Beauty Industry Award 2020',
    awardShort: 'Hair & Beauty Award',
    saturday:   1.25,
    sunday:     1.75,
    publicHoliday: 2.25,
  },
  'Cleaning & Facilities': {
    awardName:  'Cleaning Services Award 2020',
    awardShort: 'Cleaning Award',
    saturday:   1.50,
    sunday:     2.00,
    publicHoliday: 2.50,
  },
  'Building & Construction': {
    awardName:  'Building and Construction General On-site Award 2020',
    awardShort: 'Building Award',
    saturday:   1.50,
    sunday:     2.00,
    publicHoliday: 2.50,
    note: 'Does not include allowances (tool, travel, etc.) — add those separately',
  },
  'Transport & Logistics': {
    awardName:  'Road Transport (Long Distance Operations) Award 2020',
    awardShort: 'Transport Award',
    saturday:   1.50,
    sunday:     2.00,
    publicHoliday: 2.50,
  },
  'Healthcare & Aged Care': {
    awardName:  'Aged Care Award 2010',
    awardShort: 'Aged Care Award',
    saturday:   1.50,
    sunday:     2.00,
    publicHoliday: 2.50,
  },
  'Childcare & Education': {
    awardName:  'Children\'s Services Award 2010',
    awardShort: 'Childcare Award',
    saturday:   1.50,
    sunday:     2.00,
    publicHoliday: 2.50,
  },
  'Professional Services (Admin, Finance, Legal)': {
    awardName:  'Clerks—Private Sector Award 2020',
    awardShort: 'Clerks Award',
    saturday:   1.25,
    sunday:     1.50,
    publicHoliday: 2.25,
  },
  'Technology & IT': {
    awardName:  'Professional Employees Award 2020',
    awardShort: 'Professional Award',
    saturday:   1.50,
    sunday:     2.00,
    publicHoliday: 2.50,
    note: 'Many tech roles are paid above Award. Check your employment contracts',
  },
  'Security': {
    awardName:  'Security Services Industry Award 2020',
    awardShort: 'Security Award',
    evening:    { mult: 1.15, afterHour: 18, label: 'Evening (after 6pm)' },
    saturday:   1.50,
    sunday:     2.00,
    publicHoliday: 2.75,
  },
  'Agriculture & Farming': {
    awardName:  'Pastoral Award 2020',
    awardShort: 'Pastoral Award',
    saturday:   1.00,
    sunday:     2.00,
    publicHoliday: 2.50,
    note: 'Saturday rates may not apply for all farm roles — check your classification',
  },
  'Manufacturing': {
    awardName:  'Manufacturing and Associated Industries and Occupations Award 2020',
    awardShort: 'Manufacturing Award',
    saturday:   1.50,
    sunday:     2.00,
    publicHoliday: 2.50,
  },
  'Real Estate': {
    awardName:  'Real Estate Industry Award 2020',
    awardShort: 'Real Estate Award',
    saturday:   1.25,
    sunday:     1.75,
    publicHoliday: 2.25,
  },
  'Creative & Design': {
    awardName:  'Graphic Arts, Printing and Publishing Award 2020',
    awardShort: 'Graphic Arts Award',
    saturday:   1.50,
    sunday:     2.00,
    publicHoliday: 2.50,
    note: 'Many creative roles are above-Award. Verify your contracts',
  },
  'Other': {
    awardName:  'Not specified — check fairwork.gov.au',
    awardShort: 'Check Fair Work',
    saturday:   1.50,
    sunday:     2.00,
    publicHoliday: 2.50,
    note: 'Generic rates shown. Find your Award at fairwork.gov.au/employment-conditions/awards/find-my-award',
  },
}

// List of industries in display order (used in dropdowns)
export const INDUSTRY_LIST = Object.keys(AWARD_RATES)

export function getAwardRates(industry: string): AwardRates | null {
  return AWARD_RATES[industry] ?? null
}

export function pct(mult: number): string {
  return `${Math.round(mult * 100)}%`
}
