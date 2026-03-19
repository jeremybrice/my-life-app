import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../../../src/screens/agent/ChatInput';

describe('ChatInput', () => {
  it('should render text input and send button', () => {
    render(<ChatInput onSendMessage={vi.fn()} onImageUpload={vi.fn()} />);
    expect(screen.getByTestId('chat-input')).toBeTruthy();
    expect(screen.getByTestId('send-btn')).toBeTruthy();
  });

  it('should disable send button when input is empty', () => {
    render(<ChatInput onSendMessage={vi.fn()} onImageUpload={vi.fn()} />);
    const btn = screen.getByTestId('send-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('should enable send button when text is entered', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={vi.fn()} onImageUpload={vi.fn()} />);
    await user.type(screen.getByTestId('chat-input'), 'Hello');
    const btn = screen.getByTestId('send-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('should call onSendMessage and clear input on submit', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} onImageUpload={vi.fn()} />);
    const input = screen.getByTestId('chat-input');
    await user.type(input, 'Spent $25 at Chipotle');
    await user.click(screen.getByTestId('send-btn'));
    expect(onSendMessage).toHaveBeenCalledWith('Spent $25 at Chipotle');
    expect((input as HTMLTextAreaElement).value).toBe('');
  });

  it('should submit on Enter key (without Shift)', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} onImageUpload={vi.fn()} />);
    await user.type(screen.getByTestId('chat-input'), 'Hello{Enter}');
    expect(onSendMessage).toHaveBeenCalledWith('Hello');
  });

  it('should not submit on Shift+Enter', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    render(<ChatInput onSendMessage={onSendMessage} onImageUpload={vi.fn()} />);
    await user.type(screen.getByTestId('chat-input'), 'Hello{Shift>}{Enter}{/Shift}');
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('should disable all inputs when disabled prop is true', () => {
    render(<ChatInput onSendMessage={vi.fn()} onImageUpload={vi.fn()} disabled={true} />);
    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    const uploadBtn = screen.getByTestId('upload-image-btn') as HTMLButtonElement;
    expect(input.disabled).toBe(true);
    expect(uploadBtn.disabled).toBe(true);
  });

  it('should show "Sending..." when loading', () => {
    render(<ChatInput onSendMessage={vi.fn()} onImageUpload={vi.fn()} loading={true} />);
    expect(screen.getByText('Sending...')).toBeTruthy();
  });

  it('should render image upload button', () => {
    render(<ChatInput onSendMessage={vi.fn()} onImageUpload={vi.fn()} />);
    expect(screen.getByTestId('upload-image-btn')).toBeTruthy();
  });

  it('should have hidden file input accepting jpeg and png', () => {
    render(<ChatInput onSendMessage={vi.fn()} onImageUpload={vi.fn()} />);
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    expect(fileInput.accept).toBe('image/jpeg,image/png');
    expect(fileInput.type).toBe('file');
  });
});
