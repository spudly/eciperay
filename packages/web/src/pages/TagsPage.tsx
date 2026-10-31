import {queryKeys} from '@eciperay/client';
import {
  tagColorNameForHex,
  warmHarvestTagColors,
  type TagColorName,
} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {TagsPage as TagsPageView} from '@spudly/ui/pages';

import {eciperay} from '../lib/api.js';
import {TAG_COLOR_NAME_OPTIONS} from '../lib/tagColors.js';

export const TagsPage = () => {
  const [name, setName] = useState('');
  // The form's color is a design-system color NAME (#207); the
  // default is the name for the legacy default hex (#6366f1), and
  // the create call converts back to the stored hex at the boundary.
  const [color, setColor] = useState<TagColorName>('indigo');
  const queryClient = useQueryClient();

  const {data: tags = [], isLoading} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => eciperay.tags.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => eciperay.tags.create(name, warmHarvestTagColors[color]),
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
      colorOptions={TAG_COLOR_NAME_OPTIONS}
      tags={tags.map(tag => ({...tag, color: tagColorNameForHex(tag.color)}))}
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
