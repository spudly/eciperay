import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vitest';

import {CheckboxSelectList} from './CheckboxSelectList.js';

describe('CheckboxSelectList', () => {
  test('renders items and toggles selection', async () => {
    const onToggle = vi.fn();

    render(
      <CheckboxSelectList
        items={[
          {id: '1', label: 'Alpha'},
          {id: '2', label: 'Beta'},
        ]}
        selectedIds={new Set(['1'])}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByRole('checkbox', {name: 'Alpha'})).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', {name: 'Beta'}));
    expect(onToggle).toHaveBeenCalledWith('2');
  });

  test('shows loading and empty states', () => {
    const {rerender} = render(
      <CheckboxSelectList
        items={[]}
        selectedIds={new Set()}
        onToggle={() => {
          void 0;
        }}
        isLoading
      />,
    );

    expect(screen.getByRole('status', {name: 'Loading'})).toBeInTheDocument();

    rerender(
      <CheckboxSelectList
        items={[]}
        selectedIds={new Set()}
        onToggle={() => {
          void 0;
        }}
        emptyMessage="No recipes found."
      />,
    );

    expect(screen.getByText('No recipes found.')).toBeInTheDocument();
  });
});
