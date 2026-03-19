import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AdditionalFundsInput from '../../../src/screens/budget/AdditionalFundsInput';

describe('AdditionalFundsInput', () => {
  it('should display the current additional funds amount', () => {
    render(<AdditionalFundsInput currentAmount={200} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('additional-funds-display')).toHaveTextContent('$200.00');
  });

  it('should display zero when no additional funds', () => {
    render(<AdditionalFundsInput currentAmount={0} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('additional-funds-display')).toHaveTextContent('$0.00');
  });

  it('should enter edit mode when Edit button clicked', async () => {
    const user = userEvent.setup();
    render(<AdditionalFundsInput currentAmount={0} onUpdate={vi.fn()} />);

    await user.click(screen.getByLabelText('Edit additional funds'));
    expect(screen.getByTestId('additional-funds-input')).toBeInTheDocument();
  });

  it('should call onUpdate with parsed value on save', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<AdditionalFundsInput currentAmount={0} onUpdate={onUpdate} />);

    await user.click(screen.getByLabelText('Edit additional funds'));
    const input = screen.getByTestId('additional-funds-input');
    await user.clear(input);
    await user.type(input, '150.50');
    await user.click(screen.getByText('Save'));

    expect(onUpdate).toHaveBeenCalledWith(150.50);
  });

  it('should show error for negative value', async () => {
    const user = userEvent.setup();
    render(<AdditionalFundsInput currentAmount={0} onUpdate={vi.fn()} />);

    await user.click(screen.getByLabelText('Edit additional funds'));
    const input = screen.getByTestId('additional-funds-input');
    await user.clear(input);
    await user.type(input, '-50');
    await user.click(screen.getByText('Save'));

    expect(screen.getByRole('alert')).toHaveTextContent('Additional funds must be zero or positive');
  });

  it('should cancel editing and revert value', async () => {
    const user = userEvent.setup();
    render(<AdditionalFundsInput currentAmount={100} onUpdate={vi.fn()} />);

    await user.click(screen.getByLabelText('Edit additional funds'));
    const input = screen.getByTestId('additional-funds-input');
    await user.clear(input);
    await user.type(input, '999');
    await user.click(screen.getByText('Cancel'));

    // Should return to display mode with original value
    expect(screen.getByTestId('additional-funds-display')).toHaveTextContent('$100.00');
  });

  it('should save on Enter key', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<AdditionalFundsInput currentAmount={0} onUpdate={onUpdate} />);

    await user.click(screen.getByLabelText('Edit additional funds'));
    const input = screen.getByTestId('additional-funds-input');
    await user.clear(input);
    await user.type(input, '75');
    await user.keyboard('{Enter}');

    expect(onUpdate).toHaveBeenCalledWith(75);
  });
});
