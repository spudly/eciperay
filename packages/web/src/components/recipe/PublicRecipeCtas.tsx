import {MOBILE_APP_INSTALL_URL} from '@eciperay/client';
import {Link} from 'react-router-dom';

type Props = {recipeId: string};

export const PublicRecipeCtas = ({recipeId}: Props) => {
  const cloneHref = `/signup?cloneRecipe=${encodeURIComponent(recipeId)}`;

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
