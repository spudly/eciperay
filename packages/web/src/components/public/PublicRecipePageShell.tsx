import clsx from 'clsx';
import type {ReactNode} from 'react';
import {Card} from '@spudly/ui';
import {YStack} from 'tamagui';

import {BookLoadingSpinner} from '../ui/BookLoadingSpinner.js';

type PublicRecipeTab = {key: string; label: string};

export type PublicRecipePageShellProps = {
  loading?: boolean;
  tabs: PublicRecipeTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
};

export const PublicRecipePageShell = ({
  loading = false,
  tabs,
  activeTab,
  onTabChange,
  children,
}: PublicRecipePageShellProps) => {
  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical="$8">
        <BookLoadingSpinner size="lg" />
      </YStack>
    );
  }

  return (
    <Card>
      <div className="flex border-be border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={clsx('flex-1 py-3 text-xs font-medium', {
              'border-primary text-primary border-be-2': activeTab === tab.key,
              'text-muted': activeTab !== tab.key,
            })}
            onClick={() => {
              onTabChange(tab.key);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </Card>
  );
};
