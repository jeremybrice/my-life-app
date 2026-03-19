import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { db } from '@/data/db';
import { getSettings } from '@/data/settings-service';

function renderSettings() {
  return render(
    <BrowserRouter>
      <SettingsScreen />
    </BrowserRouter>
  );
}

describe('SettingsScreen', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should render the settings form', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('AI Configuration')).toBeInTheDocument();
    expect(screen.getByText('Life Milestone')).toBeInTheDocument();
    expect(screen.getByText('Budget Configuration')).toBeInTheDocument();
  });

  it('should save and retrieve all fields', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Claude API Key')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Claude API Key'), 'sk-ant-test');
    await user.type(screen.getByLabelText('Birth Date'), '1990-01-15');
    await user.type(screen.getByLabelText('Target Date'), '2040-06-15');
    await user.type(screen.getByLabelText('Target Date Label'), 'Financial Freedom');
    await user.type(screen.getByLabelText('Monthly Budget ($)'), '5000');

    await user.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });

    // Verify persistence
    const saved = await getSettings();
    expect(saved?.apiKey).toBe('sk-ant-test');
    expect(saved?.birthDate).toBe('1990-01-15');
    expect(saved?.targetDate).toBe('2040-06-15');
    expect(saved?.targetDateLabel).toBe('Financial Freedom');
    expect(saved?.monthlyBudget).toBe(5000);
  });

  it('should allow partial saves', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Monthly Budget ($)')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Monthly Budget ($)'), '3000');
    await user.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });

    const saved = await getSettings();
    expect(saved?.monthlyBudget).toBe(3000);
    expect(saved?.apiKey).toBeUndefined();
  });

  it('should pre-populate form with existing settings', async () => {
    // Pre-seed settings
    await db.settings.put({
      id: 1,
      apiKey: 'existing-key',
      monthlyBudget: 4000,
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Claude API Key')).toHaveValue('existing-key');
    });

    expect(screen.getByLabelText('Monthly Budget ($)')).toHaveValue(4000);
  });

  it('should mask API key by default', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Claude API Key')).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText('Claude API Key');
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('should toggle API key visibility', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Claude API Key')).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText('Claude API Key');
    expect(apiKeyInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByText('Show'));
    expect(apiKeyInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByText('Hide'));
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('should show save confirmation message', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Save Settings')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });
  });

  it('should prevent future birth dates via max attribute', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Birth Date')).toBeInTheDocument();
    });

    const birthInput = screen.getByLabelText('Birth Date');
    expect(birthInput).toHaveAttribute('max');
  });

  it('should use number input for budget field', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Monthly Budget ($)')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Monthly Budget ($)')).toHaveAttribute('type', 'number');
  });
});
