import {invalidateRecipeQueries} from '@eciperay/client';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {eciperay} from '../lib/api.js';

const PROMPT_PLACEHOLDER =
  'e.g. make it vegetarian, reduce sugar, add more spice';

export const TweakAiPage = () => {
  const {recipeId = ''} = useParams();
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const tweakMutation = useMutation({
    mutationFn: (text: string) => eciperay.versions.tweakWithAi(recipeId, text),
    onSuccess: async result => {
      await invalidateRecipeQueries(queryClient, recipeId, result.versionId);
      void navigate(`/recipes/${recipeId}/versions/${result.versionId}/edit`);
    },
    onError: error_ => {
      setError(error_ instanceof Error ? error_.message : 'AI tweak failed');
    },
  });

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);
    tweakMutation.mutate(prompt.trim());
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Tweak with AI</h1>
      <p className="text-muted mb-6 text-sm">
        Describe how you want to change this recipe. AI will create a new draft
        version for you to review.
      </p>
      <form
        onSubmit={handleSubmit}
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
        <div className="flex gap-3">
          <button
            type="button"
            className="
              rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium
              text-gray-700
            "
            onClick={() => {
              void navigate(`/recipes/${recipeId}`);
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={tweakMutation.isPending || prompt.trim().length === 0}
            className="
              bg-primary flex-1 rounded-lg py-3 font-semibold text-white
              disabled:opacity-50
            "
          >
            {tweakMutation.isPending ? 'Generating…' : 'Create draft'}
          </button>
        </div>
      </form>
    </div>
  );
};
