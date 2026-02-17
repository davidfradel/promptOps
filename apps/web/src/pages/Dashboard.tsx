import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useInsights } from '../hooks/useInsights';
import { useSpecs } from '../hooks/useSpecs';
import { useToast } from '../hooks/useToast';
import { ProjectOverview } from '../components/dashboard/ProjectOverview';
import { PainPointsChart } from '../components/dashboard/PainPointsChart';
import { SourceActivity } from '../components/dashboard/SourceActivity';
import { TrendingTopics } from '../components/dashboard/TrendingTopics';
import { ProjectForm } from '../components/projects/ProjectForm';
import { Loading } from '../components/ui/Loading';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function Dashboard() {
  const { projects, loading, createProject } = useProjects();
  const { insights } = useInsights();
  const { specs } = useSpecs();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);

  if (loading) return <Loading />;

  const handleCreate = async (data: { name: string; description?: string; keywords: string[]; niche?: string }) => {
    try {
      await createProject(data);
      addToast({ type: 'success', message: `Project "${data.name}" created!` });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create project' });
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Button onClick={() => setShowForm(true)}>New Project</Button>
      </div>

      <ProjectOverview projectCount={projects.length} insightCount={insights.length} specCount={specs.length} />

      {projects.length > 0 && (
        <Card title="Projects">
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
              >
                <div>
                  <span className="font-medium text-gray-900">{project.name}</span>
                  {project.niche && (
                    <span className="ml-2 text-sm text-gray-500">{project.niche}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  {project.keywords.slice(0, 3).map((kw) => (
                    <Badge key={kw} variant="info">{kw}</Badge>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PainPointsChart insights={insights} />
        <SourceActivity />
      </div>
      <TrendingTopics insights={insights} />

      <ProjectForm open={showForm} onClose={() => setShowForm(false)} onCreated={handleCreate} />
    </div>
  );
}
