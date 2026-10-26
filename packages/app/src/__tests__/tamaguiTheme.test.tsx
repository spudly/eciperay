/**
 * Regression test for spudly/eciperay#149: the app rendered the Memorize brand
 * (teal primary, paper background, white-on-gray secondary buttons) instead of
 * Eciperay's Warm Harvest theme.
 *
 * Tamagui v3 resolves styles against the last config passed to
 * `createTamagui()` globally — `TamaguiProvider`'s `config` prop does not
 * install its config — and @spudly/ui creates several configs at module scope.
 * The app therefore creates its own config via the DS factory in
 * `src/lib/tamaguiConfig.ts`; this suite renders the real Home-screen buttons
 * under that production config module and asserts the resolved colors are Warm
 * Harvest values. Importing the prebuilt `eciperayTamaguiConfig` (or any other
 * brand's config last) makes these assertions fail.
 */
import {render} from '@testing-library/react-native';
import {Button as DsButton} from '@spudly/ui';
import React from 'react';
import {TamaguiProvider, View} from 'tamagui';

import {appTamaguiConfig} from '../lib/tamaguiConfig';

// Warm Harvest (Eciperay) values from @spudly/ui tokens/themes.
const TERRACOTTA_PRIMARY = '#c2410c';
const ON_PRIMARY = '#fff7ed';
const WARM_CREAM_BACKGROUND = '#faf6f0';
const SECONDARY_LABEL = '#171717';

interface StyledNode {
  props: {style?: Record<string, unknown>};
  parent: StyledNode | null;
}

const styleOf = (node: StyledNode | null): Record<string, unknown> =>
  node?.props.style ?? {};

describe('app Tamagui theme resolution (regression #149)', () => {
  it('resolves Warm Harvest colors for the Home buttons and background', async () => {
    const {getByText, getByTestId} = await render(
      <TamaguiProvider
        config={appTamaguiConfig}
        defaultTheme="light"
      >
        <View
          backgroundColor="$background"
          testID="themed-root"
        >
          <DsButton
            variant="primary"
            accessibilityLabel="Browse Recipes"
            onPress={() => undefined}
          >
            Browse Recipes
          </DsButton>
          <DsButton
            variant="secondary"
            accessibilityLabel="Add a Recipe"
            onPress={() => undefined}
          >
            Add a Recipe
          </DsButton>
        </View>
      </TamaguiProvider>,
    );

    // Screen background: Warm Harvest cream, not Memorize paper.
    expect(styleOf(getByTestId('themed-root') as StyledNode)).toMatchObject({
      backgroundColor: WARM_CREAM_BACKGROUND,
    });

    // Primary button: terracotta fill with the on-primary label color.
    const primaryLabel = getByText('Browse Recipes') as unknown as StyledNode;
    expect(styleOf(primaryLabel)).toMatchObject({color: ON_PRIMARY});
    expect(styleOf(primaryLabel.parent)).toMatchObject({
      backgroundColor: TERRACOTTA_PRIMARY,
    });

    // Secondary button: dark label on the light gray fill (the broken
    // render showed a near-white label here).
    const secondaryLabel = getByText('Add a Recipe') as unknown as StyledNode;
    expect(styleOf(secondaryLabel)).toMatchObject({color: SECONDARY_LABEL});
  });
});
