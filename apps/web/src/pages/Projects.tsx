import { useProjects } from '../hooks/useProjects';
import { Link } from 'react-router-dom';
import { Loading } from '../components/ui/Loading';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function Projects() {
  const { projects, loading } = useProjects();

  if (loading) return <Loading message="Loading projects..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
      </div>

      {projects.length === 0 ? (
        <Card>
          <p className="py-4 text-center text-sm text-gray-500">
            No projects yet. Create one to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="block">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    {project.description && (
                      <p className="mt-1 text-sm text-gray-500">{project.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {project.keywords.slice(0, 3).map((kw) => (
                      <Badge key={kw} variant="info">{kw}</Badge>
                    ))}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
