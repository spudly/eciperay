import type {BulkImportResult, RecipeExportBundle} from '@eciperay/types';
import {queryKeys, useAnalytics, useAuth} from '@eciperay/client';
import {useQueryClient} from '@tanstack/react-query';
import {useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ProfileAccountDataSection} from '../components/ProfileAccountDataSection.js';
import {ProfileNutritionGoalsSection} from '../components/profile/ProfileNutritionGoalsSection.js';
import {ProfileView} from '../components/profile/ProfileView.js';
import {ProfileTransferSection} from '../components/profile/ProfileTransferSection.js';
import {eciperay} from '../lib/api.js';
import {supabase} from '../lib/supabase.js';

const createComponentShowcasePress = (
  navigate: ReturnType<typeof useNavigate>,
): (() => void) | undefined => {
  /* v8 ignore start -- production-only branch (Vitest runs with DEV=true) */
  if (!import.meta.env.DEV) {
    return undefined;
  }
  /* v8 ignore stop */
  return () => {
    void navigate('/dev/components');
  };
};

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
    <ProfileView
      email={session?.user.email}
      onComponentShowcasePress={createComponentShowcasePress(navigate)}
      onSignOut={() => {
        void handleSignOut();
      }}
      sectionsBeforeFeedback={
        <>
          <ProfileNutritionGoalsSection />
          <ProfileTransferSection
            importing={importing}
            importSummary={importSummary}
            transferError={transferError}
            fileInputRef={fileInputRef}
            onImportClick={() => {
              fileInputRef.current?.click();
            }}
            onImportFile={file => {
              void handleImportFile(file);
            }}
            onExportError={setTransferError}
          />
        </>
      }
      sectionsAfterFeedback={<ProfileAccountDataSection />}
    />
  );
};
