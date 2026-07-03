/* eslint-disable */
// Run: node generate-pitch.js
// Output: SAB-Account-AI-Pitch-Deck.pptx

const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 10" x 5.625"

// ── Brand colours (no #) ──────────────────────────────
const BG    = '141414';
const CARD  = '1C1C1C';
const BRD   = '2A2A2A';
const ORG   = 'F97316';
const WHITE = 'FFFFFF';
const MUTED = 'A3A3A3';
const GREEN = '22C55E';
const RED   = 'EF4444';
const ORGDK = '2A1200'; // dark orange tint for badge bg

const FONT  = 'Calibri';

// ── Helpers ───────────────────────────────────────────
function slide() {
  const s = pptx.addSlide();
  s.background = { color: BG };
  return s;
}

function box(s, x, y, w, h, opts = {}) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: opts.fill || CARD },
    line: { color: opts.brd  || BRD, width: opts.lw || 1 },
    rectRadius: opts.r !== undefined ? opts.r : 0.1,
  });
}

function pill(s, x, y, w, h, opts = {}) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: opts.fill || ORGDK },
    line: { color: opts.brd  || ORG,  width: 0.75 },
    rectRadius: 0.22,
  });
}

function txt(s, str, x, y, w, h, opts = {}) {
  s.addText(str, {
    x, y, w, h,
    fontSize:  opts.fs    || 11,
    color:     opts.color || WHITE,
    bold:      opts.bold  || false,
    align:     opts.align || 'left',
    valign:    opts.va    || 'middle',
    fontFace:  FONT,
    wrap:      true,
    ...(opts.extra || {}),
  });
}

function slideNum(s, n) {
  txt(s, `${n} / 8`, 0.25, 5.22, 1, 0.24, { color: BRD, fs: 8 });
}

// ═══════════════════════════════════════════════════════
//  SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════
{
  const s = slide();

  // Soft orange glow behind title
  s.addShape(pptx.ShapeType.ellipse, {
    x: 2.8, y: -0.3, w: 4.4, h: 4.4,
    fill: { color: ORG, transparency: 85 },
    line: { color: ORG, width: 0 },
  });

  // Badge
  pill(s, 3.3, 0.28, 3.4, 0.33);
  txt(s, '⚡  Australia\'s First AI Payroll Tool',
      3.3, 0.28, 3.4, 0.33, { color: ORG, fs: 8.5, bold: true, align: 'center' });

  // Giant title
  s.addText([
    { text: 'SAB Account ', options: { color: WHITE } },
    { text: 'AI',           options: { color: ORG   } },
  ], { x: 0.8, y: 0.7, w: 8.4, h: 1.35, fontSize: 54, bold: true, fontFace: FONT, align: 'center' });

  // Subtitle
  txt(s, 'Payroll compliance in seconds. Not hours.',
      1, 2.1, 8, 0.38, { color: MUTED, fs: 14, align: 'center' });

  // Typewriter line (static)
  txt(s, 'Built for tradies  ·  Built for hospitality  ·  Built for Nepali business owners in Australia.',
      1, 2.54, 8, 0.32, { color: ORG, fs: 10, bold: true, align: 'center' });

  // CTA 1 — solid
  s.addShape(pptx.ShapeType.roundRect, {
    x: 2.7, y: 3.1, w: 2.0, h: 0.44,
    fill: { color: ORG },
    line: { color: ORG, width: 0 },
    rectRadius: 0.08,
  });
  txt(s, '⚡  View Live Demo', 2.7, 3.1, 2.0, 0.44, { color: WHITE, fs: 10.5, bold: true, align: 'center' });

  // CTA 2 — ghost
  s.addShape(pptx.ShapeType.roundRect, {
    x: 4.9, y: 3.1, w: 2.4, h: 0.44,
    fill: { color: BG },
    line: { color: ORG, width: 1.2 },
    rectRadius: 0.08,
  });
  txt(s, '→  sabaccountai.com.au', 4.9, 3.1, 2.4, 0.44, { color: ORG, fs: 10.5, bold: true, align: 'center' });

  // Founder
  txt(s, 'Sanjog Basnet  ·  Darwin, NT', 6.3, 5.2, 3.4, 0.26, { color: MUTED, fs: 9, align: 'right' });
}

// ═══════════════════════════════════════════════════════
//  SLIDE 2 — THE PROBLEM
// ═══════════════════════════════════════════════════════
{
  const s = slide();

  s.addText([
    { text: '🏢  ', options: { color: ORG } },
    { text: 'Australian Small Businesses Are Losing Money on Payroll', options: { color: WHITE } },
  ], { x: 0.4, y: 0.18, w: 9.2, h: 0.52, fontSize: 17, bold: true, fontFace: FONT });

  // Divider
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.72, w: 9.2, h: 0.018, fill: { color: BRD }, line: { color: BRD, width: 0 } });

  const cards = [
    { icon: '💰', title: 'Xero costs $70/month',         body: 'Too expensive for tradies, cleaners, and hospitality workers. Most can\'t afford it — or won\'t pay it. The market is wide open.' },
    { icon: '🛡️', title: 'Payday Super — July 1, 2026',  body: 'New law. ATO penalties for non-compliance. Most small businesses have absolutely no idea what to do. The deadline is here.' },
    { icon: '🧮', title: 'Manual payroll = mistakes',     body: 'Wrong PAYG withholding means ATO audits and back payments worth thousands. Not a maybe — it\'s a when.' },
  ];

  cards.forEach((c, i) => {
    const x = 0.4 + i * 3.08, y = 0.82, w = 2.97, h = 3.22;
    // Card with red left accent via thin shape
    box(s, x, y, w, h, { fill: CARD, brd: RED, lw: 1.5 });
    txt(s, c.icon,  x + 0.2, y + 0.15, 0.5,     0.38, { fs: 18 });
    txt(s, c.title, x + 0.2, y + 0.6,  w - 0.4, 0.44, { fs: 13, bold: true });
    txt(s, c.body,  x + 0.2, y + 1.1,  w - 0.4, 2.0,  { fs: 10, color: MUTED, va: 'top' });
  });

  // Stat bar
  box(s, 0.4, 4.2, 9.2, 0.92, { fill: CARD, brd: BRD });
  const stats = [
    { v: '2,500,000', l: 'Small businesses in Australia' },
    { v: '70%',       l: 'Doing payroll manually'        },
    { v: '$18B',      l: 'Lost to payroll errors annually' },
  ];
  stats.forEach((st, i) => {
    const x = 0.4 + i * 3.08;
    txt(s, st.v, x, 4.25, 3.08, 0.4, { fs: 18, bold: true, color: ORG, align: 'center' });
    txt(s, st.l, x, 4.64, 3.08, 0.32, { fs: 9, color: MUTED, align: 'center' });
    if (i < 2) s.addShape(pptx.ShapeType.rect, { x: 0.4 + (i + 1) * 3.08, y: 4.3, w: 0.012, h: 0.7, fill: { color: BRD }, line: { color: BRD, width: 0 } });
  });

  slideNum(s, 2);
}

// ═══════════════════════════════════════════════════════
//  SLIDE 3 — THE SOLUTION
// ═══════════════════════════════════════════════════════
{
  const s = slide();

  // ── Left side ──
  pill(s, 0.4, 0.22, 2.5, 0.32);
  txt(s, '🧠  Powered by Claude AI', 0.4, 0.22, 2.5, 0.32, { color: ORG, fs: 8.5, bold: true, align: 'center' });

  s.addText([
    { text: 'Type it. ',  options: { color: WHITE } },
    { text: 'Done.',      options: { color: ORG   } },
  ], { x: 0.4, y: 0.63, w: 4.4, h: 0.85, fontSize: 32, bold: true, fontFace: FONT });

  const benefits = [
    'ATO NAT 1004 verified — 19 scenarios, zero variance',
    'Payday Super auto-calculated — July 1 ready',
    'BAS calculator built in — quarterly GST sorted',
  ];
  benefits.forEach((b, i) => {
    const y = 1.6 + i * 0.54;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.4, y, w: 0.32, h: 0.32, fill: { color: ORGDK }, line: { color: ORG, width: 0.75 }, rectRadius: 0.06 });
    txt(s, '✓', 0.4, y, 0.32, 0.32, { color: ORG, fs: 11, bold: true, align: 'center' });
    txt(s, b,   0.82, y + 0.02, 3.9, 0.3, { fs: 11, color: WHITE });
  });

  // ── Right side: chat mock ──
  box(s, 5.1, 0.15, 4.5, 5.2, { fill: CARD, brd: ORG, lw: 1.5 });

  // Chat header
  s.addShape(pptx.ShapeType.roundRect, { x: 5.28, y: 0.32, w: 0.52, h: 0.48, fill: { color: ORG }, line: { color: ORG, width: 0 }, rectRadius: 0.09 });
  txt(s, 'S', 5.28, 0.32, 0.52, 0.48, { color: WHITE, fs: 15, bold: true, align: 'center' });
  txt(s, 'SAB Account AI',        5.9, 0.35, 3.1, 0.24, { fs: 11, bold: true });
  txt(s, '🟢  Online — ATO Verified', 5.9, 0.59, 3.1, 0.2,  { fs: 8.5, color: GREEN });
  s.addShape(pptx.ShapeType.rect, { x: 5.2, y: 0.92, w: 4.3, h: 0.012, fill: { color: BRD }, line: { color: BRD, width: 0 } });

  // User bubble
  s.addShape(pptx.ShapeType.roundRect, { x: 6.7, y: 1.08, w: 2.75, h: 0.5, fill: { color: ORG }, line: { color: ORG, width: 0 }, rectRadius: 0.12 });
  txt(s, 'Pay my plumber John $1,400 this week', 6.7, 1.08, 2.75, 0.5, { color: WHITE, fs: 9.5, bold: true, align: 'center' });

  // AI response
  box(s, 5.28, 1.72, 4.2, 3.35, { fill: '232323', brd: BRD });
  txt(s, '✓  Payslip Generated', 5.45, 1.82, 3.85, 0.34, { color: GREEN, fs: 12.5, bold: true });

  const rows = [
    { l: 'PAYG Withholding', v: '$186'   },
    { l: 'Payday Super',     v: '$168'   },
    { l: 'Medicare Levy',    v: '$28'    },
  ];
  rows.forEach((r, i) => {
    const ry = 2.24 + i * 0.38;
    txt(s, r.l, 5.45, ry, 2.4, 0.32, { color: MUTED, fs: 10 });
    txt(s, r.v, 7.85, ry, 1.5, 0.32, { color: WHITE, fs: 10, bold: true, align: 'right' });
  });

  s.addShape(pptx.ShapeType.rect, { x: 5.45, y: 3.42, w: 3.9, h: 0.012, fill: { color: BRD }, line: { color: BRD, width: 0 } });
  txt(s, 'Net Pay',  5.45, 3.5, 2.4,  0.42, { fs: 13, bold: true });
  txt(s, '$1,046',   7.85, 3.5, 1.5,  0.42, { color: GREEN, fs: 17, bold: true, align: 'right' });
  txt(s, '📄  Payslip ready to send', 5.45, 4.05, 3.85, 0.28, { color: ORG, fs: 10, bold: true });

  slideNum(s, 3);
}

// ═══════════════════════════════════════════════════════
//  SLIDE 4 — FEATURES (enhanced, 2-col x 3-row)
// ═══════════════════════════════════════════════════════
{
  const s = slide();

  s.addText([
    { text: '⭐  Built Different.  ', options: { color: WHITE } },
    { text: 'Every Feature Has a Reason.',  options: { color: ORG   } },
  ], { x: 0.4, y: 0.12, w: 9.2, h: 0.5, fontSize: 18, bold: true, fontFace: FONT });

  const feats = [
    {
      icon: '⚡',
      t: 'AI Payroll Chat',
      d: 'Type "Pay Sarah $1,200 this week" and get a compliant payslip in 8 seconds. No forms. No menus. Just results.',
      tag: 'Industry first',
    },
    {
      icon: '🛡️',
      t: 'ATO-Verified PAYG',
      d: 'NAT 1004 withholding formula. 19 tax scenarios tested. Zero variance across every bracket. ATO-ready every time.',
      tag: '19 scenarios verified',
    },
    {
      icon: '🧮',
      t: 'Payday Super — July 1 Ready',
      d: 'Auto-calculates 11.5% super on every payrun. Compliant with the new Payday Super law before the deadline hits.',
      tag: 'July 1 2026 compliant',
    },
    {
      icon: '📄',
      t: 'Invoices & Payslips',
      d: 'Professional PDF invoices with ABN validation. Branded payslips emailed to workers instantly. All in one place.',
      tag: 'Instant PDF',
    },
    {
      icon: '📊',
      t: 'BAS Calculator',
      d: 'Quarterly GST and PAYG withholding summary — pre-filled and ready for your accountant or ATO lodgement.',
      tag: 'GST + PAYG',
    },
    {
      icon: '👥',
      t: 'Accountant Portal',
      d: 'Invite your accountant. Read-only secure access. They see everything without you sharing passwords or spreadsheets.',
      tag: 'Secure access',
    },
  ];

  const CW = 4.57, CH = 1.48;
  feats.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.4 + col * (CW + 0.06);
    const y = 0.76 + row * (CH + 0.08);
    box(s, x, y, CW, CH);

    // Icon badge
    s.addShape(pptx.ShapeType.roundRect, { x: x + 0.18, y: y + 0.17, w: 0.44, h: 0.4, fill: { color: ORGDK }, line: { color: ORG, width: 0.5 }, rectRadius: 0.08 });
    txt(s, f.icon, x + 0.18, y + 0.17, 0.44, 0.4, { fs: 14, align: 'center' });

    // Feature name
    txt(s, f.t, x + 0.72, y + 0.17, 2.8, 0.32, { fs: 12.5, bold: true });

    // Orange tag pill
    s.addShape(pptx.ShapeType.roundRect, { x: x + 3.65, y: y + 0.19, w: CW - 3.72, h: 0.28, fill: { color: ORGDK }, line: { color: ORG, width: 0.5 }, rectRadius: 0.1 });
    txt(s, f.tag, x + 3.65, y + 0.19, CW - 3.72, 0.28, { color: ORG, fs: 7.5, bold: true, align: 'center' });

    // Horizontal divider
    s.addShape(pptx.ShapeType.rect, { x: x + 0.18, y: y + 0.62, w: CW - 0.36, h: 0.01, fill: { color: BRD }, line: { color: BRD, width: 0 } });

    // Description
    txt(s, f.d, x + 0.18, y + 0.72, CW - 0.36, 0.7, { fs: 9.5, color: MUTED, va: 'top' });
  });

  // Footer
  txt(s, 'All features from  $9/month  ·  No setup fees  ·  No lock-in  ·  Cancel anytime',
      0.4, 5.22, 9.2, 0.26, { color: MUTED, fs: 9.5, align: 'center' });

  slideNum(s, 4);
}

// ═══════════════════════════════════════════════════════
//  SLIDE 5 — SAB ACCOUNT AI vs XERO
// ═══════════════════════════════════════════════════════
{
  const s = slide();

  s.addText([
    { text: '⚔️  SAB Account AI vs Xero — ', options: { color: WHITE } },
    { text: 'The Choice is Clear.',           options: { color: ORG   } },
  ], { x: 0.4, y: 0.12, w: 9.2, h: 0.5, fontSize: 17, bold: true, fontFace: FONT });

  // ── Column headers ──
  // Feature column header
  box(s, 0.4, 0.72, 4.0, 0.44, { fill: '222222', brd: BRD, lw: 0.75 });
  txt(s, 'FEATURE', 0.4, 0.72, 4.0, 0.44, { color: MUTED, fs: 9.5, bold: true, align: 'center' });

  // SAB column header (orange)
  s.addShape(pptx.ShapeType.roundRect, { x: 4.5, y: 0.72, w: 2.55, h: 0.44, fill: { color: ORG }, line: { color: ORG, width: 0 }, rectRadius: 0.07 });
  txt(s, '⚡ SAB Account AI', 4.5, 0.72, 2.55, 0.44, { color: WHITE, fs: 10.5, bold: true, align: 'center' });

  // Xero column header
  box(s, 7.15, 0.72, 2.55, 0.44, { fill: '252525', brd: BRD, lw: 0.75 });
  txt(s, 'Xero', 7.15, 0.72, 2.55, 0.44, { color: MUTED, fs: 10.5, bold: true, align: 'center' });

  // ── Comparison rows ──
  const rows = [
    { f: 'Monthly Price',                    sab: '$9/month',      xero: '$70/month',    sabColor: GREEN,  xeroColor: RED,   sabBold: true },
    { f: 'AI Natural Language Payroll Chat', sab: '✓  Yes',        xero: '✗  No',        sabColor: GREEN,  xeroColor: RED,   sabBold: true },
    { f: 'Payday Super — July 1 2026',       sab: '✓  Built for it', xero: '✗  Not ready', sabColor: GREEN, xeroColor: RED,  sabBold: true },
    { f: 'ATO NAT 1004 Verified (19 cases)', sab: '✓  Zero variance', xero: '✗  Not verified', sabColor: GREEN, xeroColor: RED, sabBold: true },
    { f: 'Payslip Generator',                sab: '✓  Instant PDF', xero: '✓  Yes',      sabColor: GREEN,  xeroColor: WHITE, sabBold: false },
    { f: 'Invoice Generator',                sab: '✓  Yes',        xero: '✓  Yes',       sabColor: GREEN,  xeroColor: WHITE, sabBold: false },
    { f: 'BAS Calculator',                   sab: '✓  Included',   xero: '✓  Included',  sabColor: GREEN,  xeroColor: WHITE, sabBold: false },
    { f: 'Accountant Portal',                sab: '✓  Free',       xero: '✗  Paid add-on', sabColor: GREEN, xeroColor: RED, sabBold: true },
    { f: 'Setup Fees',                       sab: '$0',            xero: '$0',           sabColor: GREEN,  xeroColor: WHITE, sabBold: false },
    { f: 'Built for Tradies & Hospitality',  sab: '✓  Purpose-built', xero: '✗  Generic', sabColor: GREEN, xeroColor: RED,  sabBold: true },
  ];

  const ROW_H = 0.38;
  const START_Y = 1.22;
  const COL1_X = 0.4, COL2_X = 4.5, COL3_X = 7.15;
  const COL1_W = 4.0, COL2_W = 2.55, COL3_W = 2.55;

  rows.forEach((r, i) => {
    const y = START_Y + i * ROW_H;
    const fill = i % 2 === 0 ? '1C1C1C' : '191919';

    // Row backgrounds
    s.addShape(pptx.ShapeType.rect, { x: COL1_X, y, w: COL1_W, h: ROW_H, fill: { color: fill }, line: { color: BRD, width: 0.5 } });
    s.addShape(pptx.ShapeType.rect, { x: COL2_X, y, w: COL2_W, h: ROW_H, fill: { color: i % 2 === 0 ? '1F1100' : '1C0F00' }, line: { color: BRD, width: 0.5 } });
    s.addShape(pptx.ShapeType.rect, { x: COL3_X, y, w: COL3_W, h: ROW_H, fill: { color: fill }, line: { color: BRD, width: 0.5 } });

    // Text
    txt(s, r.f,    COL1_X + 0.2, y, COL1_W - 0.2, ROW_H, { color: WHITE,      fs: 9.5,  va: 'middle' });
    txt(s, r.sab,  COL2_X,       y, COL2_W,        ROW_H, { color: r.sabColor, fs: 9.5,  bold: r.sabBold, align: 'center', va: 'middle' });
    txt(s, r.xero, COL3_X,       y, COL3_W,        ROW_H, { color: r.xeroColor, fs: 9.5, align: 'center', va: 'middle' });
  });

  // ── Summary callout ──
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 5.05, w: 9.2, h: 0.4,
    fill: { color: ORG },
    line: { color: ORG, width: 0 },
    rectRadius: 0.07,
  });
  s.addText([
    { text: 'Same job. Better tool. ', options: { color: WHITE, bold: true } },
    { text: '87% cheaper than Xero.', options: { color: WHITE, bold: true } },
    { text: '  $9/month vs $70/month — Save $732 every year.', options: { color: 'FDE68A' } },
  ], { x: 0.5, y: 5.05, w: 9.1, h: 0.4, fontSize: 12, fontFace: FONT, align: 'center', valign: 'middle' });

  slideNum(s, 5);
}

// ═══════════════════════════════════════════════════════
//  SLIDE 6 — TRACTION
// ═══════════════════════════════════════════════════════
{
  const s = slide();

  s.addText([
    { text: '📈  Built. Verified. Live.  ', options: { color: WHITE } },
    { text: 'Growing.',                       options: { color: ORG   } },
  ], { x: 0.4, y: 0.18, w: 9.2, h: 0.5, fontSize: 18, bold: true, fontFace: FONT });

  const metrics = [
    { n: '16',  l: 'Test Users Active',          s: 'Real accounts, real payroll', green: false },
    { n: '315', l: 'Automated Tests Passing',     s: 'Zero failures',              green: false },
    { n: '19',  l: 'ATO Scenarios Verified',      s: 'Zero variance',              green: false },
    { n: '$0',  l: 'Bugs in Production',          s: 'Clean build',                green: true  },
  ];

  const MW = 2.22;
  metrics.forEach((m, i) => {
    const x = 0.4 + i * (MW + 0.07), y = 0.82;
    box(s, x, y, MW, 2.0);
    txt(s, m.n, x + 0.1, y + 0.18, MW - 0.2, 0.85,
        { fs: 40, bold: true, color: m.green ? GREEN : ORG, align: 'center' });
    txt(s, m.l, x + 0.1, y + 1.06, MW - 0.2, 0.5,
        { fs: 10, bold: true, align: 'center', va: 'top' });
    txt(s, m.s, x + 0.1, y + 1.6,  MW - 0.2, 0.28,
        { fs: 8.5, color: m.green ? GREEN : MUTED, align: 'center' });
  });

  // Banner
  box(s, 0.4, 3.0, 9.2, 0.9, { fill: '1A0E00', brd: ORG, lw: 0.75 });
  s.addText([
    { text: 'Payday Super July 1 2026', options: { color: ORG, bold: true } },
    { text: ' is the single biggest payroll compliance event in a decade. SAB Account AI is the ', options: { color: WHITE } },
    { text: 'only tool built specifically for it.', options: { color: ORG, bold: true } },
    { text: ' The deadline is not optional.', options: { color: WHITE } },
  ], { x: 0.6, y: 3.04, w: 8.85, h: 0.82, fontSize: 11.5, fontFace: FONT, wrap: true, valign: 'middle' });

  // Live pill
  s.addShape(pptx.ShapeType.roundRect, { x: 0.4, y: 4.1, w: 5.8, h: 0.4, fill: { color: '0A2010' }, line: { color: GREEN, width: 0.75 }, rectRadius: 0.2 });
  txt(s, '🟢  Live at sabaccountai.com.au — Real product. Not a mockup.',
      0.55, 4.1, 5.55, 0.4, { color: GREEN, fs: 10, bold: true });

  slideNum(s, 6);
}

// ═══════════════════════════════════════════════════════
//  SLIDE 7 — ACCOUNTANT PARTNER PROGRAM
// ═══════════════════════════════════════════════════════
{
  const s = slide();

  s.addText([
    { text: '👥  Your Clients Need This.  ', options: { color: WHITE } },
    { text: 'You Earn Every Month They Use It.', options: { color: ORG } },
  ], { x: 0.4, y: 0.15, w: 9.2, h: 0.5, fontSize: 15.5, bold: true, fontFace: FONT });

  // Left card
  box(s, 0.4, 0.78, 4.57, 3.6);
  txt(s, 'What Your Clients Get', 0.6, 0.92, 4.17, 0.38, { fs: 13.5, bold: true });
  const clientItems = [
    'ATO-compliant payroll from $9/month',
    'Payday Super auto-calculated — July 1 ready',
    'Professional payslips in seconds',
    'BAS calculator included',
    'Accountant portal — you see everything',
  ];
  clientItems.forEach((item, i) => {
    const y = 1.4 + i * 0.47;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y, w: 0.3, h: 0.3, fill: { color: ORGDK }, line: { color: ORG, width: 0.5 }, rectRadius: 0.05 });
    txt(s, '✓', 0.6, y, 0.3, 0.3, { color: ORG, fs: 10, bold: true, align: 'center' });
    txt(s, item, 1.0, y + 0.02, 3.75, 0.3, { fs: 10.5, color: WHITE });
  });

  // Right card
  box(s, 5.07, 0.78, 4.57, 3.6);
  txt(s, 'What You Earn', 5.27, 0.92, 4.17, 0.38, { fs: 13.5, bold: true });
  const earnItems = [
    { t: '30% recurring monthly commission', bold: true },
    { t: 'Paid every month, forever, per client' },
    { t: 'No selling — just refer and earn' },
  ];
  earnItems.forEach((item, i) => {
    const y = 1.4 + i * 0.43;
    txt(s, '$', 5.27, y, 0.28, 0.33, { color: ORG, fs: 12, bold: true });
    txt(s, item.t, 5.62, y + 0.02, 3.75, 0.3, { fs: 10.5, color: item.bold ? WHITE : MUTED, bold: !!item.bold });
  });

  // Earn calc box
  box(s, 5.27, 2.75, 4.17, 1.38, { fill: '1E0D00', brd: ORG, lw: 0.75 });
  s.addText(
    '10 clients × Pro $19/mo = $57/month\n50 clients = $285/month\nPassive. Recurring. Forever.',
    { x: 5.44, y: 2.88, w: 3.85, h: 1.15, fontSize: 11.5, bold: true, color: ORG, fontFace: FONT, wrap: true, valign: 'top' }
  );

  // CTA strip
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 4.55, w: 9.2, h: 0.78,
    fill: { color: ORG },
    line: { color: ORG, width: 0 },
    rectRadius: 0.1,
  });
  txt(s, 'Start with one client free for 3 months. See it work. Then decide.',
      0.6, 4.58, 7.1, 0.72, { color: WHITE, fs: 13, bold: true, va: 'middle' });
  s.addShape(pptx.ShapeType.roundRect, { x: 8.1, y: 4.67, w: 1.35, h: 0.5, fill: { color: 'EA6C0A' }, line: { color: WHITE, width: 1 }, rectRadius: 0.07 });
  txt(s, 'Get Started →', 8.1, 4.67, 1.35, 0.5, { color: WHITE, fs: 10, bold: true, align: 'center' });

  slideNum(s, 7);
}

// ═══════════════════════════════════════════════════════
//  SLIDE 8 — OPPORTUNITY
// ═══════════════════════════════════════════════════════
{
  const s = slide();

  s.addText([
    { text: '📊  2.5 Million Businesses.  ', options: { color: WHITE } },
    { text: 'We Need 0.1%.',                  options: { color: ORG   } },
  ], { x: 0.4, y: 0.15, w: 9.2, h: 0.5, fontSize: 18, bold: true, fontFace: FONT });

  const opps = [
    { yr: 'YEAR 1', c: '500 customers',    a: '→ $54,000 ARR',   pct: 0.10 },
    { yr: 'YEAR 2', c: '5,000 customers',  a: '→ $540,000 ARR',  pct: 0.40 },
    { yr: 'YEAR 3', c: '25,000 customers', a: '→ $2.7M ARR',     pct: 1.00 },
  ];

  const OW = 2.97;
  opps.forEach((o, i) => {
    const x = 0.4 + i * (OW + 0.07), y = 0.78;
    box(s, x, y, OW, 1.78);
    txt(s, o.yr, x + 0.2, y + 0.12, OW - 0.4, 0.26, { color: ORG, fs: 8.5, bold: true });
    txt(s, o.c,  x + 0.2, y + 0.4,  OW - 0.4, 0.35, { fs: 15, bold: true });
    txt(s, o.a,  x + 0.2, y + 0.78, OW - 0.4, 0.28, { fs: 10.5, color: MUTED });
    // Bar track
    s.addShape(pptx.ShapeType.roundRect, { x: x + 0.2, y: y + 1.2, w: OW - 0.4, h: 0.1, fill: { color: BRD }, line: { color: BRD, width: 0 }, rectRadius: 0.05 });
    // Bar fill
    if (o.pct > 0) s.addShape(pptx.ShapeType.roundRect, { x: x + 0.2, y: y + 1.2, w: (OW - 0.4) * o.pct, h: 0.1, fill: { color: ORG }, line: { color: ORG, width: 0 }, rectRadius: 0.05 });
  });

  // Pricing row
  const prices = [
    { tier: 'FREE',      amt: '$0'       },
    { tier: 'STARTER',   amt: '$9/mo'   },
    { tier: 'PRO',       amt: '$19/mo'  },
    { tier: 'AUTOPILOT', amt: '$49–79/mo' },
  ];
  const PW = 2.24;
  prices.forEach((p, i) => {
    const x = 0.4 + i * (PW + 0.08);
    box(s, x, 2.72, PW, 0.68);
    txt(s, p.tier, x, 2.76, PW, 0.26, { color: MUTED, fs: 8.5, align: 'center' });
    txt(s, p.amt,  x, 3.01, PW, 0.32, { color: ORG,   fs: 14,  bold: true, align: 'center' });
  });

  // Bottom cols
  box(s, 0.4,  3.56, 4.55, 1.08);
  txt(s, 'For Accountants', 0.6, 3.64, 4.1, 0.32, { color: ORG, fs: 12, bold: true });
  txt(s, 'Refer clients. Earn 30% forever. Start free. Your clients get ATO-compliant payroll. You get passive recurring income every month.',
      0.6, 3.98, 4.1, 0.6, { color: MUTED, fs: 9.5, va: 'top' });

  box(s, 5.05, 3.56, 4.55, 1.08);
  txt(s, 'For Investors', 5.25, 3.64, 4.1, 0.32, { color: ORG, fs: 12, bold: true });
  txt(s, 'Solo built in 6 months. ATO verified. Live product. 315 tests passing. Zero bugs. Seed round open. July 1 Payday Super is the best GTM event in payroll history.',
      5.25, 3.98, 4.1, 0.6, { color: MUTED, fs: 9.5, va: 'top' });

  // Final CTA
  box(s, 0.4, 4.8, 9.2, 0.68, { fill: CARD, brd: ORG, lw: 1.2 });
  txt(s, 'sabaccountai.com.au',          0.4, 4.82, 9.2, 0.38, { color: ORG,   fs: 18, bold: true,  align: 'center' });
  txt(s, 'sanjog@sabaccountai.com.au',   0.4, 5.18, 9.2, 0.26, { color: MUTED, fs: 9,               align: 'center' });

  slideNum(s, 8);
}

// ── Write file ────────────────────────────────────────
pptx.writeFile({ fileName: 'SAB-Account-AI-Pitch-Deck.pptx' })
  .then(() => console.log('✅  Saved: SAB-Account-AI-Pitch-Deck.pptx'))
  .catch(err => { console.error('❌', err); process.exit(1); });
