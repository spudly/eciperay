import {render, screen} from '@testing-library/react-native';
import {tamaguiConfig} from '@spudly/ui';
import React from 'react';
import {TamaguiProvider} from 'tamagui';

import {PageTitle} from './PageTitle';

const TEST_TITLE = 'Hello';

describe('PageTitle', () => {
  test('renders page title text', async () => {
    await render(
      <TamaguiProvider
        config={tamaguiConfig}
        defaultTheme="light"
      >
        <PageTitle>{TEST_TITLE}</PageTitle>
      </TamaguiProvider>,
    );

    expect(screen.getByText(TEST_TITLE)).toBeTruthy();
  });
});
