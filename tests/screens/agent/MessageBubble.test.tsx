import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageBubble } from '../../../src/screens/agent/MessageBubble';
import type { ChatMessage } from '../../../src/screens/agent/agent-types';

describe('MessageBubble', () => {
  it('should render user text message with right alignment', () => {
    const msg: ChatMessage = {
      id: '1',
      role: 'user',
      contentType: 'text',
      text: 'Hello agent',
      timestamp: Date.now(),
    };
    const { container } = render(<MessageBubble message={msg} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('justify-end');
    expect(screen.getByText('Hello agent')).toBeTruthy();
  });

  it('should render assistant text message with left alignment', () => {
    const msg: ChatMessage = {
      id: '2',
      role: 'assistant',
      contentType: 'text',
      text: 'How can I help?',
      timestamp: Date.now(),
    };
    const { container } = render(<MessageBubble message={msg} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('justify-start');
    expect(screen.getByText('How can I help?')).toBeTruthy();
  });

  it('should render error message with red styling', () => {
    const msg: ChatMessage = {
      id: '3',
      role: 'assistant',
      contentType: 'error',
      text: 'Something went wrong',
      timestamp: Date.now(),
    };
    render(<MessageBubble message={msg} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('should render disclosure message centered with amber styling', () => {
    const msg: ChatMessage = {
      id: '4',
      role: 'system',
      contentType: 'disclosure',
      text: 'Images are processed by Anthropic.',
      timestamp: Date.now(),
    };
    const { container } = render(<MessageBubble message={msg} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('justify-center');
    expect(screen.getByText('Images are processed by Anthropic.')).toBeTruthy();
  });

  it('should render expense confirmation card with confirm/cancel buttons', () => {
    const msg: ChatMessage = {
      id: '5',
      role: 'assistant',
      contentType: 'expense-confirmation',
      parsedExpense: {
        amount: 25.0,
        vendor: 'Chipotle',
        category: 'Dining',
        date: '2026-03-18',
      },
      confirmationStatus: 'pending',
      timestamp: Date.now(),
    };
    render(<MessageBubble message={msg} />);
    expect(screen.getByText('Chipotle')).toBeTruthy();
    expect(screen.getByTestId('confirm-expense-btn')).toBeTruthy();
    expect(screen.getByTestId('cancel-expense-btn')).toBeTruthy();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const msg: ChatMessage = {
      id: '5',
      role: 'assistant',
      contentType: 'expense-confirmation',
      parsedExpense: {
        amount: 25.0,
        vendor: 'Chipotle',
        date: '2026-03-18',
      },
      confirmationStatus: 'pending',
      timestamp: Date.now(),
    };
    render(<MessageBubble message={msg} onConfirm={onConfirm} />);
    await user.click(screen.getByTestId('confirm-expense-btn'));
    expect(onConfirm).toHaveBeenCalledWith('5');
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const msg: ChatMessage = {
      id: '5',
      role: 'assistant',
      contentType: 'expense-confirmation',
      parsedExpense: {
        amount: 25.0,
        vendor: 'Chipotle',
        date: '2026-03-18',
      },
      confirmationStatus: 'pending',
      timestamp: Date.now(),
    };
    render(<MessageBubble message={msg} onCancel={onCancel} />);
    await user.click(screen.getByTestId('cancel-expense-btn'));
    expect(onCancel).toHaveBeenCalledWith('5');
  });

  it('should show saved status without buttons', () => {
    const msg: ChatMessage = {
      id: '6',
      role: 'assistant',
      contentType: 'expense-confirmation',
      parsedExpense: {
        amount: 25.0,
        vendor: 'Chipotle',
        date: '2026-03-18',
      },
      confirmationStatus: 'saved',
      timestamp: Date.now(),
    };
    render(<MessageBubble message={msg} />);
    expect(screen.queryByTestId('confirm-expense-btn')).toBeNull();
    expect(screen.getByText(/Saved/)).toBeTruthy();
  });

  it('should render image thumbnail when imageUrl is present', () => {
    const msg: ChatMessage = {
      id: '7',
      role: 'user',
      contentType: 'text',
      imageUrl: 'blob:http://localhost/fake-image',
      timestamp: Date.now(),
    };
    render(<MessageBubble message={msg} />);
    const img = screen.getByAltText('Uploaded receipt');
    expect(img).toBeTruthy();
    expect((img as HTMLImageElement).src).toBe('blob:http://localhost/fake-image');
  });
});
