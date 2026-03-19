import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const closedByEscape = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open && !closedByEscape.current) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    closedByEscape.current = false;
  }, [open]);

  const handleClose = () => {
    closedByEscape.current = true;
    onCancel();
  };

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-accent hover:bg-accent-hover text-white';

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="rounded-xl shadow-xl backdrop:bg-black/50 p-0 max-w-sm w-full"
    >
      <div className="animate-slide-up p-6">
        <h2 className="text-lg font-semibold text-fg mb-2">
          {title}
        </h2>
        <p className="text-sm text-fg-secondary mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-fg-secondary bg-surface-tertiary rounded-lg hover:bg-surface-hover transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
