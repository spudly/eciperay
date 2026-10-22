import type {RefObject} from 'react';
import {SectionCard} from '@spudly/ui';

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
    <p className="text-muted mbe-4 text-sm">
      Select recipes to export as JSON, then import them in another environment.
      Images and tags are included.
    </p>
    <RecipeExportPicker
      disabled={importing}
      onError={onExportError}
    />
    <div className="mbs-6 border-bs border-gray-100 pbs-4">
      <button
        type="button"
        className="
          rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm
          font-medium text-gray-900
          disabled:opacity-50
        "
        disabled={importing}
        onClick={onImportClick}
      >
        {importing ? 'Importing…' : 'Import recipes'}
      </button>
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
    </div>
    {importSummary ? (
      <p className="mbs-4 text-sm text-green-700">{importSummary}</p>
    ) : null}
    {transferError ? (
      <p className="mbs-4 text-sm text-red-600">{transferError}</p>
    ) : null}
  </SectionCard>
);
