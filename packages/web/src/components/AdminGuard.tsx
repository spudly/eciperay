import {queryKeys, useAuth} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import {Navigate, Outlet} from 'react-router-dom';
import {Button, Text, YStack} from 'tamagui';

import {eciperay} from '../lib/api.js';

import {ScreenLoadingGate} from './ScreenLoadingGate.js';

/**
 * Route guard for admin-only pages (#621): a non-admin who navigates directly
 * to an admin route is redirected to /recipes, matching the treatment other
 * unauthorized routes get. The server is the source of truth — isAdmin comes
 * from GET /auth/me, never a client-side comparison.
 */
export const AdminGuard = () => {
  const {session} = useAuth();
  const {
    data: me,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    // Account-scoped key (#650 review): a shared QueryClient outlives
    // an account switch, so an unscoped key could render the previous
    // account's isAdmin.
    queryKey: queryKeys.currentUser(session?.user?.id ?? 'anonymous'),
    queryFn: () => eciperay.auth.me(),
  });

  if (isLoading) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  // A failed /auth/me is not a non-admin verdict (#650 review): show an
  // explicit error with a retry instead of redirecting an admin away as
  // if the server had confirmed they are not an admin.
  if (isError) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap="$3"
        padding="$4"
      >
        <Text>Something went wrong loading your profile.</Text>
        <Button
          onPress={() => {
            void refetch();
          }}
        >
          Try again
        </Button>
      </YStack>
    );
  }

  if (!me?.isAdmin) {
    return (
      <Navigate
        to="/recipes"
        replace
      />
    );
  }

  return <Outlet />;
};
