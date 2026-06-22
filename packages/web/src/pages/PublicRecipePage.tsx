import {publicRecipeToRecipeDetail, queryKeys} from '@eciperay/client';
import clsx from 'clsx';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {Navigate, useParams, useSearchParams} from 'react-router-dom';

import {IngredientsTab} from '../components/recipe/IngredientsTab.js';
import {InstructionsTab} from '../components/recipe/InstructionsTab.js';
import {PublicRecipeCtas} from '../components/recipe/PublicRecipeCtas.js';
import {PublicRecipeOverview} from '../components/recipe/PublicRecipeOverview.js';
import {PublicPageLayout} from '../components/PublicPageLayout.js';
import {eciperay} from '../lib/api.js';

type Tab = 'overview' | 'ingredients' | 'instructions';

const TABS: {key: Tab; label: string}[] = [
  {key: 'overview', label: 'Overview'},
  {key: 'ingredients', label: 'Ingredients'},
  {key: 'instructions', label: 'Instructions'},
];

const PublicRecipeError = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <PublicPageLayout>
    <div className="rounded-xl bg-white p-8 text-center shadow-sm">
      <h1 className="mb-2 text-xl font-semibold text-gray-900">{title}</h1>
      <p className="text-gray-600">{message}</p>
    </div>
  </PublicPageLayout>
);

export const PublicRecipePage = () => {
  const {id = '', slug = ''} = useParams();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('t') ?? undefined;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [servings, setServings] = useState<number | null>(null);

  const {data, isLoading, error} = useQuery({
    queryKey: queryKeys.publicRecipe(id, slug, shareToken),
    queryFn: () => eciperay.recipes.getPublic(id, {slug, shareToken}),
    enabled: id.length > 0 && slug.length > 0,
    retry: false,
  });

  if (!id || !slug) {
    return (
      <PublicRecipeError
        title="Recipe not found"
        message="This recipe may be private or no longer available."
      />
    );
  }

  if (data?.slugMismatch && data.canonicalSlug !== slug) {
    const nextParams = new URLSearchParams(searchParams);
    const query = nextParams.toString();
    return (
      <Navigate
        to={`/recipe/${id}/${data.canonicalSlug}${query ? `?${query}` : ''}`}
        replace
      />
    );
  }

  if (isLoading) {
    return (
      <PublicPageLayout>
        <div className="flex items-center justify-center py-16">
          <p>Loading…</p>
        </div>
      </PublicPageLayout>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.toLowerCase().includes('denied')) {
      return (
        <PublicRecipeError
          title="Recipe unavailable"
          message="This recipe link is invalid or has expired."
        />
      );
    }
    return (
      <PublicRecipeError
        title="Recipe not found"
        message="This recipe may be private or no longer available."
      />
    );
  }

  if (!data) {
    return (
      <PublicRecipeError
        title="Recipe not found"
        message="This recipe may be private or no longer available."
      />
    );
  }

  const recipe = data.recipe;
  const recipeDetail = publicRecipeToRecipeDetail(recipe);
  const currentServings = servings ?? recipe.servings;
  const scaleFactor = currentServings / recipe.servings;

  return (
    <PublicPageLayout>
      <PublicRecipeCtas
        recipeId={recipe.id}
        shareToken={shareToken}
      />
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex border-b border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={clsx('flex-1 py-3 text-xs font-medium', {
                'border-primary text-primary border-b-2': activeTab === tab.key,
                'text-muted': activeTab !== tab.key,
              })}
              onClick={() => {
                setActiveTab(tab.key);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'overview' ? (
          <PublicRecipeOverview recipe={recipe} />
        ) : null}
        {activeTab === 'ingredients' ? (
          <IngredientsTab
            recipe={recipeDetail}
            scaleFactor={scaleFactor}
            servings={currentServings}
            onServingsChange={setServings}
          />
        ) : null}
        {activeTab === 'instructions' ? (
          <InstructionsTab recipe={recipeDetail} />
        ) : null}
      </div>
    </PublicPageLayout>
  );
};
