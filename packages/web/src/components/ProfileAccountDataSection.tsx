import {Button, SectionCard, Text as DSText} from '@spudly/ui';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {downloadAccountExportBundle} from '../lib/downloadAccountExport.js';
import {eciperay} from '../lib/api.js';
import {supabase} from '../lib/supabase.js';

const formatAccountError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * DS ProfilePage slot content (B7 C10, design-system#130): the account
 * export/delete logic stays web-side; the section renders on design system
 * widgets.
 */
export const ProfileAccountDataSection = () => {
  const navigate = useNavigate();
  const [exportingAccount, setExportingAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const handleExportAccount = async () => {
    setExportingAccount(true);
    setAccountError(null);
    try {
      const bundle = await eciperay.account.exportData();
      downloadAccountExportBundle(bundle);
    } catch (error) {
      setAccountError(formatAccountError(error, 'Account export failed'));
    } finally {
      setExportingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Delete your account and all associated data? This cannot be undone.',
    );
    if (!confirmed) {
      return;
    }
    setDeletingAccount(true);
    setAccountError(null);
    try {
      await eciperay.account.deleteAccount();
      await supabase.auth.signOut();
      void navigate('/login');
    } catch (error) {
      setAccountError(formatAccountError(error, 'Account deletion failed'));
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <SectionCard
      title="Your data"
      variant="elevated"
      marginBottom="$8"
    >
      <DSText variant="hint">
        Download a copy of your profile, recipes, share grants, ratings, and
        comments, or permanently delete your account.
      </DSText>
      <div>
        <Button
          variant="secondary"
          disabled={exportingAccount || deletingAccount}
          onPress={() => {
            void handleExportAccount();
          }}
        >
          {exportingAccount ? 'Preparing export…' : 'Download my data'}
        </Button>
        <Button
          variant="danger"
          disabled={exportingAccount || deletingAccount}
          onPress={() => {
            void handleDeleteAccount();
          }}
        >
          {deletingAccount ? 'Deleting account…' : 'Delete account'}
        </Button>
      </div>
      {accountError ? <DSText variant="error">{accountError}</DSText> : null}
    </SectionCard>
  );
};
