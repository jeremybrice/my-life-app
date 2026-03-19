import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentScreen } from '../../../src/screens/agent/AgentScreen';

const mockOnlineStatus = vi.fn();
vi.mock('../../../src/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnlineStatus(),
}));

describe('AgentScreen', () => {
  it('should show offline message when not connected', () => {
    mockOnlineStatus.mockReturnValue(false);
    render(<AgentScreen />);
    expect(screen.getByTestId('agent-offline-message')).toBeInTheDocument();
    expect(screen.getByText(/internet required/i)).toBeInTheDocument();
    expect(screen.getByText(/all other features work offline/i)).toBeInTheDocument();
  });

  it('should show placeholder when online', () => {
    mockOnlineStatus.mockReturnValue(true);
    render(<AgentScreen />);
    expect(screen.getByTestId('agent-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('should have the page title "AI Agent"', () => {
    mockOnlineStatus.mockReturnValue(true);
    render(<AgentScreen />);
    expect(screen.getByText('AI Agent')).toBeInTheDocument();
  });
});
