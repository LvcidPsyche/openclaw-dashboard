import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LoadingState from './components/common/LoadingState';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const PipelinesPage = lazy(() => import('./pages/PipelinesPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const SkillsPage = lazy(() => import('./pages/SkillsPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const NodesPage = lazy(() => import('./pages/NodesPage'));
const MetricsPage = lazy(() => import('./pages/MetricsPage'));
const SystemPage = lazy(() => import('./pages/SystemPage'));
const LogsPage = lazy(() => import('./pages/LogsPage'));
const DebugPage = lazy(() => import('./pages/DebugPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState message="Loading..." />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="pipelines" element={<PipelinesPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="config" element={<ConfigPage />} />
            <Route path="nodes" element={<NodesPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="system" element={<SystemPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="debug" element={<DebugPage />} />
            <Route path="docs" element={<DocsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
