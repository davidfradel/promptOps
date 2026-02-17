import { useState } from 'react';
import { useSpecs } from '../hooks/useSpecs';
import { useProjects } from '../hooks/useProjects';
import { useSpecGeneration } from '../hooks/useAnalysis';
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
  const [selectedProject, setSelectedProject] = useState('');
  const [format, setFormat] = useState('MARKDOWN');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedProject) return;
    await generateSpec(selectedProject, format);
    setTimeout(() => refetch(), 2000);
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
          <Button onClick={handleGenerate} disabled={generating || !selectedProject}>
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </Card>

      {specs.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No specs generated yet.</p>
      ) : (
        <div className="space-y-4">
          {specs.map((spec) => (
            <Card key={spec.id}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{spec.title}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{spec.format}</Badge>
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedId(expandedId === spec.id ? null : spec.id)}
                  >
                    {expandedId === spec.id ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </div>
              {expandedId === spec.id ? (
                <div className="mt-4 space-y-3">
                  <SpecViewer spec={spec} />
                  <SpecExport content={spec.content} />
                </div>
              ) : (
                <p className="mt-2 line-clamp-3 text-sm text-gray-500">{spec.content}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
