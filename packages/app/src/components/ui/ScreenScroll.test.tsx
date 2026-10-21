import {Text} from 'react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {ScreenScroll} from './ScreenScroll';

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

describe('ScreenScroll', () => {
  test('renders content in a scroll view that persists taps with the keyboard open', async () => {
    const {toJSON, getByText} = await renderWithProviders(
      <ScreenScroll>
        <Text>Scrollable content</Text>
      </ScreenScroll>,
    );

    const scrollView = findScrollViewNode(toJSON());
    expect(scrollView).toBeTruthy();
    expect(scrollView?.props?.['keyboardShouldPersistTaps']).toBe('handled');
    expect(getByText('Scrollable content')).toBeTruthy();
  });
});
