type Platform = 'REDDIT' | 'HACKERNEWS';

interface CategorySource {
  platform: Platform;
  url: string;
}

export const CATEGORY_SOURCES: Record<string, CategorySource[]> = {
  SAAS: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/SaaS' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/startups' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/indiehackers' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=SaaS' },
  ],
  DEVTOOLS: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/devops' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/programming' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/webdev' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=developer+tools' },
  ],
  AI_ML: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/MachineLearning' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/artificial' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=AI+ML' },
  ],
  FINTECH: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/fintech' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/algotrading' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=fintech' },
  ],
  ECOMMERCE: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/ecommerce' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/shopify' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=ecommerce' },
  ],
  MOBILE: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/iOSProgramming' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/androiddev' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=mobile+app' },
  ],
  GAMING: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/gamedev' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/indiegaming' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=game+development' },
  ],
  HEALTH: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/healthIT' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/digitalhealth' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=health+tech' },
  ],
  EDUCATION: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/edtech' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/learnprogramming' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=edtech' },
  ],
  SOCIAL: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/socialmedia' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/marketing' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=social+media' },
  ],
  SECURITY: [
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/netsec' },
    { platform: 'REDDIT', url: 'https://www.reddit.com/r/cybersecurity' },
    { platform: 'HACKERNEWS', url: 'hackernews://search?q=cybersecurity' },
  ],
};
