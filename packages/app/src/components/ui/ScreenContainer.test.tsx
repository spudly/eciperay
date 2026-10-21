import {Text} from 'react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {ScreenContainer} from './ScreenContainer';

/** Host types rendered for a tree, via the RNTL JSON snapshot. */
const renderedHostTypes = (json: unknown): string[] => {
  const types: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') {
      return;
    }
    const {type, children} = node as {type?: string; children?: unknown[]};
    if (type) {
      types.push(type);
    }
    (children ?? []).forEach(walk);
  };
  walk(json);
  return types;
};

describe('ScreenContainer', () => {
  // Regression (eciperay#166): the content variants used to render a fixed
  // shell, so on Android any content below the fold (Profile sections, the
  // recipe form's submit button) was unreachable. They must scroll.
  test.each(['default', 'padded', 'white'] as const)(
    'renders the %s variant inside a scroll view',
    async variant => {
      const {toJSON, getByText} = await renderWithProviders(
        <ScreenContainer variant={variant}>
          <Text>Long page content</Text>
        </ScreenContainer>,
      );

      expect(renderedHostTypes(toJSON())).toContain('RCTScrollView');
      expect(getByText('Long page content')).toBeTruthy();
    },
  );

  test('keeps the list variant non-scrollable for FlatList screens', async () => {
    const {toJSON, getByText} = await renderWithProviders(
      <ScreenContainer variant="list">
        <Text>List screen</Text>
      </ScreenContainer>,
    );

    expect(renderedHostTypes(toJSON())).not.toContain('RCTScrollView');
    expect(getByText('List screen')).toBeTruthy();
  });
});
