import { useState, useEffect } from 'react';
import type { Goal } from '@/lib/types';
import { useGoals } from '@/hooks/useGoals';
import GoalsScreen from './GoalsScreen';
import GoalForm from './GoalForm';
import GoalDetail from './GoalDetail';
import type { CreateGoalInput } from '@/data/goal-service';

type GoalsView = 'list' | 'create' | 'detail';

export default function GoalsScreenContainer() {
  const [view, setView] = useState<GoalsView>('list');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // If we're in detail view but selectedGoal is null, go back to list
  useEffect(() => {
    if (view === 'detail' && !selectedGoal) {
      setView('list');
    }
  }, [view, selectedGoal]);

  const { addGoal, editGoal, removeGoal, markComplete, markArchived, markActive } =
    useGoals();

  function handleSelectGoal(goal: Goal) {
    setSelectedGoal(goal);
    setView('detail');
  }

  async function handleCreateGoal(input: CreateGoalInput) {
    await addGoal(input);
    setView('list');
  }

  function handleBackToList() {
    setSelectedGoal(null);
    setView('list');
  }

  switch (view) {
    case 'create':
      return (
        <GoalForm
          onSubmit={handleCreateGoal}
          onCancel={handleBackToList}
        />
      );

    case 'detail':
      if (!selectedGoal) {
        return null; // useEffect above will redirect to list
      }
      return (
        <GoalDetail
          goal={selectedGoal}
          onUpdate={async (id, input) => {
            const updated = await editGoal(id, input);
            setSelectedGoal(updated);
            return updated;
          }}
          onComplete={async (id) => {
            const updated = await markComplete(id);
            setSelectedGoal(updated);
            return updated;
          }}
          onArchive={async (id) => {
            const updated = await markArchived(id);
            setSelectedGoal(updated);
            return updated;
          }}
          onReactivate={async (id) => {
            const updated = await markActive(id);
            setSelectedGoal(updated);
            return updated;
          }}
          onDelete={removeGoal}
          onBack={handleBackToList}
        />
      );

    case 'list':
    default:
      return (
        <GoalsScreen
          onCreateGoal={() => setView('create')}
          onSelectGoal={handleSelectGoal}
        />
      );
  }
}
