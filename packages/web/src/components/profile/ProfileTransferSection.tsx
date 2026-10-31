import type {RefObject} from 'react';
import {Button, SectionCard, Text as DSText, tokens} from '@spudly/ui';

import {RecipeExportPicker} from '../RecipeExportPicker.js';

export type ProfileTransferSectionProps = {
  importing: boolean;
  importSummary: string | null;
  transferError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onImportClick: () => void;
  onImportFile: (file: File) => void;
  onExportError: (message: string | null) => void;
};

export const ProfileTransferSection = ({
  importing,
  importSummary,
  transferError,
  fileInputRef,
  onImportClick,
  onImportFile,
  onExportError,
}: ProfileTransferSectionProps) => (
  <SectionCard
    title="Transfer recipes"
    marginBottom="$8"
  >
    <DSText variant="hint">
      Select recipes to export as JSON, then import them in another environment.
      Images and tags are included.
    </DSText>
    <RecipeExportPicker
      disabled={importing}
      onError={onExportError}
    />
    <Button
      variant="secondary"
      disabled={importing}
      onPress={onImportClick}
    >
      {importing ? 'Importing…' : 'Import recipes'}
    </Button>
    <input
      ref={fileInputRef}
      type="file"
      accept="application/json,.json"
      className="hidden"
      onChange={event => {
        const file = event.target.files?.[0];
        if (file) {
          onImportFile(file);
        }
      }}
    />
    {importSummary ? (
      <DSText color={tokens.colors.success.success8}>{importSummary}</DSText>
    ) : null}
    {transferError ? <DSText variant="error">{transferError}</DSText> : null}
  </SectionCard>
);
