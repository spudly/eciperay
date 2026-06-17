import {useQuery} from '@tanstack/react-query';
import {useMemo, useState} from 'react';

import {eciperay} from '../lib/api.js';
import {downloadRecipeExportBundle} from '../lib/downloadRecipeExport.js';

import {RecipeExportList} from './RecipeExportList.js';
import {RecipeExportToolbar} from './RecipeExportToolbar.js';

const toggleId = (ids: Set<string>, id: string) => {
  const next = new Set(ids);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

export const RecipeExportPicker = ({
  disabled = false,
  onError,
}: {
  disabled?: boolean;
  onError: (message: string | null) => void;
}) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [exporting, setExporting] = useState(false);

  const {data: recipes = [], isLoading} = useQuery({
    queryKey: ['recipes', 'export-all'],
    queryFn: () => eciperay.recipes.listAll(),
  });

  const filtered = useMemo(
    () =>
      recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [recipes, search],
  );

  const filteredIds = useMemo(
    () => filtered.map(recipe => recipe.id),
    [filtered],
  );

  const handleExport = async () => {
    setExporting(true);
    onError(null);
    try {
      const bundle = await eciperay.recipes.exportRecipes([...selectedIds]);
      downloadRecipeExportBundle(bundle);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <RecipeExportToolbar
        search={search}
        selectedCount={selectedIds.size}
        filteredCount={filteredIds.length}
        disabled={disabled}
        exporting={exporting}
        isLoading={isLoading}
        onSearchChange={setSearch}
        onSelectAll={() => {
          setSelectedIds(previous => {
            const next = new Set(previous);
            for (const id of filteredIds) {
              next.add(id);
            }
            return next;
          });
        }}
        onClearSelection={() => {
          setSelectedIds(previous => {
            const next = new Set(previous);
            for (const id of filteredIds) {
              next.delete(id);
            }
            return next;
          });
        }}
      />
      <div
        className="
          mb-4 max-h-64 overflow-y-auto rounded-lg border border-gray-200
        "
      >
        <RecipeExportList
          recipes={filtered}
          selectedIds={selectedIds}
          disabled={disabled}
          exporting={exporting}
          isLoading={isLoading}
          onToggle={id => {
            setSelectedIds(previous => toggleId(previous, id));
          }}
        />
      </div>
      <button
        type="button"
        className="
          bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white
          disabled:opacity-50
        "
        disabled={disabled || exporting || selectedIds.size === 0}
        onClick={() => {
          void handleExport();
        }}
      >
        {exporting ? 'Exporting…' : `Export selected (${selectedIds.size})`}
      </button>
    </div>
  );
};
