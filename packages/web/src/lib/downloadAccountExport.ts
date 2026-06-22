import type {AccountExportBundle} from '@eciperay/types';

export const downloadAccountExportBundle = (bundle: AccountExportBundle) => {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `eciperay-account-${bundle.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
