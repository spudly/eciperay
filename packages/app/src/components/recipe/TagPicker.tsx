import {queryKeys, type ShowcaseDemoRenderer} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import {useMemo} from 'react';
import {View} from 'react-native';

import {api} from '../../lib/api';
import {BookLoadingSpinner} from '../ui/BookLoadingSpinner';
import {ToggleChipGroup} from '../ui/ToggleChipGroup';

type Props = {selectedIds: string[]; onChange: (ids: string[]) => void};

export const TagPicker = ({selectedIds, onChange}: Props) => {
  const {data: tags = [], isLoading} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => api.tags.list(),
  });

  const options = useMemo(
    () => tags.map(tag => ({id: tag.id, label: tag.name, color: tag.color})),
    [tags],
  );

  if (isLoading) {
    return (
      <View>
        <BookLoadingSpinner size="sm" />
      </View>
    );
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

if (__DEV__) {
  const tagPickerDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <TagPicker
        selectedIds={['tag-1']}
        onChange={() => {
          void 0;
        }}
      />
    </Frame>
  );
  TagPicker.demo = tagPickerDemo;
}
