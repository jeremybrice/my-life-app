import { useState, useRef } from 'react';
import {
  validateImportFile,
  importData,
  readFileAsText,
} from '@/data/import-service';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ExportData } from '@/lib/types';

export function ImportButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'validating' | 'confirming' | 'importing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [validatedData, setValidatedData] = useState<ExportData | null>(null);

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('validating');
    setErrorMessage('');

    try {
      const content = await readFileAsText(file);
      const result = validateImportFile(content);

      if (!result.valid || !result.data) {
        setStatus('error');
        setErrorMessage(result.error || 'Invalid file.');
        return;
      }

      setValidatedData(result.data);
      setStatus('confirming');
    } catch {
      setStatus('error');
      setErrorMessage('Failed to read the selected file.');
    }

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleConfirmImport() {
    if (!validatedData) return;

    setStatus('importing');
    try {
      await importData(validatedData);
      setStatus('success');
      // Reload the app to reflect imported data
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Import failed.'
      );
    }
  }

  function handleCancelImport() {
    setValidatedData(null);
    setStatus('idle');
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Select import file"
      />

      <button
        onClick={handleButtonClick}
        disabled={status === 'validating' || status === 'importing'}
        className="w-full rounded-lg border border-edge bg-surface-card px-4 py-3 text-sm font-medium text-fg-secondary hover:bg-surface-hover disabled:opacity-50"
      >
        {status === 'validating'
          ? 'Validating...'
          : status === 'importing'
            ? 'Importing...'
            : 'Import Data'}
      </button>

      {status === 'success' && (
        <p className="mt-2 text-sm text-green-600">
          Data imported successfully. Reloading...
        </p>
      )}

      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      )}

      <ConfirmDialog
        open={status === 'confirming' && validatedData !== null}
        title="Replace All Data?"
        message={
          validatedData
            ? `This will replace ALL current data in the app with data from the backup exported on ${new Date(validatedData.metadata.exportDate).toLocaleDateString()}. This action cannot be undone. Schema version: ${validatedData.metadata.schemaVersion}.`
            : ''
        }
        confirmLabel="Import and Replace"
        cancelLabel="Cancel"
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
        variant="danger"
      />
    </div>
  );
}
