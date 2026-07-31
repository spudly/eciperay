import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
  queryKeys,
  truncateChangeSummary,
} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import type {RecipeVersionSummary} from '@eciperay/types';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';
import {useMemo} from 'react';

import {eciperay} from '../../lib/api.js';
import {SelectField} from '../ui/SelectField.js';

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

  const options = useMemo(
    () =>
      [...list]
        .sort((a, b) => b.versionNumber - a.versionNumber)
        .map(version => {
          const summary = version.changeSummary
            ? `: ${truncateChangeSummary(version.changeSummary)}`
            : '';
          return {
            value: version.id,
            label: `v${version.versionNumber} — ${ROLE_LABELS[version.derivedRole]}${summary}`,
          };
        }),
    [list],
  );

  if (list.length <= 1) {
    return (
      <p className="text-muted text-xs">
        Version {list[0]?.versionNumber ?? 1}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <SelectField
        value={selectedVersionId}
        options={options}
        onChange={onSelect}
      />
    </div>
  );
};

if (import.meta.env.DEV) {
  VersionPicker.demo = function VersionPickerDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    const mockRecipe = makeRecipeDetail();

    return (
      <Frame>
        <VersionPicker
          recipeId={mockRecipe.id}
          versions={[
            makeRecipeVersionSummary(),
            makeRecipeVersionSummary({
              id: 'version-uuid-2',
              versionNumber: 2,
              derivedRole: 'candidate',
            }),
          ]}
          selectedVersionId={mockRecipe.versionId}
          onSelect={() => {
            void 0;
          }}
        />
      </Frame>
    );
  };
}
