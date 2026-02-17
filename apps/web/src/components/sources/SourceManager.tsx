import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useSources } from '../../hooks/useSources';

interface SourceManagerProps {
  projectId: string;
}

export function SourceManager({ projectId }: SourceManagerProps) {
  const { sources, loading, createSource, deleteSource, triggerScrape } = useSources(projectId);
  const [platform, setPlatform] = useState<'REDDIT' | 'HACKERNEWS'>('REDDIT');
  const [url, setUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [scrapingId, setScrapingId] = useState<string | null>(null);

  const placeholders: Record<string, string> = {
    REDDIT: 'https://www.reddit.com/r/SaaS',
    HACKERNEWS: 'topstories',
  };

  const handleCreate = async () => {
    if (!url.trim()) return;
    setCreating(true);
    try {
      await createSource({ projectId, platform, url: platform === 'HACKERNEWS' && !url.startsWith('http') ? url : url });
      setUrl('');
    } catch {
      // error handled by hook
    } finally {
      setCreating(false);
    }
  };

  const handleScrape = async (sourceId: string) => {
    setScrapingId(sourceId);
    try {
      await triggerScrape(sourceId);
    } catch {
      // error handled by hook
    } finally {
      setScrapingId(null);
    }
  };

  return (
    <Card title="Sources">
      <div className="space-y-4">
        {/* Add source form */}
        <div className="flex gap-2">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as 'REDDIT' | 'HACKERNEWS')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="REDDIT">Reddit</option>
            <option value="HACKERNEWS">HackerNews</option>
          </select>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholders[platform]}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Button onClick={handleCreate} disabled={creating || !url.trim()}>
            {creating ? 'Adding...' : 'Add Source'}
          </Button>
        </div>

        {/* Source list */}
        {loading ? (
          <p className="text-sm text-gray-500">Loading sources...</p>
        ) : sources.length === 0 ? (
          <p className="text-sm text-gray-500">No sources configured. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant={source.platform === 'REDDIT' ? 'warning' : 'info'}>
                    {source.platform}
                  </Badge>
                  <span className="text-sm text-gray-700">{source.url}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleScrape(source.id)}
                    disabled={scrapingId === source.id}
                  >
                    {scrapingId === source.id ? 'Scraping...' : 'Run Scrape'}
                  </Button>
                  <Button variant="danger" onClick={() => deleteSource(source.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
