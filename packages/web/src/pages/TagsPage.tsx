import {queryKeys} from '@eciperay/client';
import {
  tagColorNameForHex,
  warmHarvestTagColors,
  type TagColorName,
} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {TagsPage as TagsPageView, type TagsPageTag} from '@spudly/ui/pages';

import {eciperay} from '../lib/api.js';
import {TAG_COLOR_NAME_OPTIONS} from '../lib/tagColors.js';

export const TagsPage = () => {
  const [name, setName] = useState('');
  // The form's color is a design-system color NAME (#207); the
  // default is the name for the legacy default hex (#6366f1), and
  // the create call converts back to the stored hex at the boundary.
  const [color, setColor] = useState<TagColorName>('indigo');
  // The inline edit draft (#254), controlled like the create form:
  // starting an edit seeds it from the tag, Save applies it through
  // tags.update(), and Cancel (or a successful save) clears it.
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<TagColorName>('indigo');
  // The edit draft's color starts as the tag's color projected to a
  // palette name — a lossy projection for stored non-palette hexes
  // (unknown hexes fall back to gray). Track whether the user actually
  // picked a swatch: Save sends a color only then, so a rename-only
  // edit preserves the stored color exactly.
  const [editColorTouched, setEditColorTouched] = useState(false);
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

  const updateMutation = useMutation({
    mutationFn: () =>
      eciperay.tags.update(editingTagId!, {
        name: editName,
        ...(editColorTouched ? {color: warmHarvestTagColors[editColor]} : {}),
      }),
    onSuccess: () => {
      setEditingTagId(null);
      setEditColorTouched(false);
      void queryClient.invalidateQueries({queryKey: queryKeys.tags()});
      // Recipe payloads embed their tags (name + color), so a rename
      // must also refresh the recipe lists, recipe details, and the
      // shared-with-me lists or they keep showing the old name/color.
      void queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()});
      void queryClient.invalidateQueries({queryKey: ['recipe']});
      void queryClient.invalidateQueries({queryKey: ['sharedWithMe']});
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      return;
    }
    createMutation.mutate();
  };

  const handleStartEdit = (tag: TagsPageTag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditColorTouched(false);
  };

  const handleEditColorChange = (colorName: TagColorName) => {
    setEditColor(colorName);
    setEditColorTouched(true);
  };

  const handleSaveEdit = () => {
    if (!editingTagId || !editName.trim()) {
      return;
    }
    updateMutation.mutate();
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditColorTouched(false);
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
      editingTagId={editingTagId}
      editName={editName}
      editColor={editColor}
      onStartEdit={handleStartEdit}
      onEditNameChange={setEditName}
      onEditColorChange={handleEditColorChange}
      onSaveEdit={handleSaveEdit}
      onCancelEdit={handleCancelEdit}
      isUpdating={updateMutation.isPending}
    />
  );
};
