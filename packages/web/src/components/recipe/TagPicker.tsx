import {queryKeys} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';
import {useMemo} from 'react';

import {eciperay} from '../../lib/api.js';
import {ToggleChipGroup} from '../ui/ToggleChipGroup.js';

type Props = {selectedIds: string[]; onChange: (ids: string[]) => void};

export const TagPicker = ({selectedIds, onChange}: Props) => {
  const {data: tags = [], isLoading} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => eciperay.tags.list(),
  });

  const options = useMemo(
    () => tags.map(tag => ({id: tag.id, label: tag.name, color: tag.color})),
    [tags],
  );

  if (isLoading) {
    return <p className="text-muted text-sm">Loading tags…</p>;
  }

  return (
    <ToggleChipGroup
      multi
      options={options}
      selectedIds={new Set(selectedIds)}
      onChange={value => {
        if (Array.isArray(value)) {
          onChange(value);
        }
      }}
    />
  );
};

if (import.meta.env.DEV) {
  TagPicker.demo = function TagPickerDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    return (
      <Frame>
        <TagPicker
          selectedIds={['tag-1']}
          onChange={() => {
            void 0;
          }}
        />
      </Frame>
    );
  };
}
