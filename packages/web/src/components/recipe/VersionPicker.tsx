import {queryKeys} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import type {RecipeVersionSummary} from '@eciperay/types';

import {eciperay} from '../../lib/api.js';

const ROLE_LABELS: Record<RecipeVersionSummary['derivedRole'], string> = {
  active: 'Active',
  archived: 'Archived',
  draft: 'Draft',
  candidate: 'Candidate',
};

type Props = {
  recipeId: string;
  versions: RecipeVersionSummary[];
  selectedVersionId: string;
  onSelect: (versionId: string) => void;
};

export const VersionPicker = ({
  recipeId,
  versions,
  selectedVersionId,
  onSelect,
}: Props) => {
  const {data: list = versions} = useQuery({
    queryKey: queryKeys.versions(recipeId),
    queryFn: () => eciperay.versions.list(recipeId),
    initialData: versions.length > 0 ? versions : undefined,
  });

  if (list.length <= 1) {
    return (
      <p className="text-muted text-xs">
        Version {list[0]?.versionNumber ?? 1}
      </p>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Version</span>
      <select
        className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
        value={selectedVersionId}
        onChange={e => {
          onSelect(e.target.value);
        }}
      >
        {[...list]
          .sort((a, b) => b.versionNumber - a.versionNumber)
          .map(version => (
            <option
              key={version.id}
              value={version.id}
            >
              v{version.versionNumber} — {ROLE_LABELS[version.derivedRole]}
              {version.changeSummary ? `: ${version.changeSummary}` : ''}
            </option>
          ))}
      </select>
    </label>
  );
};
