import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vitest';

import {TabBar} from './TabBar.js';

describe('TabBar', () => {
  test('renders tabs and switches active tab', async () => {
    const onTabChange = vi.fn();

    render(
      <TabBar
        tabs={[
          {key: 'one', label: 'One'},
          {key: 'two', label: 'Two'},
        ]}
        activeTab="one"
        onTabChange={onTabChange}
      />,
    );

    await userEvent.click(screen.getByRole('tab', {name: 'Two'}));
    expect(onTabChange).toHaveBeenCalledWith('two');
  });
});
