import { Button } from '../ui/Button';

interface SpecExportProps {
  content: string;
}

export function SpecExport({ content }: SpecExportProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={handleCopy}>
        Copy to Clipboard
      </Button>
      <Button variant="ghost">Export Markdown</Button>
    </div>
  );
}
