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

type JsonNode = {
  type?: string;
  props?: Record<string, unknown>;
  children?: unknown[];
};

/** The rendered RCTScrollView node (with its props), if any. */
const findScrollViewNode = (json: unknown): JsonNode | undefined => {
  if (!json || typeof json !== 'object') {
    return undefined;
  }
  const node = json as JsonNode;
  if (node.type === 'RCTScrollView') {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findScrollViewNode(child);
    if (found) {
      return found;
    }
  }
  return undefined;
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
      // Form screens need taps next to a focused input to register instead
      // of only dismissing the keyboard (eciperay#169 review).
      expect(
        findScrollViewNode(toJSON())?.props?.['keyboardShouldPersistTaps'],
      ).toBe('handled');
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
