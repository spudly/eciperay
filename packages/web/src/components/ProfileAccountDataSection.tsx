import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {downloadAccountExportBundle} from '../lib/downloadAccountExport.js';
import {eciperay} from '../lib/api.js';
import {supabase} from '../lib/supabase.js';

const formatAccountError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

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
    <section className="mbe-8 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mbe-1 text-lg font-semibold text-gray-900">Your data</h2>
      <p className="text-muted mbe-4 text-sm">
        Download a copy of your profile, recipes, share grants, ratings, and
        comments, or permanently delete your account.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="
            rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm
            font-medium text-gray-900
            disabled:opacity-50
          "
          disabled={exportingAccount || deletingAccount}
          onClick={() => {
            void handleExportAccount();
          }}
        >
          {exportingAccount ? 'Preparing export…' : 'Download my data'}
        </button>
        <button
          type="button"
          className="
            rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600
            disabled:opacity-50
          "
          disabled={exportingAccount || deletingAccount}
          onClick={() => {
            void handleDeleteAccount();
          }}
        >
          {deletingAccount ? 'Deleting account…' : 'Delete account'}
        </button>
      </div>
      {accountError ? (
        <p className="mbs-4 text-sm text-red-600">{accountError}</p>
      ) : null}
    </section>
  );
};
