// Master switch for free mode. When true:
//   - every user is treated as 'autopilot' (all features unlocked)
//   - pricing, plan pickers, upgrade CTAs, and checkout are hidden/disabled
//   - plan-filtered crons run for all users
// Stripe code stays in place but dormant — flip to false to bring paid plans back.
export const FREE_MODE = true
