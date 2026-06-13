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
  | 'STRATEGY'
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
    'error', 'bug', 'build failed', 'build error', 'build broke',
    'stripe webhook', 'supabase', 'sentry',
    'deploy failed', 'deployment failed', 'deploy error',
    'code', 'payg', 'test endpoint', 'test failing', 'run test',
    'rls', 'ssl', 'security breach', 'security issue',
  ],
  SAB_MARKETING: [
    'tiktok', 'blog', 'post', 'content', 'what to write', 'topic',
    'hook', 'linkedin', 'facebook', 'accountant', 'email', 'signup',
    'instagram', 'twitter',
    'find prospects', 'find leads', 'find customers', 'prospect', 'outreach',
    'local business', 'cold email',
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
  STRATEGY: [
    'what should i do', 'what do i focus on', 'prioritise', 'prioritize',
    'dropped', 'fell', 'declining', 'struggling', 'not growing',
    'growth strategy', 'business strategy', 'next move', 'what now',
    'plan', 'roadmap', 'direction', 'advice', 'recommend',
    'this week focus', 'where should i focus', 'big picture',
    'mrr dropped', 'churn is high', 'signups down', 'revenue down',
    'what should basnet', 'what should spark', 'what should atlas',
    'full picture', 'everything', 'overview', 'all agents',
    'build trust', 'build relationship', 'build community', 'build audience',
    'survive', 'future of', 'in 5 years', 'long term', 'competitive advantage',
    'how can i grow', 'how do i grow', 'how to grow',
    'differentiate', 'stand out', 'unique', 'positioning',
  ],
  GENERAL: [],
}

// STRATEGY checked first — multi-signal questions beat single-agent routing
const PRIORITY_ORDER: QuestionClass[] = [
  'MAC', 'STRATEGY', 'QUALITY', 'RETENTION', 'MARKET', 'SAB_PRODUCT', 'SAB_MARKETING', 'PERSONAL',
]

export function classifyQuestion(question: string): QuestionClass {
  const q = question.toLowerCase()
  for (const cls of PRIORITY_ORDER) {
    if (AGENT_KEYWORDS[cls].some(k => q.includes(k))) return cls
  }
  return 'GENERAL'
}
