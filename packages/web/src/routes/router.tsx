import {createBrowserRouter} from 'react-router-dom';

import {AppShell} from '../components/AppShell.js';
import {AuthGuard} from '../components/AuthGuard.js';
import {RootLayout} from '../components/RootLayout.js';
import {AddPage} from '../pages/AddPage.js';
import {CookingModePage} from '../pages/CookingModePage.js';
import {EditRecipePage} from '../pages/EditRecipePage.js';
import {EditVersionPage} from '../pages/EditVersionPage.js';
import {TweakAiPage} from '../pages/TweakAiPage.js';
import {DiscoverPage} from '../pages/DiscoverPage.js';
import {ForgotPasswordPage} from '../pages/auth/ForgotPasswordPage.js';
import {GenerateAiPage} from '../pages/GenerateAiPage.js';
import {HomeEntry} from '../pages/HomeEntry.js';
import {ImportImagePage} from '../pages/ImportImagePage.js';
import {ImportReviewPage} from '../pages/ImportReviewPage.js';
import {ImportTextPage} from '../pages/ImportTextPage.js';
import {ImportUrlPage} from '../pages/ImportUrlPage.js';
import {LoginPage} from '../pages/auth/LoginPage.js';
import {ManualEntryPage} from '../pages/ManualEntryPage.js';
import {PrivacyPolicyPage} from '../pages/PrivacyPolicyPage.js';
import {ProfilePage} from '../pages/ProfilePage.js';
import {PublicRecipePage} from '../pages/PublicRecipePage.js';
import {RecipeDetailPage} from '../pages/RecipeDetailPage.js';
import {RecipesPage} from '../pages/RecipesPage.js';
import {SharedWithMePage} from '../pages/SharedWithMePage.js';
import {ResetPasswordPage} from '../pages/auth/ResetPasswordPage.js';
import {SignupPage} from '../pages/auth/SignupPage.js';
import {MealCookingModePage} from '../pages/MealCookingModePage.js';
import {MealDetailPage} from '../pages/MealDetailPage.js';
import {MealEditPage} from '../pages/MealEditPage.js';
import {MealPlanDetailPage} from '../pages/MealPlanDetailPage.js';
import {MealPlanEditPage} from '../pages/MealPlanEditPage.js';
import {PayPage} from '../pages/PayPage.js';
import {MealsHubPage} from '../pages/MealsHubPage.js';
import {ShoppingListPage} from '../pages/ShoppingListPage.js';
import {TagsPage} from '../pages/TagsPage.js';
import {TermsOfServicePage} from '../pages/TermsOfServicePage.js';

const authenticatedAppRoutes = [
  {path: '/recipes', element: <RecipesPage />},
  {path: '/meals', element: <MealsHubPage />},
  {path: '/meals/new', element: <MealEditPage />},
  {path: '/meals/:mealId', element: <MealDetailPage />},
  {path: '/meals/:mealId/edit', element: <MealEditPage />},
  {path: '/meals/:mealId/cook', element: <MealCookingModePage />},
  {path: '/meal-plans/new', element: <MealPlanEditPage />},
  {path: '/meal-plans/:planId', element: <MealPlanDetailPage />},
  {path: '/meal-plans/:planId/edit', element: <MealPlanEditPage />},
  {path: '/meal-plans/:planId/shopping-list', element: <ShoppingListPage />},
  {path: '/shared-with-me', element: <SharedWithMePage />},
  {path: '/recipes/:recipeId', element: <RecipeDetailPage />},
  {path: '/recipes/:recipeId/edit', element: <EditRecipePage />},
  {
    path: '/recipes/:recipeId/versions/:versionId/edit',
    element: <EditVersionPage />,
  },
  {path: '/recipes/:recipeId/tweak-ai', element: <TweakAiPage />},
  {path: '/recipes/:recipeId/cook', element: <CookingModePage />},
  {path: '/add', element: <AddPage />},
  {path: '/add/manual', element: <ManualEntryPage />},
  {path: '/add/url', element: <ImportUrlPage />},
  {path: '/add/image', element: <ImportImagePage />},
  {path: '/add/text', element: <ImportTextPage />},
  {path: '/add/ai', element: <GenerateAiPage />},
  {path: '/import/review/:recipeId', element: <ImportReviewPage />},
  {path: '/profile', element: <ProfilePage />},
  {path: '/tags', element: <TagsPage />},
  ...(import.meta.env.DEV
    ? [
        {
          path: '/dev/components',
          lazy: async () => {
            const {ComponentShowcasePage} =
              await import('../pages/ComponentShowcasePage.js');
            return {Component: ComponentShowcasePage};
          },
        },
      ]
    : []),
];

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {path: '/login', element: <LoginPage />},
      {path: '/signup', element: <SignupPage />},
      {path: '/forgot-password', element: <ForgotPasswordPage />},
      {path: '/reset-password', element: <ResetPasswordPage />},
      {path: '/pay', element: <PayPage />},
      {path: '/privacy', element: <PrivacyPolicyPage />},
      {path: '/terms', element: <TermsOfServicePage />},
      {path: '/recipe/:id/:slug', element: <PublicRecipePage />},
      {path: '/discover', element: <DiscoverPage />},
      {path: '/', element: <HomeEntry />},
      {
        element: <AuthGuard />,
        children: [{element: <AppShell />, children: authenticatedAppRoutes}],
      },
    ],
  },
]);
