type RecipeExportToolbarProps = {
  search: string;
  selectedCount: number;
  filteredCount: number;
  disabled: boolean;
  exporting: boolean;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
};

export const RecipeExportToolbar = ({
  search,
  selectedCount,
  filteredCount,
  disabled,
  exporting,
  isLoading,
  onSearchChange,
  onSelectAll,
  onClearSelection,
}: RecipeExportToolbarProps) => (
  <>
    <input
      className="
        mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
      "
      placeholder="Search recipes to export…"
      value={search}
      disabled={disabled || exporting || isLoading}
      onChange={event => {
        onSearchChange(event.target.value);
      }}
    />
    <div className="mb-3 flex flex-wrap gap-3 text-sm">
      <button
        type="button"
        className="
          text-primary font-medium
          disabled:opacity-50
        "
        disabled={disabled || exporting || isLoading || filteredCount === 0}
        onClick={onSelectAll}
      >
        Select all
      </button>
      <button
        type="button"
        className="
          font-medium text-gray-600
          disabled:opacity-50
        "
        disabled={disabled || exporting || isLoading || filteredCount === 0}
        onClick={onClearSelection}
      >
        Clear selection
      </button>
      {selectedCount > 0 ? (
        <span className="text-muted">{selectedCount} selected</span>
      ) : null}
    </div>
  </>
);
