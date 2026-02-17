import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: (data: { name: string; description?: string; keywords: string[]; niche?: string }) => Promise<void>;
}

export function ProjectForm({ open, onClose, onCreated }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [niche, setNiche] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const keywords = keywordsInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      await onCreated({
        name: name.trim(),
        description: description.trim() || undefined,
        keywords,
        niche: niche.trim() || undefined,
      });
      setName('');
      setDescription('');
      setKeywordsInput('');
      setNiche('');
      onClose();
    } catch {
      // error handled by caller
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <Card title="Create Project">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My SaaS Research"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Research project for..."
                rows={2}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Keywords</label>
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="saas, devtools, ai (comma-separated)"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Niche</label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="developer-tools"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !name.trim()}>
                {submitting ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
