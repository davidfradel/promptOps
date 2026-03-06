import { useState, useCallback } from 'react';
import { useSaved } from '../hooks/useSaved';
import { useSpecs } from '../hooks/useSpecs';
import { useSpecGeneration } from '../hooks/useAnalysis';
import { useSpecPolling } from '../hooks/useJobStatus';
import { useToast } from '../hooks/useToast';
import { DiscoverInsightCard } from '../components/discover/DiscoverInsightCard';
import { Loading } from '../components/ui/Loading';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api.js';

export function SavedInsights() {
  const { savedInsights, loading, unsaveInsight } = useSaved();
  const { specs, loading: specsLoading, refetch: refetchSpecs } = useSpecs();
  const { generateSpec, loading: generating } = useSpecGeneration();
  const { addToast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState('MARKDOWN');
  const [pendingSpecId, setPendingSpecId] = useState<string | null>(null);
  const [expandedSpecId, setExpandedSpecId] = useState<string | null>(null);

  const handleSpecComplete = useCallback(() => {
    addToast({ type: 'success', message: 'Spec generation complete!' });
    setPendingSpecId(null);
    refetchSpecs();
  }, [addToast, refetchSpecs]);

  const { polling: specPolling } = useSpecPolling(pendingSpecId, {
    onComplete: handleSpecComplete,
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUnsave = async (id: string) => {
    try {
      await unsaveInsight(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      addToast({ type: 'info', message: 'Insight removed from saved' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove insight' });
    }
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await generateSpec(Array.from(selectedIds), format);
      const specId = (result as { id?: string } | null)?.id;
      if (specId) setPendingSpecId(specId);
      addToast({ type: 'info', message: 'Spec generation started...' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to generate spec',
      });
    }
  };

  const handleDeleteSpec = async (specId: string) => {
    try {
      const res = await api.delete<unknown>(`/specs/${specId}`);
      if (res.error) throw new Error(res.error.message);
      addToast({ type: 'info', message: 'Spec deleted' });
      refetchSpecs();
    } catch {
      addToast({ type: 'error', message: 'Failed to delete spec' });
    }
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    addToast({ type: 'success', message: 'Copied to clipboard' });
  };

  const handleExportMarkdown = (content: string, title: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9-_]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loading message="Loading saved insights..." />;

  return (
    <div className="space-y-8">
      {/* 1. Saved insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Insights</h1>
            {selectedIds.size > 0 && (
              <p className="mt-1 text-sm text-blue-600">{selectedIds.size} selected</p>
            )}
          </div>
          {savedInsights.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                if (selectedIds.size === savedInsights.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(savedInsights.map((i) => i.id)));
                }
              }}
            >
              {selectedIds.size === savedInsights.length ? 'Deselect all' : 'Select all'}
            </Button>
          )}
        </div>

        {savedInsights.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No saved insights yet.</p>
            <p className="mt-1 text-sm text-gray-400">
              Save interesting insights from the Discover page to build your spec.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedInsights.map((insight) => (
              <div key={insight.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(insight.id)}
                  onChange={() => toggleSelect(insight.id)}
                  className="mt-4 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-blue-600"
                />
                <div className="min-w-0 flex-1">
                  <DiscoverInsightCard
                    insight={insight}
                    onSave={() => {}}
                    onUnsave={handleUnsave}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Generate spec form */}
      {savedInsights.length > 0 && (
        <Card title="Generate Spec from Selected Insights">
          <div className="space-y-3">
            {selectedIds.size === 0 && (
              <p className="text-sm text-gray-400">
                Select at least one insight above to generate a spec.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="MARKDOWN">Markdown</option>
                <option value="CLAUDE_CODE">Claude Code</option>
                <option value="LINEAR">Linear</option>
              </select>
              <Button
                onClick={handleGenerate}
                disabled={generating || specPolling || selectedIds.size === 0}
              >
                {generating
                  ? 'Queueing...'
                  : specPolling
                    ? 'Generating...'
                    : `Generate Spec (${selectedIds.size} insight${selectedIds.size !== 1 ? 's' : ''})`}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Generated specs */}
      {!specsLoading && specs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Generated Specs</h2>
          {specs.map((spec) => {
            const isGenerating = spec.content === 'Generating...';
            return (
              <Card key={spec.id}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{spec.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{spec.format}</Badge>
                    {isGenerating ? (
                      <Badge variant="warning">Generating...</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setExpandedSpecId(expandedSpecId === spec.id ? null : spec.id)
                        }
                      >
                        {expandedSpecId === spec.id ? 'Collapse' : 'Expand'}
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => handleDeleteSpec(spec.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                {!isGenerating && expandedSpecId === spec.id ? (
                  <div className="mt-4 space-y-3">
                    <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                      {spec.content}
                    </pre>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => handleCopy(spec.content)}>
                        Copy to Clipboard
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleExportMarkdown(spec.content, spec.title)}
                      >
                        Export Markdown
                      </Button>
                    </div>
                  </div>
                ) : !isGenerating ? (
                  <p className="mt-2 line-clamp-3 text-sm text-gray-500">{spec.content}</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
