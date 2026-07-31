import type {TabBarProps} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';
import {ScrollView, Text, TouchableOpacity} from 'react-native';

export const TabBar = ({tabs, activeTab, onTabChange}: TabBarProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    className="ui-tab-bar"
    contentContainerClassName="flex-row"
  >
    {tabs.map(tab => (
      <TouchableOpacity
        key={tab.key}
        className={clsx('ui-tab-bar-item', {
          'border-primary border-b-2': activeTab === tab.key,
        })}
        onPress={() => {
          onTabChange(tab.key);
        }}
      >
        <Text
          className={clsx('text-xs font-medium', {
            'text-primary': activeTab === tab.key,
            'text-muted': activeTab !== tab.key,
          })}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
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
