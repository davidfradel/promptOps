import type { Spec } from '@promptops/shared';
import { Card } from '../ui/Card';

interface SpecViewerProps {
  spec: Spec;
}

export function SpecViewer({ spec }: SpecViewerProps) {
  return (
    <Card title={spec.title}>
      <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">{spec.content}</pre>
    </Card>
  );
}
