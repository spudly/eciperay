import {queryKeys} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {TagsPage as TagsPageView} from '@spudly/ui/pages';

import {eciperay} from '../lib/api.js';
import {TAG_COLOR_OPTIONS} from '../lib/tagColors.js';

export const TagsPage = () => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const queryClient = useQueryClient();

  const {data: tags = [], isLoading} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => eciperay.tags.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => eciperay.tags.create(name, color),
    onSuccess: () => {
      setName('');
      void queryClient.invalidateQueries({queryKey: queryKeys.tags()});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eciperay.tags.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.tags()});
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      return;
    }
    createMutation.mutate();
  };

  return (
    <TagsPageView
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
