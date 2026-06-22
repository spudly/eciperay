import {
  invalidateRecipeQueries,
  MOBILE_APP_INSTALL_URL,
  SAVE_RECIPE_COPY_LABEL,
  useAuth,
} from '@eciperay/client';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Link, useNavigate} from 'react-router-dom';

import {eciperay} from '../../lib/api.js';

type Props = {recipeId: string; shareToken?: string};

export const PublicRecipeCtas = ({recipeId, shareToken}: Props) => {
  const {session, isLoading} = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cloneHref = `/signup?cloneRecipe=${encodeURIComponent(recipeId)}`;

  const cloneMutation = useMutation({
    mutationFn: () => eciperay.recipes.clone(recipeId, {shareToken}),
    onSuccess: data => {
      void invalidateRecipeQueries(queryClient, data.id, data.versionId);
      void navigate(`/recipes/${data.id}`);
    },
  });

  if (!isLoading && session) {
    return (
      <div
        className="
          mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white
          p-4 shadow-sm
          sm:flex-row
        "
      >
        <button
          type="button"
          className="
            bg-primary flex-1 rounded-xl py-3 text-sm font-semibold text-white
            disabled:opacity-60
          "
          disabled={cloneMutation.isPending}
          onClick={() => {
            cloneMutation.mutate();
          }}
        >
          {cloneMutation.isPending ? 'Saving…' : SAVE_RECIPE_COPY_LABEL}
        </button>
        <a
          href={MOBILE_APP_INSTALL_URL}
          className="
            flex-1 rounded-xl border border-gray-200 py-3 text-center text-sm
            font-semibold text-gray-800
          "
        >
          Get the mobile app
        </a>
      </div>
    );
  }

  return (
    <div
      className="
        mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4
        shadow-sm
        sm:flex-row
      "
    >
      <Link
        to="/signup"
        className="
          bg-primary flex-1 rounded-xl py-3 text-center text-sm font-semibold
          text-white
        "
      >
        Sign up free
      </Link>
      <Link
        to={cloneHref}
        className="
          flex-1 rounded-xl border border-gray-200 py-3 text-center text-sm
          font-semibold text-gray-800
        "
      >
        Clone this recipe
      </Link>
      <a
        href={MOBILE_APP_INSTALL_URL}
        className="
          flex-1 rounded-xl border border-gray-200 py-3 text-center text-sm
          font-semibold text-gray-800
        "
      >
        Get the mobile app
      </a>
    </div>
  );
};
