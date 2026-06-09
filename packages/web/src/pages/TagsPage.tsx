import {queryKeys} from '@recipoo/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {recipoo} from '../lib/api.js';

export const TagsPage = () => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const queryClient = useQueryClient();

  const {data: tags = [], isLoading} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => recipoo.tags.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => recipoo.tags.create(name, color),
    onSuccess: () => {
      setName('');
      void queryClient.invalidateQueries({queryKey: queryKeys.tags()});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recipoo.tags.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.tags()});
    },
  });

  const handleCreate = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    createMutation.mutate();
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Tags</h1>
      <form
        onSubmit={handleCreate}
        className="mb-6 flex gap-2"
      >
        <input
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2"
          placeholder="Tag name"
          value={name}
          onChange={e => {
            setName(e.target.value);
          }}
        />
        <input
          type="color"
          className="h-10 w-12 cursor-pointer rounded border border-gray-300"
          value={color}
          onChange={e => {
            setColor(e.target.value);
          }}
        />
        <button
          type="submit"
          disabled={!name.trim() || createMutation.isPending}
          className="
            bg-primary rounded-lg px-4 py-2 font-medium text-white
            disabled:opacity-50
          "
        >
          Add
        </button>
      </form>
      {isLoading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="space-y-2">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="
                flex items-center justify-between rounded-lg bg-white p-3
                shadow-sm
              "
            >
              <span
                className="rounded-full px-3 py-1 text-sm font-medium"
                style={{backgroundColor: `${tag.color}22`, color: tag.color}}
              >
                {tag.name}
              </span>
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={() => {
                  deleteMutation.mutate(tag.id);
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
