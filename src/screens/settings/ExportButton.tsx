import { useState } from 'react';
import { exportAllData, downloadExportFile } from '@/data/export-service';

export function ExportButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleExport() {
    setStatus('loading');
    try {
      const data = await exportAllData();
      downloadExportFile(data);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={status === 'loading'}
        className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {status === 'loading' ? 'Exporting...' : 'Export Data'}
      </button>
      {status === 'success' && (
        <p className="mt-2 text-sm text-green-600">
          Data exported successfully.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600">
          Export failed. Please try again.
        </p>
      )}
    </div>
  );
}
