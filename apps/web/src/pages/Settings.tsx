import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useSources } from '../hooks/useSources';

export function Settings() {
  const { sources, loading } = useSources();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Card title="API Keys">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Anthropic API Key</label>
            <input
              type="password"
              placeholder="sk-ant-..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">Configured via environment variables</p>
          </div>
        </div>
      </Card>

      <Card title="Configured Sources">
        {loading ? (
          <p className="text-sm text-gray-500">Loading sources...</p>
        ) : sources.length === 0 ? (
          <p className="text-sm text-gray-500">No sources configured. Add sources from a project page.</p>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
                <Badge variant={source.platform === 'REDDIT' ? 'warning' : 'info'}>
                  {source.platform}
                </Badge>
                <span className="text-sm text-gray-700">{source.url}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
