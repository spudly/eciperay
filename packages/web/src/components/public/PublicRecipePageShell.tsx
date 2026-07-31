import clsx from 'clsx';
import type {ReactNode} from 'react';

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
      <div className="ui-loading-center py-16">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="ui-public-recipe-card">
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={clsx('flex-1 py-3 text-xs font-medium', {
              'border-primary text-primary border-b-2': activeTab === tab.key,
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
    </div>
  );
};
