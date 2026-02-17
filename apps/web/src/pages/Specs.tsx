import { useState, useCallback } from 'react';
import { useSpecs } from '../hooks/useSpecs';
import { useProjects } from '../hooks/useProjects';
import { useSpecGeneration } from '../hooks/useAnalysis';
import { useToast } from '../hooks/useToast';
import { useSpecPolling } from '../hooks/useJobStatus';
import { SpecViewer } from '../components/specs/SpecViewer';
import { SpecExport } from '../components/specs/SpecExport';
import { Loading } from '../components/ui/Loading';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function Specs() {
  const { specs, loading, refetch } = useSpecs();
  const { projects } = useProjects();
  const { generateSpec, loading: generating } = useSpecGeneration();
  const { addToast } = useToast();
  const [selectedProject, setSelectedProject] = useState('');
  const [format, setFormat] = useState('MARKDOWN');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingSpecId, setPendingSpecId] = useState<string | null>(null);

  const handleSpecComplete = useCallback(() => {
    addToast({ type: 'success', message: 'Spec generation complete!' });
    setPendingSpecId(null);
    refetch();
  }, [addToast, refetch]);

  const { polling: specPolling } = useSpecPolling(pendingSpecId, {
    onComplete: handleSpecComplete,
  });

  const handleGenerate = async () => {
    if (!selectedProject) return;
    try {
      const result = await generateSpec(selectedProject, format);
      const specId = (result as { id?: string } | null)?.id;
      if (specId) {
        setPendingSpecId(specId);
      }
      addToast({ type: 'info', message: 'Spec generation started...' });
      // Also do a delayed refetch as fallback
      setTimeout(() => refetch(), 5000);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to generate spec' });
    }
  };

  if (loading) return <Loading message="Loading specs..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Specs</h1>

      <Card title="Generate New Spec">
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="MARKDOWN">Markdown</option>
            <option value="CLAUDE_CODE">Claude Code</option>
            <option value="LINEAR">Linear</option>
          </select>
          <Button onClick={handleGenerate} disabled={generating || specPolling || !selectedProject}>
            {generating ? 'Queueing...' : specPolling ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </Card>

      {specs.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No specs generated yet.</p>
      ) : (
        <div className="space-y-4">
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
                        onClick={() => setExpandedId(expandedId === spec.id ? null : spec.id)}
                      >
                        {expandedId === spec.id ? 'Collapse' : 'Expand'}
                      </Button>
                    )}
                  </div>
                </div>
                {!isGenerating && expandedId === spec.id ? (
                  <div className="mt-4 space-y-3">
                    <SpecViewer spec={spec} />
                    <SpecExport content={spec.content} title={spec.title} />
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
