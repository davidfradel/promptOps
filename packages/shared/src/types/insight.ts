export const InsightType = {
  PAIN_POINT: 'PAIN_POINT',
  FEATURE_REQUEST: 'FEATURE_REQUEST',
  COMPETITOR: 'COMPETITOR',
  TREND: 'TREND',
  SENTIMENT: 'SENTIMENT',
} as const;
export type InsightType = (typeof InsightType)[keyof typeof InsightType];

export interface Insight {
  id: string;
  projectId: string;
  type: InsightType;
  title: string;
  description: string;
  severity: number;
  confidence: number;
  tags: string[];
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsightSource {
  id: string;
  insightId: string;
  rawPostId: string;
  relevanceScore: number;
}

export interface DiscoverInsight extends Insight {
  category: string | null;
  isSaved: boolean;
  projectName: string;
}
