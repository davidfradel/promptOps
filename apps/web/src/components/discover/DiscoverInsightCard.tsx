import type { DiscoverInsight } from '@promptops/shared';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const severityLabels = ['Low', 'Medium', 'High', 'Critical', 'Urgent'];
const severityVariants = ['default', 'info', 'warning', 'danger', 'danger'] as const;

const typeVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PAIN_POINT: 'danger',
  FEATURE_REQUEST: 'info',
  COMPETITOR: 'warning',
  TREND: 'success',
  SENTIMENT: 'default',
};

interface DiscoverInsightCardProps {
  insight: DiscoverInsight;
  onSave: (id: string) => void;
  onUnsave: (id: string) => void;
}

export function DiscoverInsightCard({ insight, onSave, onUnsave }: DiscoverInsightCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {insight.category && <Badge variant="info">{insight.category.replace('_', '/')}</Badge>}
            <Badge variant={typeVariants[insight.type] ?? 'default'}>
              {insight.type.replace('_', ' ')}
            </Badge>
            <Badge variant={severityVariants[insight.severity] ?? 'default'}>
              {severityLabels[insight.severity] ?? 'Unknown'}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{insight.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{insight.description}</p>
          <p className="mt-1 text-xs text-gray-400">from {insight.projectName}</p>
        </div>
        <Button
          variant={insight.isSaved ? 'secondary' : 'ghost'}
          onClick={() => (insight.isSaved ? onUnsave(insight.id) : onSave(insight.id))}
          className="shrink-0"
        >
          {insight.isSaved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}
