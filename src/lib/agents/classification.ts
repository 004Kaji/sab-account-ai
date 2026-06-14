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
  | 'AGENT_STATUS'
  | 'BROWSER'
  | 'EXEC'
  | 'APP'
  | 'BUILD'
  | 'GENERAL'

export const AGENT_KEYWORDS: Record<QuestionClass, string[]> = {
  QUALITY: [
    'working', 'broken', 'passing', 'test endpoint', 'auth protection',
    'security check', 'invoice generation', '401', '500', 'endpoint', 'api', 'route',
  ],
  RETENTION: [
    'churn', 'at risk', 'inactive', 'retention', 'not using',
    'upgrade signals', 'conversion rate', 'lost user', 'how many users',
    'how many signups', 'current mrr', 'monthly revenue', 'paid users',
    'who is at risk', 'users at risk', 'who might cancel',
  ],
  MARKET: [
    'competitor', 'xero', 'myob', 'market intel', 'market news', 'market research',
    'ato update', 'ato news', 'ato deadline', 'law change', 'regulation change',
    'payday super', 'what are competitors', 'competitor pricing',
    'what does xero charge', 'what does myob charge', 'industry news',
    'accounting software market', 'market trend',
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
    'should i pivot', 'pivot', 'arr', 'annual recurring', 'million dollar',
    'achieve my goal', 'achieve that', 'achieve this', 'hit my goal',
    'how can i achieve', 'how do i achieve', 'how do i hit',
    'raise price', 'raise prices', 'increase price', 'charge more',
    'compete with', 'beat xero', 'beat myob', 'against xero',
    'new idea', 'different idea', 'start something', 'something new',
    'how can i compete', 'how do i compete', 'is it worth',
    'faster', 'get there faster', 'grow faster', 'scale faster',
  ],
  BROWSER: [
    'open facebook', 'check facebook', 'open instagram', 'check instagram',
    'open linkedin', 'check linkedin', 'open twitter', 'check twitter',
    'open tiktok', 'check tiktok', 'open stripe', 'check stripe',
    'open gmail', 'check gmail', 'open email', 'check email',
    'open youtube', 'open reddit', 'browse to', 'go to website',
    'open browser', 'check the website', 'open the website',
    'search google', 'google for', 'look up online', 'find online',
    'what is on', 'what\'s on', "what's happening on",
  ],
  EXEC: [
    'run command', 'run script', 'run this', 'execute', 'terminal', 'shell',
    'git status', 'git pull', 'git push', 'git commit', 'git log',
    'npm install', 'npm run', 'npx', 'node ', 'python3 ',
    'list files', 'show files', 'ls ', 'find files',
    'what processes', 'kill process', 'restart server',
    'run git', 'run npm', 'check git',
  ],
  APP: [
    'open vs code', 'open vscode', 'open xcode', 'open terminal', 'open finder',
    'open safari', 'open chrome', 'open slack', 'open zoom', 'open spotify',
    'open notes', 'open calendar', 'open messages', 'open mail',
    'close vs code', 'close chrome', 'close slack', 'close app', 'quit app',
    'what apps are open', 'what is running', 'running apps', 'open app',
  ],
  BUILD: [
    'build me', 'build a', 'create a website', 'make a website', 'create a landing page',
    'make a landing page', 'create a game', 'make a game', 'build a game',
    'create an app', 'make an app', 'build an app', 'write a script',
    'create a new agent', 'make a new agent', 'build an agent', 'add an agent',
    'delete agent', 'remove agent', 'create agent', 'new agent called',
    'deploy code', 'ship this', 'push to github', 'deploy to vercel',
    'write code for', 'generate code', 'scaffold', 'create new',
    'list what you built', 'show what you built', 'what have you built',
    'list apps', 'list agents', 'show agents', 'show apps', 'what apps',
    'what did you build', 'check all apps', 'show built', 'what did you make',
    'delete the app', 'delete the game', 'delete the page', 'remove the app',
  ],
  AGENT_STATUS: [
    'did you send', 'have you sent', 'did spark send', 'did spark run',
    'did you run', 'have you run', 'did basnet', 'did the agent',
    'did atlas run', 'did lift run', 'did flux run', 'did scout run',
    'did you email', 'how many emails', 'emails sent', 'emails you sent',
    'what did you do', 'what have you done', 'what did spark',
    'when did you last', 'last time you', 'did you check',
    'tell me about', 'explain the', 'what is basnet', 'what are your agents',
    'sub agents', 'sub-agents', 'your system', 'basnet system', 'basnet ai',
    'how does basnet', 'what do you do', 'introduce yourself',
  ],
  GENERAL: [],
}

// AGENT_STATUS and STRATEGY checked first — beats all other routing
const PRIORITY_ORDER: QuestionClass[] = [
  'BUILD', 'EXEC', 'APP', 'BROWSER', 'MAC', 'AGENT_STATUS', 'STRATEGY', 'QUALITY', 'RETENTION', 'MARKET', 'SAB_PRODUCT', 'SAB_MARKETING', 'PERSONAL',
]

export function classifyQuestion(question: string): QuestionClass {
  const q = question.toLowerCase()
  for (const cls of PRIORITY_ORDER) {
    if (AGENT_KEYWORDS[cls].some(k => q.includes(k))) return cls
  }
  return 'GENERAL'
}
