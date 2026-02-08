import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2, GitCompare, Loader2, Plus } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface Snapshot {
  label: string;
  platform: string;
  timestamp: string;
  scopes: string[];
  totalFiles: number;
  totalSize: number;
}

export function SnapshotsPage() {
  const { deviceId, bundleId } = useParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: snapshots, isLoading } = useQuery<Snapshot[]>({
    queryKey: ['snapshots', deviceId, bundleId],
    queryFn: async () => {
      const res = await fetch(`/api/snapshots/${deviceId}/${bundleId}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (label: string) => {
      await fetch(`/api/snapshots/${deviceId}/${bundleId}/${label}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots', deviceId, bundleId] });
    },
  });

  const toggleSelection = (label: string) => {
    setSelectedSnapshots(prev => {
      if (prev.includes(label)) {
        return prev.filter(l => l !== label);
      }
      if (prev.length >= 2) {
        return [prev[1], label];
      }
      return [...prev, label];
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Snapshots</h2>
            <p className="text-sm text-gray-500 mt-1">{bundleId}</p>
          </div>
          <div className="flex gap-2">
            {selectedSnapshots.length === 2 && (
              <Link
                to={`/devices/${deviceId}/${bundleId}/compare/${selectedSnapshots[0]}/${selectedSnapshots[1]}`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare
              </Link>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Snapshot
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : snapshots && snapshots.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {snapshots.map((snapshot) => (
                <li key={snapshot.label}>
                  <div className="px-4 py-4 flex items-center sm:px-6">
                    <input
                      type="checkbox"
                      checked={selectedSnapshots.includes(snapshot.label)}
                      onChange={() => toggleSelection(snapshot.label)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-gray-400" />
                            {snapshot.label}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(snapshot.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">{snapshot.scopes.length}</span> scopes
                          </div>
                          <button
                            onClick={() => deleteMutation.mutate(snapshot.label)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Camera className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No snapshots</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a snapshot.</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateSnapshotModal
          deviceId={deviceId!}
          bundleId={bundleId!}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

function CreateSnapshotModal({
  deviceId,
  bundleId,
  onClose,
}: {
  deviceId: string;
  bundleId: string;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');
  const queryClient = useQueryClient();
  const { status, message } = useWebSocket();

  const createMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/snapshots/${deviceId}/${bundleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, format: 'json' }),
      });
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['snapshots', deviceId, bundleId] });
        onClose();
      }, 2000);
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create Snapshot</h3>

        {!createMutation.isPending ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., before-login"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!label}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <div>
                <p className="text-sm font-medium">{status}</p>
                <p className="text-sm text-gray-500">{message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
