import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LoadingState from './components/common/LoadingState';

const NerveCenterPage = lazy(() => import('./pages/NerveCenterPage'));
const OverviewPage    = lazy(() => import('./pages/OverviewPage'));
const ChatPage        = lazy(() => import('./pages/ChatPage'));
const AgentsPage      = lazy(() => import('./pages/AgentsPage'));
const SessionsPage    = lazy(() => import('./pages/SessionsPage'));
const NodesPage       = lazy(() => import('./pages/NodesPage'));
const JobsPage        = lazy(() => import('./pages/JobsPage'));
const PipelinesPage   = lazy(() => import('./pages/PipelinesPage'));
const SkillsPage      = lazy(() => import('./pages/SkillsPage'));
const MetricsPage     = lazy(() => import('./pages/MetricsPage'));
const LogsPage        = lazy(() => import('./pages/LogsPage'));
const FilesPage       = lazy(() => import('./pages/FilesPage'));
const ConfigPage      = lazy(() => import('./pages/ConfigPage'));
const SettingsPage    = lazy(() => import('./pages/SettingsPage'));
const SystemPage      = lazy(() => import('./pages/SystemPage'));
const DebugPage       = lazy(() => import('./pages/DebugPage'));
const DocsPage        = lazy(() => import('./pages/DocsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState message="Loading..." />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index        element={<NerveCenterPage />} />
            <Route path="overview"  element={<OverviewPage />} />
            <Route path="chat"      element={<ChatPage />} />
            <Route path="agents"    element={<AgentsPage />} />
            <Route path="sessions"  element={<SessionsPage />} />
            <Route path="nodes"     element={<NodesPage />} />
            <Route path="jobs"      element={<JobsPage />} />
            <Route path="pipelines" element={<PipelinesPage />} />
            <Route path="skills"    element={<SkillsPage />} />
            <Route path="metrics"   element={<MetricsPage />} />
            <Route path="logs"      element={<LogsPage />} />
            <Route path="files"     element={<FilesPage />} />
            <Route path="config"    element={<ConfigPage />} />
            <Route path="settings"  element={<SettingsPage />} />
            <Route path="system"    element={<SystemPage />} />
            <Route path="debug"     element={<DebugPage />} />
            <Route path="docs"      element={<DocsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
