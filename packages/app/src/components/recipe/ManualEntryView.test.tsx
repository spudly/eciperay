import {Text} from 'react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {ManualEntryView} from './ManualEntryView';

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

describe('ManualEntryView', () => {
  test('renders the recipe form inside a scroll view', async () => {
    const {toJSON, getByText} = await renderWithProviders(
      <ManualEntryView>
        <Text>Recipe form</Text>
      </ManualEntryView>,
    );

    // Regression (eciperay#166): the Add Recipe form used the non-scrollable
    // ScreenContainer, so fields and actions below the fold were unreachable
    // on Android.
    expect(renderedHostTypes(toJSON())).toContain('RCTScrollView');
    expect(getByText('Manual Entry')).toBeTruthy();
    expect(getByText('Recipe form')).toBeTruthy();
  });
});
