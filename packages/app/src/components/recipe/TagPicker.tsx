import {queryKeys} from '@recipoo/client';
import {useQuery} from '@tanstack/react-query';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {api} from '../../lib/api';

type Props = {selectedIds: string[]; onChange: (ids: string[]) => void};

export const TagPicker = ({selectedIds, onChange}: Props) => {
  const {data: tags = [], isLoading} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => api.tags.list(),
  });

  if (isLoading) {
    return <Text className="text-muted text-sm">Loading tags…</Text>;
  }

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(t => t !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {tags.map(tag => {
        const selected = selectedIds.includes(tag.id);
        return (
          <TouchableOpacity
            key={tag.id}
            className={`
              rounded-full px-3 py-1
              ${selected ? 'border-primary border-2' : ''}
            `}
            style={{backgroundColor: `${tag.color}22`}}
            onPress={() => {
              toggle(tag.id);
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{color: tag.color}}
            >
              {tag.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
