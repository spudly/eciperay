import {queryKeys} from '@recipoo/client';
import clsx from 'clsx';
import {useQuery} from '@tanstack/react-query';

import {recipoo} from '../../lib/api.js';

type Props = {selectedIds: string[]; onChange: (ids: string[]) => void};

export const TagPicker = ({selectedIds, onChange}: Props) => {
  const {data: tags = [], isLoading} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => recipoo.tags.list(),
  });

  if (isLoading) {
    return <p className="text-muted text-sm">Loading tags…</p>;
  }

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(t => t !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => {
        const selected = selectedIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            className={clsx('rounded-full px-3 py-1 text-xs font-medium', {
              'ring-primary ring-2': selected,
            })}
            style={{backgroundColor: `${tag.color}22`, color: tag.color}}
            onClick={() => {
              toggle(tag.id);
            }}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
};
