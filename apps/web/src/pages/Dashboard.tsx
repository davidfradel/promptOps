import { useProjects } from '../hooks/useProjects';
import { useInsights } from '../hooks/useInsights';
import { useSpecs } from '../hooks/useSpecs';
import { ProjectOverview } from '../components/dashboard/ProjectOverview';
import { PainPointsChart } from '../components/dashboard/PainPointsChart';
import { SourceActivity } from '../components/dashboard/SourceActivity';
import { TrendingTopics } from '../components/dashboard/TrendingTopics';
import { Loading } from '../components/ui/Loading';

export function Dashboard() {
  const { projects, loading } = useProjects();
  const { insights } = useInsights();
  const { specs } = useSpecs();

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <ProjectOverview projectCount={projects.length} insightCount={insights.length} specCount={specs.length} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PainPointsChart insights={insights} />
        <SourceActivity />
      </div>
      <TrendingTopics insights={insights} />
    </div>
  );
}
