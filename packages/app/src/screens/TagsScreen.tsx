import {queryKeys} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';

import {TagsPage} from '@spudly/ui/pages';

import {TAG_COLOR_OPTIONS} from '../components/ui/ColorPickerField';
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
    <TagsPage
      colorOptions={TAG_COLOR_OPTIONS}
      tags={tags}
      isLoading={isLoading}
      name={name}
      color={color}
      onNameChange={setName}
      onColorChange={setColor}
      onCreate={handleCreate}
      onDelete={id => {
        deleteMutation.mutate(id);
      }}
      isCreating={createMutation.isPending}
    />
  );
};
