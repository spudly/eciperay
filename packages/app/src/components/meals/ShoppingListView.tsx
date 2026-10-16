import type {ShoppingListViewProps} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import {Pressable, Text, View} from 'react-native';

import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {EmptyMessage} from '../ui/EmptyMessage';
import {PageTitle} from '../ui/PageTitle';
import {ScreenScroll} from '../ui/ScreenScroll';

/* Pressable rows keep the RN Pressable with token-valued styles (the
   IngredientsTab pressable precedent): flex-row items-start gap-3,
   border-be gray-100 (ramp step 2), py-3. */
const rowStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: tokens.spacing[3],
  borderBottomWidth: 1,
  borderBottomColor: tokens.colors.gray.gray2,
  paddingVertical: tokens.spacing[3],
} as const;

/* The checkbox glyph's mbs-0.5 offset: a 2px alignment nudge with no step on
   the DS spacing scale — geometry only, no visual value. */
const glyphStyle = {marginTop: 2} as const;

export const ShoppingListView = ({
  lines,
  isLoading,
  checkedKeys,
  onToggleChecked,
}: ShoppingListViewProps) => (
  <ScreenScroll>
    <PageTitle spacing="section">Shopping list</PageTitle>
    {isLoading ? (
      <InlineLoadingIndicator loading />
    ) : lines.length === 0 ? (
      <EmptyMessage>No items on this list.</EmptyMessage>
    ) : (
      <View>
        {lines.map(line => {
          const checked = checkedKeys.has(line.key);
          const qty =
            line.quantity === null
              ? ''
              : `${line.quantity}${line.unit ? ` ${line.unit}` : ''}`;
          return (
            <Pressable
              key={line.key}
              style={rowStyle}
              onPress={() => {
                onToggleChecked(line.key);
              }}
            >
              <Text style={glyphStyle}>{checked ? '☑' : '☐'}</Text>
              <DsText
                flex={1}
                color={checked ? '$textMuted' : tokens.colors.gray.gray10}
                textDecorationLine={checked ? 'line-through' : 'none'}
              >
                <DsText fontWeight={tokens.typography.fontWeight.medium}>
                  {line.name}
                </DsText>
                {qty ? (
                  <DsText
                    color="$textMuted"
                    fontSize={tokens.typography.fontSize.sm}
                  >
                    {' '}
                    · {qty}
                  </DsText>
                ) : null}
                {line.isOptional ? (
                  <DsText
                    color="$textMuted"
                    fontSize={tokens.typography.fontSize.sm}
                  >
                    {' '}
                    · optional
                  </DsText>
                ) : null}
              </DsText>
            </Pressable>
          );
        })}
      </View>
    )}
  </ScreenScroll>
);
