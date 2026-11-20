import type {
  RecipeInput,
  RecipeProvenance,
  RecipeVisibility,
  VersionCreatedVia,
} from '@eciperay/types';

export class RecipeProvenanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecipeProvenanceError';
  }
}

const SOURCE_BY_CREATED_VIA: Record<VersionCreatedVia, RecipeProvenance['source']> = {
  manual: 'original',
  tweak_manual: 'original',
  ai: 'ai_generated',
  tweak_ai: 'ai_generated',
  import_url: 'import_url',
  import_image: 'import_cookbook_photo',
  import_text: 'import_text',
  import_bulk: 'import_bulk',
  import_review: 'other',
};

export const deriveRecipeProvenance = (
  createdVia: VersionCreatedVia,
  input: Pick<RecipeInput, 'sourceUrl'>,
  explicitDetail?: string | null,
): RecipeProvenance => {
  const source = SOURCE_BY_CREATED_VIA[createdVia];
  if (source === 'import_url') {
    const detail = input.sourceUrl ?? explicitDetail ?? null;
    if (!detail) {
      throw new RecipeProvenanceError(
        'A URL import must record its source URL as provenance detail',
      );
    }
    let parsed: URL;
    try {
      parsed = new URL(detail);
    } catch {
      throw new RecipeProvenanceError(
        'Provenance detail for a website source must be a valid URL',
      );
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new RecipeProvenanceError(
        'Provenance detail for a website source must be an http(s) URL',
      );
    }
    return {source, detail};
  }
  if (source === 'import_cookbook_photo' || source === 'other') {
    return {source, detail: explicitDetail?.trim() ? explicitDetail.trim() : null};
  }
  return {source, detail: null};
};

export const defaultVisibilityForProvenance = (
  provenance: RecipeProvenance,
): RecipeVisibility => {
  if (provenance.source === 'shared_clone') {
    return 'private';
  }
  if (provenance.source === 'other' && !provenance.detail) {
    return 'private';
  }
  return 'public';
};
