import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ComparePage() {
  const { deviceId, bundleId, before, after } = useParams();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <Link
          to={`/devices/${deviceId}/${bundleId}/snapshots`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Snapshots
        </Link>

        <h2 className="text-2xl font-semibold mb-6">Compare Snapshots</h2>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">Before</p>
              <p className="text-lg font-medium">{before}</p>
            </div>
            <div className="text-gray-400">→</div>
            <div>
              <p className="text-sm text-gray-500">After</p>
              <p className="text-lg font-medium">{after}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-gray-500 text-center">
              Comparison view is a placeholder. Use the CLI for full diff functionality:
            </p>
            <pre className="mt-4 p-4 bg-gray-50 rounded text-sm">
              mobile-diff snapshot diff {deviceId} {bundleId} {before} {after}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
