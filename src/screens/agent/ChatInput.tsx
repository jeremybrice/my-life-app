import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onImageUpload: (file: File) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ChatInput({ onSendMessage, onImageUpload, disabled = false, loading = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = text.trim().length > 0 && !disabled && !loading;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    onSendMessage(text.trim());
    setText('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSendMessage(text.trim());
        setText('');
      }
    }
  }

  function handleImageClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      // Reset input so same file can be re-uploaded
      e.target.value = '';
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 border-t border-edge bg-surface-card">
      <button
        type="button"
        onClick={handleImageClick}
        disabled={disabled || loading}
        className="flex-shrink-0 p-2 text-fg-muted hover:text-fg-secondary disabled:opacity-50"
        aria-label="Upload image"
        data-testid="upload-image-btn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
        data-testid="file-input"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe an expense..."
        disabled={disabled || loading}
        rows={1}
        className="flex-1 resize-none border border-edge rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        data-testid="chat-input"
      />
      <button
        type="submit"
        disabled={!canSend}
        className="flex-shrink-0 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="send-btn"
      >
        {loading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
