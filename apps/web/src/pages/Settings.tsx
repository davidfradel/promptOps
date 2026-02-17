import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Loading } from '../components/ui/Loading';
import { useInterests } from '../hooks/useInterests';
import { useToast } from '../hooks/useToast';
import { CATEGORIES } from '@promptops/shared';

export function Settings() {
  const { interests, loading, updating, updateInterests } = useInterests();
  const { addToast } = useToast();
  const [pendingAdd, setPendingAdd] = useState<string[]>([]);
  const [pendingRemove, setPendingRemove] = useState<string[]>([]);

  const activeCategories = interests.map((i) => i.category);

  const handleSave = async () => {
    try {
      await updateInterests(pendingAdd, pendingRemove);
      setPendingAdd([]);
      setPendingRemove([]);
      addToast({ type: 'success', message: 'Interests updated!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to update interests' });
    }
  };

  const toggleCategory = (value: string) => {
    const isActive = activeCategories.includes(value) && !pendingRemove.includes(value)
      || pendingAdd.includes(value);

    if (isActive) {
      if (pendingAdd.includes(value)) {
        setPendingAdd((prev) => prev.filter((v) => v !== value));
      } else {
        setPendingRemove((prev) => [...prev, value]);
      }
    } else {
      if (pendingRemove.includes(value)) {
        setPendingRemove((prev) => prev.filter((v) => v !== value));
      } else {
        setPendingAdd((prev) => [...prev, value]);
      }
    }
  };

  const hasChanges = pendingAdd.length > 0 || pendingRemove.length > 0;

  if (loading) return <Loading message="Loading settings..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Card title="Your Interests">
        <p className="mb-4 text-sm text-gray-500">
          Manage your interest categories. Adding a category creates new sources for discovery.
          Removing one deletes its auto-generated project and data.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const isActive = (activeCategories.includes(cat.value) && !pendingRemove.includes(cat.value))
              || pendingAdd.includes(cat.value);

            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  isActive
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                  {activeCategories.includes(cat.value) && !pendingRemove.includes(cat.value) && !pendingAdd.includes(cat.value) && (
                    <Badge variant="success">Active</Badge>
                  )}
                  {pendingAdd.includes(cat.value) && (
                    <Badge variant="info">Adding</Badge>
                  )}
                  {pendingRemove.includes(cat.value) && (
                    <Badge variant="danger">Removing</Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {hasChanges && (
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSave} disabled={updating}>
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setPendingAdd([]); setPendingRemove([]); }}
            >
              Cancel
            </Button>
          </div>
        )}
      </Card>

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
    </div>
  );
}
