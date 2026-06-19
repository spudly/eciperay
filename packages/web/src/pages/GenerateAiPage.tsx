import {useAnalytics} from '@eciperay/client';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {eciperay} from '../lib/api.js';

const PROMPT_PLACEHOLDER =
  'e.g. quick weeknight vegetarian pasta for 4, under 30 minutes';

export const GenerateAiPage = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const analytics = useAnalytics();

  const handleGenerate = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const recipe = await eciperay.import.importAi(prompt.trim());
      analytics.track('recipe_imported', {recipe_id: recipe.id, source: 'ai'});
      void navigate(`/import/review/${recipe.id}`);
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : 'Recipe generation failed',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Generate with AI
      </h1>
      <p className="text-muted mb-6 text-sm">
        Describe the recipe you want and AI will draft it for you to review.
        Generation may take several seconds.
      </p>
      <form
        onSubmit={e => {
          void handleGenerate(e);
        }}
        className="space-y-4"
      >
        <textarea
          required
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
          placeholder={PROMPT_PLACEHOLDER}
          value={prompt}
          onChange={e => {
            setPrompt(e.target.value);
          }}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || prompt.trim().length === 0}
          className="
            bg-primary w-full rounded-lg py-3 font-semibold text-white
            disabled:opacity-50
          "
        >
          {loading ? 'Generating…' : 'Generate recipe'}
        </button>
      </form>
    </div>
  );
};
