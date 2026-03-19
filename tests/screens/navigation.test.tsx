import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';

// Mock claude-client so AgentScreen's validateApiKey call resolves
vi.mock('../../src/services/claude-client', () => ({
  validateApiKey: vi.fn().mockResolvedValue(true),
  ClaudeClientError: class ClaudeClientError extends Error {
    errorType: string;
    constructor(message: string, errorType: string) {
      super(message);
      this.errorType = errorType;
      this.name = 'ClaudeClientError';
    }
  },
}));

// Mock expense-parser (imported by AgentScreen)
vi.mock('../../src/services/expense-parser', () => ({
  parseExpenseMessage: vi.fn().mockResolvedValue({ type: 'clarification', message: 'ok' }),
}));

// Mock receipt-processor (imported by AgentScreen)
vi.mock('../../src/services/receipt-processor', () => ({
  processReceipt: vi.fn(),
}));

describe('Navigation', () => {
  it('should render the Dashboard by default', () => {
    render(<App />);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
  });

  it('should navigate to Budget screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const budgetLinks = screen.getAllByText('Budget');
    await user.click(budgetLinks[0]!);

    await waitFor(() => {
      expect(screen.getByText(/No Budget Configured/)).toBeInTheDocument();
    });
  });

  it('should navigate to Goals screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const goalLinks = screen.getAllByText('Goals');
    await user.click(goalLinks[0]!);

    await waitFor(() => {
      expect(screen.getByText(/No goals yet/i)).toBeInTheDocument();
    });
  });

  it('should navigate to Health screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const healthLinks = screen.getAllByText('Health');
    await user.click(healthLinks[0]!);

    await waitFor(() => {
      expect(screen.getByText(/No health routines yet/i)).toBeInTheDocument();
    });
  });

  it('should navigate to AI Agent screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const agentLinks = screen.getAllByText('AI Agent');
    await user.click(agentLinks[0]!);

    await waitFor(() => {
      expect(screen.getByText(/expense assistant/i)).toBeInTheDocument();
    });
  });

  it('should navigate to Settings screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const settingsLinks = screen.getAllByText('Settings');
    await user.click(settingsLinks[0]!);

    await waitFor(() => {
      expect(screen.getByText(/AI Configuration/i)).toBeInTheDocument();
    });
  });

  it('should show all 6 nav items', () => {
    render(<App />);

    // Mobile bottom nav renders all items
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Budget').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Goals').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Health').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AI Agent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
  });
});
