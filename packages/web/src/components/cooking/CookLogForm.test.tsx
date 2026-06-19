import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {renderWithProviders} from '../../test/testUtils.js';

import {CookLogForm} from './CookLogForm.js';

describe('CookLogForm', () => {
  test('submits rating and notes', async () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    await renderWithProviders(
      <CookLogForm
        onSubmit={onSubmit}
        onSkip={onSkip}
        isPending={false}
      />,
    );
    await userEvent.click(screen.getByLabelText('4 stars'));
    await userEvent.type(
      screen.getByPlaceholderText('Notes from this cook (optional)'),
      'Delicious',
    );
    await userEvent.click(screen.getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith({
      authorStarRating: 4,
      notes: 'Delicious',
    });
  });

  test('submits rating without notes', async () => {
    const onSubmit = vi.fn();
    await renderWithProviders(
      <CookLogForm
        onSubmit={onSubmit}
        onSkip={() => {}}
        isPending={false}
      />,
    );
    await userEvent.click(screen.getByLabelText('3 stars'));
    await userEvent.click(screen.getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith({authorStarRating: 3, notes: null});
  });

  test('skips without submitting', async () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    await renderWithProviders(
      <CookLogForm
        onSubmit={onSubmit}
        onSkip={onSkip}
        isPending={false}
      />,
    );
    await userEvent.click(screen.getByText('Skip'));
    expect(onSkip).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('renders light variant with custom secondary label', async () => {
    const onSkip = vi.fn();
    await renderWithProviders(
      <CookLogForm
        variant="light"
        secondaryLabel="Cancel"
        onSubmit={() => {}}
        onSkip={onSkip}
        isPending={false}
      />,
    );
    await userEvent.click(screen.getByText('Cancel'));
    expect(onSkip).toHaveBeenCalled();
  });
});
