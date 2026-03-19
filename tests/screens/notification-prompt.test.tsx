import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPrompt } from '@/components/NotificationPrompt';

// Mock the notification service
vi.mock('@/data/notification-service', () => ({
  requestNotificationPermission: vi.fn(),
  deferPermissionPrompt: vi.fn(),
}));

import {
  requestNotificationPermission,
  deferPermissionPrompt,
} from '@/data/notification-service';

describe('NotificationPrompt', () => {
  it('should render the pre-permission prompt with explanation', () => {
    render(<NotificationPrompt onClose={vi.fn()} />);
    expect(screen.getByText('Stay on top of your goals')).toBeInTheDocument();
    expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
    expect(screen.getByText('Not Now')).toBeInTheDocument();
  });

  it('should call deferPermissionPrompt and close on Not Now', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    (deferPermissionPrompt as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<NotificationPrompt onClose={onClose} />);
    await user.click(screen.getByText('Not Now'));

    expect(deferPermissionPrompt).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should show granted confirmation when permission is granted', async () => {
    const user = userEvent.setup();
    (requestNotificationPermission as ReturnType<typeof vi.fn>).mockResolvedValue('granted');

    render(<NotificationPrompt onClose={vi.fn()} />);
    await user.click(screen.getByText('Enable Notifications'));

    expect(await screen.findByText('Notifications enabled!')).toBeInTheDocument();
  });

  it('should show denied message when permission is denied', async () => {
    const user = userEvent.setup();
    (requestNotificationPermission as ReturnType<typeof vi.fn>).mockResolvedValue('denied');

    render(<NotificationPrompt onClose={vi.fn()} />);
    await user.click(screen.getByText('Enable Notifications'));

    expect(await screen.findByText('Notifications blocked')).toBeInTheDocument();
    expect(screen.getByText('Got it')).toBeInTheDocument();
  });
});
