import type {ShoppingListViewProps} from '@eciperay/client';

import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {EmptyMessage} from '../ui/EmptyMessage.js';
import {PageTitle} from '../ui/PageTitle.js';
import {ScreenScroll} from '../ui/ScreenScroll.js';

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
      <ul className="divide-y divide-gray-100">
        {lines.map(line => {
          const checked = checkedKeys.has(line.key);
          const qty =
            line.quantity === null
              ? ''
              : `${line.quantity}${line.unit ? ` ${line.unit}` : ''}`;
          return (
            <li key={line.key}>
              <label className="flex cursor-pointer items-start gap-3 py-3">
                <input
                  type="checkbox"
                  className="mbs-1 rounded-sm border-gray-300 block-4 inline-4"
                  checked={checked}
                  onChange={() => {
                    onToggleChecked(line.key);
                  }}
                />
                <span
                  className={
                    checked ? 'text-muted line-through' : 'text-gray-900'
                  }
                >
                  <span className="font-medium">{line.name}</span>
                  {qty ? (
                    <span className="text-muted text-sm"> · {qty}</span>
                  ) : null}
                  {line.isOptional ? (
                    <span className="text-muted text-sm"> · optional</span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    )}
  </ScreenScroll>
);
