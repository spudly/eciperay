/**
 * Regression test for the ScreenContainer patch-package patch (issue #528,
 * follow-up to PR #527 / issue #526).
 *
 * `patches/@spudly+ui+9.2.1.patch` patches the installed `@spudly/ui` dist so
 * the native `list` variant of `ScreenContainer` gets `flex: 1` — without it
 * the Android Recipes list renders empty. This suite renders the installed
 * (postinstall-patched) component under the React Native Jest preset (`isWeb`
 * is false there) and pins that behavior:
 *
 * - `variant="list"` renders with `flex: 1`;
 * - An explicitly passed `flex` prop still wins over the patch default (the patch
 *   spreads its props before `...rest`);
 * - A non-`list` variant does not get the forced flex.
 *
 * This test fails if the patch is removed while eciperay is on `@spudly/ui`
 * 9.2.1 — that failure is the regression it guards. Delete this file together
 * with the patch when eciperay adopts a published `@spudly/ui` carrying the
 * durable design-system fix (9.3.0+).
 *
 * `ScreenContainer` is not exported from the `@spudly/ui` root (the design
 * system exports pages only), so the test imports the installed dist file
 * directly — the exact file the patch rewrites.
 */
import {render} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';
import {TamaguiProvider} from 'tamagui';

// eslint-disable-next-line import/no-relative-packages -- see header: the component is not on the package's export surface; the patched dist file is the subject under test.
import {ScreenContainer} from '../../../../../node_modules/@spudly/ui/dist/widgets/ScreenContainer.js';
import {appTamaguiConfig} from '../../lib/tamaguiConfig';

type StyleValue = Record<string, unknown> | StyleValue[] | undefined;

const flattenStyle = (style: StyleValue): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(entry => flattenStyle(entry)));
  }
  return style ?? {};
};

const renderContainer = async (
  props: React.ComponentProps<typeof ScreenContainer>,
) =>
  await render(
    <TamaguiProvider
      config={appTamaguiConfig}
      defaultTheme="light"
    >
      <ScreenContainer
        testID="screen-container"
        {...props}
      >
        <Text>content</Text>
      </ScreenContainer>
    </TamaguiProvider>,
  );

describe('ScreenContainer patch (@spudly/ui 9.2.1, #528)', () => {
  test('list variant renders with flex: 1 on native', async () => {
    const {getByTestId} = await renderContainer({variant: 'list'});

    expect(flattenStyle(getByTestId('screen-container').props.style).flex).toBe(
      1,
    );
  });

  test('an explicit flex prop overrides the patch default', async () => {
    const {getByTestId} = await renderContainer({variant: 'list', flex: 2});

    expect(flattenStyle(getByTestId('screen-container').props.style).flex).toBe(
      2,
    );
  });

  test('a non-list variant does not get the forced flex', async () => {
    const {getByTestId} = await renderContainer({variant: 'padded'});

    expect(
      flattenStyle(getByTestId('screen-container').props.style).flex,
    ).toBeUndefined();
  });
});
