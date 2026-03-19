import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from '@/screens/settings/ExportButton';

vi.mock('@/data/export-service', () => ({
  exportAllData: vi.fn(),
  downloadExportFile: vi.fn(),
}));

import { exportAllData, downloadExportFile } from '@/data/export-service';

describe('ExportButton', () => {
  it('should render export button', () => {
    render(<ExportButton />);
    expect(screen.getByText('Export Data')).toBeInTheDocument();
  });

  it('should show loading state during export', async () => {
    const user = userEvent.setup();
    (exportAllData as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ metadata: {}, data: {} }), 100))
    );
    (downloadExportFile as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    render(<ExportButton />);
    await user.click(screen.getByText('Export Data'));

    expect(screen.getByText('Exporting...')).toBeInTheDocument();
  });

  it('should show success message after export', async () => {
    const user = userEvent.setup();
    (exportAllData as ReturnType<typeof vi.fn>).mockResolvedValue({ metadata: {}, data: {} });
    (downloadExportFile as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    render(<ExportButton />);
    await user.click(screen.getByText('Export Data'));

    await waitFor(() => {
      expect(screen.getByText('Data exported successfully.')).toBeInTheDocument();
    });
  });

  it('should show error message on export failure', async () => {
    const user = userEvent.setup();
    (exportAllData as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB read failed'));

    render(<ExportButton />);
    await user.click(screen.getByText('Export Data'));

    await waitFor(() => {
      expect(screen.getByText('Export failed. Please try again.')).toBeInTheDocument();
    });
  });
});
