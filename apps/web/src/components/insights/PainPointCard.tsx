import type { Insight } from '@promptops/shared';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface PainPointCardProps {
  insight: Insight;
}

export function PainPointCard({ insight }: PainPointCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{insight.title}</h4>
          <p className="mt-1 text-sm text-gray-500">{insight.description}</p>
        </div>
        <Badge variant={insight.severity >= 7 ? 'danger' : insight.severity >= 4 ? 'warning' : 'default'}>
          Severity: {insight.severity}
        </Badge>
      </div>
      <div className="mt-3 flex gap-2">
        {insight.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </Card>
  );
}
