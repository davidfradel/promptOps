import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loading } from '../ui/Loading';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (user && !user.onboardedAt) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
