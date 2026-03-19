import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';

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

    expect(screen.getByText(/Set and track financial/)).toBeInTheDocument();
  });

  it('should navigate to Health screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const healthLinks = screen.getAllByText('Health');
    await user.click(healthLinks[0]!);

    expect(screen.getByText(/Build and maintain healthy habits/)).toBeInTheDocument();
  });

  it('should navigate to AI Agent screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const agentLinks = screen.getAllByText('AI Agent');
    await user.click(agentLinks[0]!);

    expect(screen.getByText(/Coming Soon/)).toBeInTheDocument();
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
