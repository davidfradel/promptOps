import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Loading } from '../components/ui/Loading';

export function Onboarding() {
  const { categories, loading, submitting, error, submitOnboarding } = useOnboarding();
  const { setUser, user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleSubmit = async () => {
    try {
      await submitOnboarding(Array.from(selected));
      if (user) {
        setUser({ ...user, onboardedAt: new Date() });
      }
      navigate('/');
    } catch {
      // error is handled by hook
    }
  };

  if (loading) return <Loading message="Loading categories..." />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">What are you interested in?</h1>
          <p className="mt-2 text-gray-500">
            Choose at least one category. We'll automatically find insights from relevant
            communities.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => toggle(cat.value)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                selected.has(cat.value)
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-semibold text-gray-900">{cat.label}</div>
              <div className="mt-1 text-xs text-gray-500">{cat.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button
            onClick={handleSubmit}
            disabled={selected.size === 0 || submitting}
            className="px-8 py-3 text-base"
          >
            {submitting ? 'Setting up...' : `Get Started (${selected.size} selected)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
