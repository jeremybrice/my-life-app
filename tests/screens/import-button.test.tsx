import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportButton } from '@/screens/settings/ImportButton';

vi.mock('@/data/import-service', () => ({
  validateImportFile: vi.fn(),
  importData: vi.fn(),
  readFileAsText: vi.fn(),
}));

import {
  validateImportFile,
  importData,
  readFileAsText,
} from '@/data/import-service';

describe('ImportButton', () => {
  it('should render import button', () => {
    render(<ImportButton />);
    expect(screen.getByText('Import Data')).toBeInTheDocument();
  });

  it('should show error for invalid file', async () => {
    const user = userEvent.setup();
    (readFileAsText as ReturnType<typeof vi.fn>).mockResolvedValue('{}');
    (validateImportFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: false,
      error: 'File is not a valid My Life App export.',
    });

    render(<ImportButton />);

    const file = new File(['{}'], 'bad.json', { type: 'application/json' });
    const input = screen.getByLabelText('Select import file');
    await user.upload(input, file);

    await waitFor(() => {
      expect(
        screen.getByText('File is not a valid My Life App export.')
      ).toBeInTheDocument();
    });
  });

  it('should show confirmation dialog for valid file', async () => {
    const user = userEvent.setup();
    const validData = {
      metadata: { exportDate: '2026-03-18T00:00:00Z', appVersion: '1.0.0', schemaVersion: 2 },
      data: { settings: [], budgetMonths: [], expenses: [], goals: [], healthRoutines: [], healthLogEntries: [] },
    };
    (readFileAsText as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify(validData)
    );
    (validateImportFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validData,
    });

    render(<ImportButton />);

    const file = new File([JSON.stringify(validData)], 'backup.json', {
      type: 'application/json',
    });
    const input = screen.getByLabelText('Select import file');
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('Replace All Data?')).toBeInTheDocument();
    });
  });

  it('should cancel import and return to idle', async () => {
    const user = userEvent.setup();
    const validData = {
      metadata: { exportDate: '2026-03-18T00:00:00Z', appVersion: '1.0.0', schemaVersion: 2 },
      data: { settings: [], budgetMonths: [], expenses: [], goals: [], healthRoutines: [], healthLogEntries: [] },
    };
    (readFileAsText as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify(validData)
    );
    (validateImportFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validData,
    });

    render(<ImportButton />);

    const file = new File([JSON.stringify(validData)], 'backup.json', {
      type: 'application/json',
    });
    const input = screen.getByLabelText('Select import file');
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('Replace All Data?')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancel'));

    // After cancel, the dialog should no longer be open (dialog element still in DOM but closed)
    await waitFor(() => {
      const dialog = document.querySelector('dialog');
      expect(dialog).not.toHaveAttribute('open');
    });
    expect(importData).not.toHaveBeenCalled();
  });
});
