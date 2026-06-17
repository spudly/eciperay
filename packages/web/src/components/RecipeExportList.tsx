import type {RecipeDetail} from '@eciperay/types';

type RecipeExportListProps = {
  recipes: RecipeDetail[];
  selectedIds: Set<string>;
  disabled: boolean;
  exporting: boolean;
  isLoading: boolean;
  onToggle: (id: string) => void;
};

export const RecipeExportList = ({
  recipes,
  selectedIds,
  disabled,
  exporting,
  isLoading,
  onToggle,
}: RecipeExportListProps) => {
  if (isLoading) {
    return <p className="text-muted p-4 text-sm">Loading recipes…</p>;
  }
  if (recipes.length === 0) {
    return <p className="text-muted p-4 text-sm">No recipes found.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {recipes.map(recipe => (
        <li key={recipe.id}>
          <label
            className="
              flex cursor-pointer items-center gap-3 px-3 py-2
              hover:bg-gray-50
            "
          >
            <input
              type="checkbox"
              className="size-4 rounded border-gray-300"
              checked={selectedIds.has(recipe.id)}
              disabled={disabled || exporting}
              onChange={() => {
                onToggle(recipe.id);
              }}
            />
            <span className="min-w-0 flex-1 text-sm text-gray-900">
              {recipe.title}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
};
