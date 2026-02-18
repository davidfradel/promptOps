import type { Insight } from '@promptops/shared';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface CompetitorMatrixProps {
  insights?: Insight[];
}

export function CompetitorMatrix({ insights = [] }: CompetitorMatrixProps) {
  const competitors = insights.filter((i) => i.type === 'COMPETITOR');

  if (competitors.length === 0) {
    return (
      <Card title="Competitor Matrix">
        <p className="text-sm text-gray-500">
          No competitor data yet. Run analysis to discover competitors.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Competitor Matrix">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 font-medium text-gray-700">Competitor</th>
              <th className="pb-2 font-medium text-gray-700">Threat Level</th>
              <th className="pb-2 font-medium text-gray-700">Confidence</th>
              <th className="pb-2 font-medium text-gray-700">Tags</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((comp) => {
              const meta = comp.metadata as { threatLevel?: string } | null;
              const threatLevel = meta?.threatLevel ?? 'MEDIUM';
              return (
                <tr key={comp.id} className="border-b border-gray-100">
                  <td className="py-2 font-medium text-gray-900">{comp.title}</td>
                  <td className="py-2">
                    <Badge
                      variant={
                        threatLevel === 'HIGH'
                          ? 'danger'
                          : threatLevel === 'LOW'
                            ? 'success'
                            : 'warning'
                      }
                    >
                      {threatLevel}
                    </Badge>
                  </td>
                  <td className="py-2 text-gray-600">{Math.round(comp.confidence * 100)}%</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {comp.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="default">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
