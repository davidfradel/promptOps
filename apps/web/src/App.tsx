import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './hooks/useToast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Insights } from './pages/Insights';
import { Specs } from './pages/Specs';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ToastContainer />
        <BrowserRouter>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/specs" element={<Specs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
