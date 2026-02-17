import type { Insight } from '@promptops/shared';
import { Card } from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PainPointsChartProps {
  insights?: Insight[];
}

export function PainPointsChart({ insights = [] }: PainPointsChartProps) {
  // Filter PAIN_POINT insights and aggregate by tags
  const painPoints = insights.filter((i) => i.type === 'PAIN_POINT');

  const tagCounts: Record<string, number> = {};
  for (const insight of painPoints) {
    for (const tag of insight.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const data = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <Card title="Pain Points Distribution">
        <p className="py-8 text-center text-sm text-gray-500">
          No pain point data yet. Run analysis on a project to see results.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Pain Points Distribution">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
