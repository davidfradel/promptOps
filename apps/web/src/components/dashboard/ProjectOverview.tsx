import { Card } from '../ui/Card';

interface ProjectOverviewProps {
  projectCount: number;
  insightCount: number;
  specCount: number;
}

export function ProjectOverview({ projectCount, insightCount, specCount }: ProjectOverviewProps) {
  const stats = [
    { label: 'Projects', value: projectCount },
    { label: 'Insights', value: insightCount },
    { label: 'Specs', value: specCount },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <p className="text-sm text-gray-500">{stat.label}</p>
          <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
        </Card>
      ))}
    </div>
  );
}
