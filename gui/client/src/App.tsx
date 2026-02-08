import { Routes, Route, Navigate } from 'react-router-dom';
import { DeviceListPage } from './pages/DeviceListPage';
import { SnapshotsPage } from './pages/SnapshotsPage';
import { ComparePage } from './pages/ComparePage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">mobile-diff</h1>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/devices" replace />} />
          <Route path="/devices" element={<DeviceListPage />} />
          <Route path="/devices/:deviceId/:bundleId/snapshots" element={<SnapshotsPage />} />
          <Route path="/devices/:deviceId/:bundleId/compare/:before/:after" element={<ComparePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
