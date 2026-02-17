import { Button } from '../ui/Button';

interface SpecExportProps {
  content: string;
  title?: string;
}

export function SpecExport({ content, title = 'spec' }: SpecExportProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
  };

  const handleExportMarkdown = () => {
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

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={handleCopy}>
        Copy to Clipboard
      </Button>
      <Button variant="ghost" onClick={handleExportMarkdown}>
        Export Markdown
      </Button>
    </div>
  );
}
