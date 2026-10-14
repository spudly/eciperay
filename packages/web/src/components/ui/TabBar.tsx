import type {TabBarProps} from '@eciperay/client';
import {Tabs as DSTabs} from '@spudly/ui';
import {useState} from 'react';

export const TabBar = ({tabs, activeTab, onTabChange}: TabBarProps) => (
  <DSTabs
    tabs={tabs.map(tab => ({value: tab.key, label: tab.label}))}
    value={activeTab}
    onValueChange={onTabChange}
  />
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
