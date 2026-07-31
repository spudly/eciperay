import type {TabBarProps} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';

export const TabBar = ({tabs, activeTab, onTabChange}: TabBarProps) => (
  <div
    className="ui-tab-bar flex"
    role="tablist"
  >
    {tabs.map(tab => (
      <button
        key={tab.key}
        type="button"
        role="tab"
        aria-selected={activeTab === tab.key}
        className={clsx('ui-tab-bar-item flex-1 py-3 text-xs font-medium', {
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
);

if (import.meta.env.DEV) {
  TabBar.demo = function TabBarDemo() {
    const [activeTab, setActiveTab] = useState('one');

    return (
      <TabBar
        tabs={[
          {key: 'one', label: 'One'},
          {key: 'two', label: 'Two'},
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    );
  };
}
