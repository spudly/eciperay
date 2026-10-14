import type {TabBarProps} from '@eciperay/client';
import {Tabs} from '@spudly/ui';
import {useState} from 'react';

export const TabBar = ({tabs, activeTab, onTabChange}: TabBarProps) => (
  <Tabs
    tabs={tabs.map(tab => ({value: tab.key, label: tab.label}))}
    value={activeTab}
    onValueChange={onTabChange}
  />
);

if (__DEV__) {
  const TabBarDemo = () => {
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

  TabBar.demo = () => <TabBarDemo />;
}
