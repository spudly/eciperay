import type {BulkImportResult, RecipeExportBundle} from '@eciperay/types';
import {errorMessage, queryKeys, useAnalytics, useAuth} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ProfilePage as ProfilePageView} from '@spudly/ui';

import {LegalLinks} from '../components/LegalLinks.js';
import {ProfileAccessTokensSection} from '../components/profile/ProfileAccessTokensSection.js';
import {ProfileAuthorDisplaySection} from '../components/profile/ProfileAuthorDisplaySection.js';
import {ProfileFeedbackPreference} from '../components/ProfileFeedbackPreference.js';
import {ProfileNutritionGoalsSection} from '../components/profile/ProfileNutritionGoalsSection.js';
import {buildSubscriptionData} from '../components/profile/subscriptionData.js';
import {downloadAccountExportBundle} from '../lib/downloadAccountExport.js';
import {downloadRecipeExportBundle} from '../lib/downloadRecipeExport.js';
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

const formatAccountError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

// Bounded reconciliation after checkout or a portal return. The
// entitlement endpoint reads subscription state that Paddle webhooks
// update separately, so the first fetch after arriving on /profile
// (checkout completion redirects here) — or the single focus refetch
// after returning from the portal tab — can beat the webhook and cache
// the old plan/status. Nothing else would fetch again while the page
// stays open: the 30s staleTime is not a polling interval, and
// refetchOnWindowFocus only fires on another focus event. So for 30s
// after mount, and for 30s after each window focus, refetch on a
// backoff; after that window the section settles and fetches normally.
const RECONCILE_OFFSETS_MS = [3000, 8000, 15_000, 30_000];

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

  // --- Subscription (the page's `subscription` data prop) ---

  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  // Mounting starts a cycle: arriving here from /pay's
  // checkout.completed redirect is a mount.
  const [reconcileCycleStartedAt, setReconcileCycleStartedAt] =
    useState<number>(() => Date.now());

  // Key the cache by the authenticated user: the QueryClient is shared for
  // the life of the tab, so an unscoped key would leak the previous
  // account's plan/status across an account switch. 'anonymous' is only a
  // placeholder until the session resolves — the key changes (and the
  // query refetches) as soon as the real user id arrives.
  const userId = session?.user.id ?? 'anonymous';
  const entitlementQuery = useQuery({
    queryKey: queryKeys.entitlement(userId),
    queryFn: () => eciperay.account.getEntitlement(),
    // Always refetch on focus, ignoring the app-wide 30s staleTime:
    // returning from the billing portal is the moment the plan/status
    // is most likely to have just changed, and a still-fresh cache
    // entry would otherwise keep showing the old plan/renewal text
    // until some unrelated refetch happened.
    refetchOnWindowFocus: 'always',
  });

  // Returning from the portal tab is a window focus on this tab:
  // restart the reconciliation cycle so a webhook that lands after
  // the immediate focus refetch is still picked up without the user
  // having to focus again or reload.
  useEffect(() => {
    const onFocus = () => {
      setReconcileCycleStartedAt(Date.now());
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    const entitlementKey = queryKeys.entitlement(userId);
    const timers = RECONCILE_OFFSETS_MS.map(offset =>
      setTimeout(() => {
        void queryClient.refetchQueries({queryKey: entitlementKey});
      }, offset),
    );
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [reconcileCycleStartedAt, queryClient, userId]);

  // "Check again": ask the server to reconcile with Paddle directly —
  // the self-heal for a webhook delivery that never landed. The server
  // answers with the freshly resolved entitlement, which becomes the
  // cached value. The initiating user id travels as the mutation
  // variable: React Query invokes callbacks with the LATEST options,
  // so closing over the rendered userId would write the response
  // into the NEW account's cache entry if the session switched
  // accounts while the POST was in flight — displaying one account's
  // plan (and Paddle customer id) under another. The variable is
  // fixed at mutate() time, so cancellation and the cache write stay
  // scoped to the account that started the refresh.
  const refreshMutation = useMutation({
    mutationFn: (_initiatingUserId: string) =>
      eciperay.account.refreshEntitlement(),
    onSuccess: async (data, initiatingUserId) => {
      setRefreshError(null);
      // Cancel any in-flight entitlement fetch first: a timer/focus
      // refetch that started before the refresh could otherwise resolve
      // afterwards and overwrite the refreshed entitlement with its
      // older snapshot.
      await queryClient.cancelQueries({
        queryKey: queryKeys.entitlement(initiatingUserId),
      });
      queryClient.setQueryData(queryKeys.entitlement(initiatingUserId), data);
    },
    onError: mutationError => {
      setRefreshError(errorMessage(mutationError));
    },
  });

  const handleRefresh = () => {
    setRefreshError(null);
    refreshMutation.mutate(userId);
  };

  // The "Checking…" hint tracks real work only — an entitlement fetch or
  // the explicit refresh — never a blind timer, so it cannot look stuck
  // for 30s on every mount/focus while nothing is actually being checked.
  const isReconciling =
    entitlementQuery.isFetching || refreshMutation.isPending;

  const portalMutation = useMutation({
    mutationFn: () => eciperay.billing.createPortalLink(),
  });

  const handleManage = () => {
    setPortalError(null);
    setPortalUrl(null);
    // Open the tab synchronously, inside the click's user activation:
    // waiting for the portal-link request first lets the activation
    // expire, and the browser then blocks the tab as a popup.
    const portalWindow = window.open('', '_blank');
    // Drive the tab from the mutateAsync promise, not per-call mutate
    // callbacks: React Query only invokes those while the component is
    // still subscribed, so leaving /profile mid-request would skip them
    // and strand the pre-opened tab blank. The promise handlers close
    // over the local tab handle and run even after unmount; the
    // setState calls below are no-ops once unmounted, which is fine —
    // only the tab handling has to survive navigation.
    void portalMutation
      .mutateAsync()
      .then(({url}) => {
        if (portalWindow && !portalWindow.closed) {
          portalWindow.opener = null;
          portalWindow.location.href = url;
        } else {
          // The pre-opened tab was blocked or closed — fall back to a
          // clickable link so the click still has a visible result.
          setPortalUrl(url);
        }
      })
      .catch((mutationError: unknown) => {
        portalWindow?.close();
        setPortalError(errorMessage(mutationError));
      });
  };

  const subscription = buildSubscriptionData({
    entitlement: entitlementQuery.data ?? null,
    isLoading: entitlementQuery.isLoading,
    isOpeningPortal: portalMutation.isPending,
    onManage: handleManage,
    portalUrl,
    isReconciling,
    onRefresh: handleRefresh,
    isRefreshing: refreshMutation.isPending,
    error:
      portalError ??
      refreshError ??
      (entitlementQuery.error ? errorMessage(entitlementQuery.error) : null),
  });

  // --- Account data (the page's `accountData` data prop) ---

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

  // --- Transfer recipes (the page's `transfer` data prop) ---

  // The export picker's state: the host filters the recipe list by the
  // search text, holds the selection, and runs the export — the picker
  // view-model the transfer data prop carries.
  const [exportSearch, setExportSearch] = useState('');
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [exporting, setExporting] = useState(false);

  const {data: exportRecipes = [], isLoading: exportRecipesLoading} = useQuery({
    queryKey: ['recipes', 'export-all'],
    queryFn: () => eciperay.recipes.listAll(),
  });

  const filteredExportRecipes = useMemo(
    () =>
      exportRecipes.filter(recipe =>
        recipe.title.toLowerCase().includes(exportSearch.toLowerCase()),
      ),
    [exportRecipes, exportSearch],
  );

  const filteredExportIds = useMemo(
    () => filteredExportRecipes.map(recipe => recipe.id),
    [filteredExportRecipes],
  );

  const exportItems = useMemo(
    () =>
      filteredExportRecipes.map(recipe => ({
        id: recipe.id,
        label: recipe.title,
      })),
    [filteredExportRecipes],
  );

  const handleExportRecipes = async () => {
    setExporting(true);
    setTransferError(null);
    try {
      const bundle = await eciperay.recipes.exportRecipes([
        ...selectedExportIds,
      ]);
      downloadRecipeExportBundle(bundle);
    } catch (error) {
      setTransferError(
        error instanceof Error ? error.message : 'Export failed',
      );
    } finally {
      setExporting(false);
    }
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
    <>
      <ProfilePageView
        email={session?.user.email ?? null}
        onSignOut={() => {
          void handleSignOut();
        }}
        subscription={subscription}
        sectionsBeforeFeedback={
          <>
            <ProfileNutritionGoalsSection />
            <ProfileAuthorDisplaySection />
            <ProfileAccessTokensSection />
          </>
        }
        feedbackPreference={<ProfileFeedbackPreference />}
        transfer={{
          hint: 'Select recipes to export as JSON, then import them in another environment. Images and tags are included.',
          exportPicker: {
            search: exportSearch,
            onSearchChange: setExportSearch,
            searchPlaceholder: 'Search recipes to export…',
            items: exportItems,
            selectedIds: [...selectedExportIds],
            onToggle: id => {
              setSelectedExportIds(previous => {
                const next = new Set(previous);
                if (next.has(id)) {
                  next.delete(id);
                } else {
                  next.add(id);
                }
                return next;
              });
            },
            onSelectAll: () => {
              setSelectedExportIds(previous => {
                const next = new Set(previous);
                for (const id of filteredExportIds) {
                  next.add(id);
                }
                return next;
              });
            },
            onClearSelection: () => {
              setSelectedExportIds(previous => {
                const next = new Set(previous);
                for (const id of filteredExportIds) {
                  next.delete(id);
                }
                return next;
              });
            },
            disabled: importing,
            loading: exportRecipesLoading,
            emptyMessage: 'No recipes found.',
            exporting,
            onExport: () => {
              void handleExportRecipes();
            },
            exportLabel: `Export selected (${selectedExportIds.size})`,
          },
          onImportPress: () => {
            fileInputRef.current?.click();
          },
          importPending: importing,
          importSummary,
          error: transferError,
        }}
        accountData={{
          description:
            'Download a copy of your profile, recipes, share grants, ratings, and comments, or permanently delete your account.',
          onExportData: () => {
            void handleExportAccount();
          },
          exportPending: exportingAccount,
          exportPendingLabel: 'Preparing export…',
          onDeleteAccount: () => {
            void handleDeleteAccount();
          },
          deletePending: deletingAccount,
          deletePendingLabel: 'Deleting account…',
          error: accountError,
        }}
        legalLinks={<LegalLinks variant="stacked" />}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{display: 'none'}}
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImportFile(file);
          }
        }}
      />
    </>
  );
};
