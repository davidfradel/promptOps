import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useSources } from '../../hooks/useSources';

interface SourceWithExtras {
  id: string;
  platform: string;
  url: string;
  scrapeJobs?: Array<{ status: string; postsFound?: number }>;
  _count?: { rawPosts: number };
}

export function SourceActivity() {
  const { sources, loading } = useSources();

  if (loading) {
    return (
      <Card title="Recent Activity">
        <p className="text-sm text-gray-500">Loading...</p>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card title="Recent Activity">
        <p className="text-sm text-gray-500">No sources configured yet.</p>
      </Card>
    );
  }

  return (
    <Card title="Recent Activity">
      <div className="space-y-3">
        {(sources as unknown as SourceWithExtras[]).map((source) => {
          const latestJob = source.scrapeJobs?.[0] ?? null;
          const postCount = source._count?.rawPosts ?? 0;

          return (
            <div key={source.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={source.platform === 'REDDIT' ? 'warning' : 'info'}>
                  {source.platform}
                </Badge>
                <span className="text-sm text-gray-700">{source.url}</span>
              </div>
              <div className="flex items-center gap-2">
                {latestJob && (
                  <Badge
                    variant={
                      latestJob.status === 'COMPLETED' ? 'success' :
                      latestJob.status === 'FAILED' ? 'danger' :
                      latestJob.status === 'RUNNING' ? 'info' : 'default'
                    }
                  >
                    {latestJob.status}
                  </Badge>
                )}
                <span className="text-xs text-gray-500">{postCount} posts</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
