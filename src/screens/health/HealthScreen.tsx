import { useState } from 'react';
import { useHealth } from '@/hooks/useHealth';
import type { RoutineWithAdherence } from '@/hooks/useHealth';
import type { CreateRoutineInput, UpdateRoutineInput, CreateLogEntryInput } from '@/data/health-service';
import { RoutineCard } from './RoutineCard';
import { RoutineForm } from './RoutineForm';
import { LogEntryForm } from './LogEntryForm';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorState } from '@/components/ErrorState';

type HealthView = 'list' | 'createRoutine' | 'editRoutine' | 'log';

export function HealthScreen() {
  const { routines, loading, error, addRoutine, editRoutine, removeRoutine, logEntry } = useHealth();
  const [view, setView] = useState<HealthView>('list');
  const [editingRoutine, setEditingRoutine] = useState<RoutineWithAdherence | null>(null);
  const [preSelectedRoutineId, setPreSelectedRoutineId] = useState<number | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  function handleBackToList() {
    setView('list');
    setEditingRoutine(null);
    setPreSelectedRoutineId(undefined);
  }

  async function handleCreateRoutine(input: CreateRoutineInput | UpdateRoutineInput) {
    await addRoutine(input as CreateRoutineInput);
    handleBackToList();
  }

  async function handleEditRoutine(input: CreateRoutineInput | UpdateRoutineInput) {
    if (editingRoutine) {
      await editRoutine(editingRoutine.id!, input as UpdateRoutineInput);
    }
    handleBackToList();
  }

  async function handleLogEntry(input: CreateLogEntryInput) {
    await logEntry(input);
    // LogEntryForm handles its own success -> redirect via onCancel
  }

  function handleQuickLog(routineId: number) {
    setPreSelectedRoutineId(routineId);
    setView('log');
  }

  function handleEditRoutineNav(routine: RoutineWithAdherence) {
    setEditingRoutine(routine);
    setView('editRoutine');
  }

  async function handleConfirmDelete() {
    if (deleteTarget) {
      await removeRoutine(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  // Sub-views
  if (view === 'createRoutine') {
    return (
      <RoutineForm
        onSubmit={handleCreateRoutine}
        onCancel={handleBackToList}
      />
    );
  }

  if (view === 'editRoutine') {
    if (!editingRoutine) {
      setView('list');
      return null;
    }
    return (
      <RoutineForm
        routine={editingRoutine}
        onSubmit={handleEditRoutine}
        onCancel={handleBackToList}
      />
    );
  }

  if (view === 'log') {
    return (
      <LogEntryForm
        routines={routines}
        preSelectedRoutineId={preSelectedRoutineId}
        onSubmit={handleLogEntry}
        onCancel={handleBackToList}
      />
    );
  }

  // Main list view
  if (loading) {
    return <LoadingSpinner label="Loading health routines..." />;
  }

  if (error) {
    return (
      <ErrorState
        message="Could not load health routines."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Health Routines</h1>
        <button
          type="button"
          onClick={() => setView('createRoutine')}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          data-testid="create-routine-button"
        >
          + New Routine
        </button>
      </div>

      {routines.length === 0 ? (
        <EmptyState
          title="No health routines yet"
          description="Define your first routine to start tracking your habits!"
          action={{
            label: 'Create Routine',
            onClick: () => setView('createRoutine'),
          }}
        />
      ) : (
        <div className="space-y-3" data-testid="routines-list">
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onQuickLog={handleQuickLog}
              onEdit={handleEditRoutineNav}
              onDelete={(id) => {
                const r = routines.find((r) => r.id === id);
                setDeleteTarget({ id, name: r?.name ?? '' });
              }}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Routine"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All log entries for this routine will also be permanently deleted.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
