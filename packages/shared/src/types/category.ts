export const Category = {
  SAAS: 'SAAS',
  DEVTOOLS: 'DEVTOOLS',
  AI_ML: 'AI_ML',
  FINTECH: 'FINTECH',
  ECOMMERCE: 'ECOMMERCE',
  MOBILE: 'MOBILE',
  GAMING: 'GAMING',
  HEALTH: 'HEALTH',
  EDUCATION: 'EDUCATION',
  SOCIAL: 'SOCIAL',
  SECURITY: 'SECURITY',
} as const;
export type Category = (typeof Category)[keyof typeof Category];

export interface CategoryInfo {
  value: Category;
  label: string;
  description: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { value: 'SAAS', label: 'SaaS', description: 'Software as a Service products and platforms' },
  { value: 'DEVTOOLS', label: 'Developer Tools', description: 'Tools and frameworks for developers' },
  { value: 'AI_ML', label: 'AI & Machine Learning', description: 'Artificial intelligence and ML applications' },
  { value: 'FINTECH', label: 'Fintech', description: 'Financial technology and banking innovation' },
  { value: 'ECOMMERCE', label: 'E-Commerce', description: 'Online retail and marketplace platforms' },
  { value: 'MOBILE', label: 'Mobile Apps', description: 'iOS and Android app development' },
  { value: 'GAMING', label: 'Gaming', description: 'Game development and gaming platforms' },
  { value: 'HEALTH', label: 'Health Tech', description: 'Digital health and medical technology' },
  { value: 'EDUCATION', label: 'EdTech', description: 'Education technology and online learning' },
  { value: 'SOCIAL', label: 'Social Media', description: 'Social networks and community platforms' },
  { value: 'SECURITY', label: 'Cybersecurity', description: 'Security tools and threat protection' },
];
