import type { Insight } from '@promptops/shared';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface TrendingTopicsProps {
  insights?: Insight[];
}

export function TrendingTopics({ insights = [] }: TrendingTopicsProps) {
  // Extract all tags and sort by frequency
  const tagCounts: Record<string, number> = {};
  for (const insight of insights) {
    for (const tag of insight.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  if (sortedTags.length === 0) {
    return (
      <Card title="Trending Topics">
        <p className="text-sm text-gray-500">No topics yet. Run analysis to discover trends.</p>
      </Card>
    );
  }

  return (
    <Card title="Trending Topics">
      <div className="flex flex-wrap gap-2">
        {sortedTags.map(([tag, count]) => (
          <Badge key={tag} variant="info">
            {tag} ({count})
          </Badge>
        ))}
      </div>
    </Card>
  );
}
