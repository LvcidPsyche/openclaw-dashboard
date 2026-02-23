import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LoadingState from './components/common/LoadingState';

const ChatPage = lazy(() => import('./pages/ChatPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const SystemPage = lazy(() => import('./pages/SystemPage'));
const DebugPage = lazy(() => import('./pages/DebugPage'));
const FilesPage = lazy(() => import('./pages/FilesPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState message="Loading..." />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<ChatPage />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="system" element={<SystemPage />} />
            <Route path="debug" element={<DebugPage />} />
            <Route path="files" element={<FilesPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
