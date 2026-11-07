import {eciperayTheme, tokens} from '@spudly/ui';
import {useQuery} from '@tanstack/react-query';
import {useMemo, useState, type CSSProperties} from 'react';

import {eciperay} from '../lib/api.js';
import {downloadRecipeExportBundle} from '../lib/downloadRecipeExport.js';

import {BookLoadingSpinner} from './BookLoadingSpinner.js';

const toggleId = (ids: Set<string>, id: string) => {
  const next = new Set(ids);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

// The bulk-select toolbar and checkbox select list this file used to
// take from the host components/ui wrapper library (themselves
// adapters over design-system widgets, all gone in @spudly/ui 6.x),
// re-expressed in-file with plain elements styled on DS tokens: a
// search input, Select all / Clear selection ghost actions with the
// selected count, and one native checkbox row per item (loading and
// empty states included). API and behavior are unchanged.
const toolbarButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: tokens.typography.fontSize.sm,
  fontFamily: tokens.typography.fontFamily.sans,
  color: eciperayTheme.semantic.primary,
  cursor: 'pointer',
};

type BulkSelectToolbarProps = {
  search: string;
  searchPlaceholder?: string;
  selectedCount: number;
  filteredCount: number;
  disabled?: boolean;
  busy?: boolean;
  onSearchChange: (value: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
};

const BulkSelectToolbar = ({
  search,
  searchPlaceholder = 'Search…',
  selectedCount,
  filteredCount,
  disabled = false,
  busy = false,
  onSearchChange,
  onSelectAll,
  onClearSelection,
}: BulkSelectToolbarProps) => {
  const controlsDisabled = disabled || busy;

  return (
    <div
      style={{display: 'flex', flexDirection: 'column', gap: tokens.spacing[2]}}
    >
      <input
        type="search"
        value={search}
        placeholder={searchPlaceholder}
        disabled={controlsDisabled}
        onChange={event => {
          onSearchChange(event.target.value);
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: 8,
          border: `1px solid ${tokens.colors.gray.gray3}`,
          padding: '8px 12px',
          fontSize: tokens.typography.fontSize.md,
          fontFamily: tokens.typography.fontFamily.sans,
          color: tokens.colors.gray.gray10,
          backgroundColor: eciperayTheme.semantic.surface,
        }}
      />
      <div
        style={{display: 'flex', alignItems: 'center', gap: tokens.spacing[3]}}
      >
        <button
          type="button"
          style={{
            ...toolbarButtonStyle,
            opacity: controlsDisabled || filteredCount === 0 ? 0.5 : 1,
          }}
          disabled={controlsDisabled || filteredCount === 0}
          onClick={onSelectAll}
        >
          Select all
        </button>
        <button
          type="button"
          style={{
            ...toolbarButtonStyle,
            opacity: controlsDisabled || filteredCount === 0 ? 0.5 : 1,
          }}
          disabled={controlsDisabled || filteredCount === 0}
          onClick={onClearSelection}
        >
          Clear selection
        </button>
        {selectedCount > 0 ? (
          <span
            style={{
              fontSize: tokens.typography.fontSize.sm,
              color: tokens.colors.gray.gray6,
            }}
          >
            {selectedCount} selected
          </span>
        ) : null}
      </div>
    </div>
  );
};

type CheckboxSelectListProps = {
  items: {id: string; label: string}[];
  selectedIds: Set<string>;
  disabled?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  onToggle: (id: string) => void;
};

const CheckboxSelectList = ({
  items,
  selectedIds,
  disabled = false,
  isLoading = false,
  emptyMessage = 'No items found.',
  onToggle,
}: CheckboxSelectListProps) => {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: tokens.spacing[4],
        }}
      >
        <BookLoadingSpinner size="sm" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          padding: tokens.spacing[2],
          fontSize: tokens.typography.fontSize.sm,
          color: tokens.colors.gray.gray6,
        }}
      >
        {emptyMessage}
      </p>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing[2],
        padding: tokens.spacing[2],
      }}
    >
      {items.map(item => (
        <label
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[2],
            fontSize: tokens.typography.fontSize.md,
            fontFamily: tokens.typography.fontFamily.sans,
            color: tokens.colors.gray.gray10,
            cursor: disabled ? 'default' : 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(item.id)}
            disabled={disabled}
            onChange={() => {
              onToggle(item.id);
            }}
          />
          {item.label}
        </label>
      ))}
    </div>
  );
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

  const items = useMemo(
    () => filtered.map(recipe => ({id: recipe.id, label: recipe.title})),
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

  const busy = exporting || isLoading;

  return (
    <div>
      <BulkSelectToolbar
        search={search}
        searchPlaceholder="Search recipes to export…"
        selectedCount={selectedIds.size}
        filteredCount={filteredIds.length}
        disabled={disabled}
        busy={busy}
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
        style={{
          marginBottom: tokens.spacing[4],
          overflowY: 'auto',
          borderRadius: 8,
          border: `1px solid ${tokens.colors.gray.gray3}`,
          maxHeight: 256,
        }}
      >
        <CheckboxSelectList
          items={items}
          selectedIds={selectedIds}
          disabled={disabled || exporting}
          isLoading={isLoading}
          emptyMessage="No recipes found."
          onToggle={id => {
            setSelectedIds(previous => toggleId(previous, id));
          }}
        />
      </div>
      <button
        type="button"
        style={{
          borderRadius: 12,
          border: 'none',
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 16,
          paddingRight: 16,
          fontSize: tokens.typography.fontSize.md,
          fontFamily: tokens.typography.fontFamily.sans,
          fontWeight: tokens.typography.fontWeight.semibold,
          backgroundColor: eciperayTheme.semantic.primary,
          color: '#ffffff',
          cursor: 'pointer',
          opacity: disabled || exporting || selectedIds.size === 0 ? 0.5 : 1,
        }}
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
