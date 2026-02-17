import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider } from './hooks/useAuth';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingGuard } from './components/auth/OnboardingGuard';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Discover } from './pages/Discover';
import { SavedInsights } from './pages/SavedInsights';
import { Onboarding } from './pages/Onboarding';
import { Insights } from './pages/Insights';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ToastContainer />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <DashboardLayout />
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Discover />} />
                <Route path="/saved" element={<SavedInsights />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
