import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Smartphone, Loader2 } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: string;
  platform?: string;
}

interface App {
  identifier: string;
  name: string;
  pid: number | null;
}

export function DeviceListPage() {
  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => {
      const res = await fetch('/api/devices');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h2 className="text-2xl font-semibold mb-6">Devices</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {devices?.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>

        {devices?.length === 0 && (
          <div className="text-center py-12">
            <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No devices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect a device and make sure Frida is running.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DeviceCard({ device }: { device: Device }) {
  const { data: apps, isLoading, isError } = useQuery<App[]>({
    queryKey: ['apps', device.id],
    queryFn: async () => {
      const res = await fetch(`/api/devices/${device.id}/apps`);
      const data = await res.json();
      // Handle error responses
      if (!res.ok || data.error) {
        return [];
      }
      return Array.isArray(data) ? data : [];
    },
  });

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <Smartphone className="h-8 w-8 text-gray-400" />
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">{device.name}</h3>
            <p className="text-sm text-gray-500">{device.type}</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Apps</h4>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : apps && apps.length > 0 ? (
            <ul className="space-y-2">
              {apps.slice(0, 5).map((app) => (
                <li key={app.identifier}>
                  <Link
                    to={`/devices/${device.id}/${app.identifier}/snapshots`}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline block"
                  >
                    {app.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">
              {isError || device.type === 'remote' ? 'Not connected' : 'No apps found'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
