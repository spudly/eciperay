import {Link} from 'react-router-dom';

export const HomePage = () => (
  <div className="py-8 text-center">
    <h1 className="mb-4 text-3xl font-bold text-gray-900">
      Welcome to Eciperay
    </h1>
    <p className="text-muted mb-8">Your personal recipe collection</p>
    <div className="flex justify-center gap-4">
      <Link
        to="/recipes"
        className="bg-primary rounded-xl px-6 py-3 font-semibold text-white"
      >
        Browse Recipes
      </Link>
      <Link
        to="/add"
        className="rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-700"
      >
        Add Recipe
      </Link>
    </div>
  </div>
);
