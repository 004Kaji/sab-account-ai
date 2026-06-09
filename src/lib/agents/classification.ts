// Shared classification for all agent entry points (basnet, voice, sab)
// Single source of truth — update here, all routes benefit

export type QuestionClass =
  | 'QUALITY'
  | 'RETENTION'
  | 'MARKET'
  | 'SAB_PRODUCT'
  | 'SAB_MARKETING'
  | 'PERSONAL'
  | 'MAC'
  | 'GENERAL'

export const AGENT_KEYWORDS: Record<QuestionClass, string[]> = {
  QUALITY: [
    'working', 'broken', 'passing', 'test endpoint', 'auth protection',
    'security check', 'invoice generation', '401', '500', 'endpoint', 'api', 'route',
  ],
  RETENTION: [
    'churn', 'at risk', 'inactive', 'retention', 'not using',
    'upgrade', 'conversion', 'lost user', 'user', 'signup', 'mrr', 'revenue', 'paid users',
  ],
  MARKET: [
    'competitor', 'xero', 'myob', 'market', 'news', 'ato update',
    'law change', 'payday super', 'pricing', 'what are competitors',
  ],
  SAB_PRODUCT: [
    'error', 'bug', 'build', 'stripe webhook', 'supabase', 'sentry',
    'deploy', 'code', 'payg', 'test', 'rls', 'ssl', 'security',
  ],
  SAB_MARKETING: [
    'tiktok', 'blog', 'post', 'content', 'what to write', 'topic',
    'hook', 'linkedin', 'facebook', 'accountant', 'email', 'signup',
    'instagram', 'twitter',
  ],
  MAC: [
    'memory', 'ram', 'disk', 'storage', 'space', 'cpu', 'battery',
    'process', 'running app', 'my mac', 'mac memory', 'computer',
    'slow', 'performance', 'uptime', 'hard drive', 'ssd',
    'open this', 'open that', 'screenshot', 'my files', 'my folder',
  ],
  PERSONAL: [
    'visa', 'pr', 'university', 'goals', 'dream', 'north star',
    'tired', 'overwhelmed', 'should i', 'what do i do', 'how am i',
    'sub-agent', 'who are you', 'what can you do', 'your agents', 'your name',
    'job', 'jobs', 'work', 'employment', 'career', 'apply', 'resume',
    'darwin', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide',
    'find me', 'search for', 'look up', 'web search',
    'study', 'assignment', 'course', 'semester', 'fee',
    'money', 'finance', 'budget', 'income', 'expense',
    'part time', 'full time', 'casual', 'internship', 'salary', 'wage',
    'weather', 'how much', 'price', 'cost', 'where', 'what is',
    'hire', 'hiring', 'find', 'how to',
  ],
  GENERAL: [],
}

// MAC is checked before PERSONAL so "check my memory" doesn't go to web search
const PRIORITY_ORDER: QuestionClass[] = [
  'MAC', 'QUALITY', 'RETENTION', 'MARKET', 'SAB_PRODUCT', 'SAB_MARKETING', 'PERSONAL',
]

export function classifyQuestion(question: string): QuestionClass {
  const q = question.toLowerCase()
  for (const cls of PRIORITY_ORDER) {
    if (AGENT_KEYWORDS[cls].some(k => q.includes(k))) return cls
  }
  return 'GENERAL'
}
