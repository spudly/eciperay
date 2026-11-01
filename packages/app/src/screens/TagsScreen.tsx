import {queryKeys} from '@eciperay/client';
import {
  tagColorNameForHex,
  warmHarvestTagColors,
  type TagColorName,
} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';

import {TagsPage, type TagsPageTag} from '@spudly/ui/pages';

import {TAG_COLOR_NAME_OPTIONS} from '../lib/tagColors';
import {api} from '../lib/api';

export const TagsScreen = (): React.JSX.Element => {
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
  // Save sends only the fields whose final value differs from the
  // value seeded at edit start (typing a change and restoring it is
  // not a change). The color comparison matters because the draft's
  // color is the stored hex projected to a palette name — a lossy
  // projection for non-palette hexes (unknown hexes fall back to
  // gray): sending an "unchanged" color would rewrite the stored hex
  // with the palette hex. Changed-fields-only also means a save
  // seeded from a not-yet-refetched list can never write a stale
  // field back over a just-saved one.
  const [editOriginalName, setEditOriginalName] = useState('');
  const [editOriginalColor, setEditOriginalColor] =
    useState<TagColorName>('indigo');
  const editNameChanged = editName !== editOriginalName;
  const editColorChanged = editColor !== editOriginalColor;
  const queryClient = useQueryClient();

  const {data: tags = [], isLoading} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => api.tags.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => api.tags.create(name, warmHarvestTagColors[color]),
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

  const updateMutation = useMutation({
    mutationFn: () =>
      api.tags.update(editingTagId!, {
        ...(editNameChanged ? {name: editName} : {}),
        ...(editColorChanged ? {color: warmHarvestTagColors[editColor]} : {}),
      }),
    onSuccess: () => {
      setEditingTagId(null);
      void queryClient.invalidateQueries({queryKey: queryKeys.tags()});
      // Recipe payloads embed their tags (name + color), so a rename
      // must also refresh the recipe lists, recipe details, the
      // shared-with-me lists, and public recipe views or they keep
      // showing the old name/color.
      void queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()});
      void queryClient.invalidateQueries({queryKey: ['recipe']});
      void queryClient.invalidateQueries({queryKey: ['sharedWithMe']});
      void queryClient.invalidateQueries({queryKey: ['publicRecipe']});
      void queryClient.invalidateQueries({queryKey: ['version']});
    },
  });

  const handleCreate = () => {
    /* istanbul ignore next -- add button disabled when name is empty */
    if (!name.trim()) {
      return;
    }
    createMutation.mutate();
  };

  const handleStartEdit = (tag: TagsPageTag) => {
    // While a save is in flight, ignore edit starts: reseeding the
    // draft now would lose it when the pending save's onSuccess
    // clears the editor.
    if (updateMutation.isPending) {
      return;
    }
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditOriginalName(tag.name);
    setEditOriginalColor(tag.color);
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
  };

  const handleSaveEdit = () => {
    /* istanbul ignore next -- save button disabled when idle or name is empty */
    if (!editingTagId || !editName.trim()) {
      return;
    }
    // Nothing changed: saving would send an empty update, so just
    // close the editor like a cancel.
    if (!editNameChanged && !editColorChanged) {
      handleCancelEdit();
      return;
    }
    updateMutation.mutate();
  };

  return (
    <TagsPage
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
      onEditColorChange={setEditColor}
      onSaveEdit={handleSaveEdit}
      onCancelEdit={handleCancelEdit}
      isUpdating={updateMutation.isPending}
    />
  );
};
