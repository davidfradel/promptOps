import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card>
        <div className="text-center">
          <p className="text-6xl font-bold text-gray-300">404</p>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Page not found</h2>
          <p className="mt-2 text-sm text-gray-500">The page you're looking for doesn't exist.</p>
          <div className="mt-6">
            <Link to="/">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
