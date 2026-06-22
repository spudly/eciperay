import type {BulkImportResult, RecipeExportBundle} from '@eciperay/types';
import {queryKeys, useAnalytics, useAuth} from '@eciperay/client';
import {useQueryClient} from '@tanstack/react-query';
import {useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {LegalLinks} from '../components/LegalLinks.js';
import {ProfileAccountDataSection} from '../components/ProfileAccountDataSection.js';
import {RecipeExportPicker} from '../components/RecipeExportPicker.js';
import {eciperay} from '../lib/api.js';
import {supabase} from '../lib/supabase.js';

const parseImportFile = async (file: File): Promise<RecipeExportBundle> => {
  const text = await file.text();
  const parsed = JSON.parse(text) as RecipeExportBundle;
  if (!Array.isArray(parsed.recipes) || parsed.recipes.length === 0) {
    throw new Error('File must contain a non-empty recipes array');
  }
  return parsed;
};

const formatImportSummary = (result: BulkImportResult) => {
  const parts = [`Imported ${result.created.length} recipe(s).`];
  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} failed.`);
  }
  return parts.join(' ');
};

export const ProfilePage = () => {
  const {session} = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const analytics = useAnalytics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    void navigate('/login');
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setTransferError(null);
    setImportSummary(null);
    try {
      const bundle = await parseImportFile(file);
      const result = await eciperay.import.importBulk(bundle);
      for (const recipe of result.created) {
        analytics.track('recipe_imported', {
          recipe_id: recipe.id,
          source: 'bulk',
        });
      }
      await queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()});
      setImportSummary(formatImportSummary(result));
      if (result.errors.length > 0) {
        const details = result.errors
          .map(error => `${error.title}: ${error.message}`)
          .join('; ');
        setTransferError(details);
      }
    } catch (error) {
      setTransferError(
        error instanceof Error ? error.message : 'Import failed',
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <h1 className="mbe-6 text-2xl font-bold text-gray-900">Profile</h1>
      <p className="mbe-6 text-gray-700">{session?.user.email}</p>

      <section className="mbe-8 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mbe-1 text-lg font-semibold text-gray-900">
          Transfer recipes
        </h2>
        <p className="text-muted mbe-4 text-sm">
          Select recipes to export as JSON, then import them in another
          environment. Images and tags are included.
        </p>
        <RecipeExportPicker
          disabled={importing}
          onError={setTransferError}
        />
        <div className="mbs-6 border-bs pbs-4 border-gray-100">
          <button
            type="button"
            className="
              rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm
              font-medium text-gray-900
              disabled:opacity-50
            "
            disabled={importing}
            onClick={() => {
              fileInputRef.current?.click();
            }}
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
                void handleImportFile(file);
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
      </section>

      <ProfileAccountDataSection />

      <section className="mbe-8 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mbe-3 text-lg font-semibold text-gray-900">Legal</h2>
        <LegalLinks variant="stacked" />
      </section>

      <button
        type="button"
        className="
          rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600
        "
        onClick={() => {
          void handleSignOut();
        }}
      >
        Sign Out
      </button>
    </div>
  );
};
