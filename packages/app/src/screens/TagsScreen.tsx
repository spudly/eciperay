import {queryKeys} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';

import {api} from '../lib/api';

export const TagsScreen = (): React.JSX.Element => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const queryClient = useQueryClient();

  const {data: tags = [], isLoading} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => api.tags.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => api.tags.create(name, color),
    onSuccess: () => {
      setName('');
      void queryClient.invalidateQueries({queryKey: queryKeys.tags()});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.tags.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.tags()});
    },
  });

  const handleCreate = () => {
    /* istanbul ignore next -- add button disabled when name is empty */
    if (!name.trim()) {
      return;
    }
    createMutation.mutate();
  };

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Tags</Text>
      <View className="mb-6 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2"
          placeholder="Tag name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          className="w-24 rounded-lg border border-gray-300 p-2"
          placeholder="#6366f1"
          value={color}
          onChangeText={setColor}
          autoCapitalize="none"
        />
        <TouchableOpacity
          className="
            bg-primary items-center justify-center rounded-lg px-4
            disabled:opacity-50
          "
          disabled={!name.trim() || createMutation.isPending}
          onPress={handleCreate}
        >
          <Text className="font-medium text-white">Add</Text>
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <Text className="text-muted">Loading…</Text>
      ) : (
        tags.map(tag => (
          <View
            key={tag.id}
            className="
              mb-2 flex-row items-center justify-between rounded-lg bg-white p-3
              shadow-sm
            "
          >
            <View
              className="rounded-full px-3 py-1"
              style={{backgroundColor: `${tag.color}22`}}
            >
              <Text
                className="text-sm font-medium"
                style={{color: tag.color}}
              >
                {tag.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                deleteMutation.mutate(tag.id);
              }}
            >
              <Text className="text-sm text-red-600">Delete</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
};
