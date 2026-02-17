import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useInsights } from '../hooks/useInsights';
import { useSources } from '../hooks/useSources';
import { useAnalysis, useSpecGeneration } from '../hooks/useAnalysis';
import { InsightsList } from '../components/insights/InsightsList';
import { CompetitorMatrix } from '../components/insights/CompetitorMatrix';
import { SourceManager } from '../components/sources/SourceManager';
import { Loading } from '../components/ui/Loading';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { project, loading: projectLoading } = useProject(id!);
  const { insights, loading: insightsLoading, refetch: refetchInsights } = useInsights(id);
  const { sources } = useSources(id);
  const { triggerAnalysis, loading: analyzing } = useAnalysis();
  const { generateSpec, loading: generating } = useSpecGeneration();
  const [specFormat, setSpecFormat] = useState('MARKDOWN');

  if (projectLoading) return <Loading />;

  if (!project) {
    return <p className="py-8 text-center text-gray-500">Project not found.</p>;
  }

  const handleAnalyze = async () => {
    await triggerAnalysis(id!);
    setTimeout(() => refetchInsights(), 2000);
  };

  const handleGenerateSpec = async () => {
    await generateSpec(id!, specFormat);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        {project.description && <p className="mt-1 text-gray-500">{project.description}</p>}
      </div>

      <Card title="Keywords">
        <div className="flex flex-wrap gap-2">
          {project.keywords.map((kw) => (
            <Badge key={kw} variant="info">{kw}</Badge>
          ))}
        </div>
      </Card>

      <SourceManager projectId={id!} />

      <Card title="Actions">
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleAnalyze} disabled={analyzing || sources.length === 0}>
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
          <div className="flex gap-2">
            <select
              value={specFormat}
              onChange={(e) => setSpecFormat(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="MARKDOWN">Markdown</option>
              <option value="CLAUDE_CODE">Claude Code</option>
              <option value="LINEAR">Linear</option>
            </select>
            <Button onClick={handleGenerateSpec} disabled={generating || insights.length === 0}>
              {generating ? 'Generating...' : 'Generate Spec'}
            </Button>
          </div>
        </div>
      </Card>

      <CompetitorMatrix insights={insights} />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Insights</h2>
        <InsightsList insights={insights} loading={insightsLoading} />
      </div>
    </div>
  );
}
