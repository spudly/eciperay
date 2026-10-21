/* eslint-disable max-lines -- recipe comments with create/edit/delete flows */
import {
  makeRecipeDetail,
  queryKeys,
  useAuth,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {YStack} from 'tamagui';

import {eciperay} from '../../lib/api.js';
import {BookLoadingSpinner} from '../ui/BookLoadingSpinner.js';

import {RecipeCommentItem} from './RecipeCommentItem.js';

type Props = {
  recipeId: string;
  ownerUserId?: string;
  shareToken?: string;
  publicList?: boolean;
};

export const RecipeCommentsSection = ({
  recipeId,
  ownerUserId,
  shareToken,
  publicList = false,
}: Props) => {
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = session?.user.id;
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const commentsQueryKey = queryKeys.recipeComments(recipeId, shareToken);

  const {data, isLoading} = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () =>
      publicList
        ? eciperay.recipes.listPublicComments(recipeId, {shareToken})
        : eciperay.recipes.listComments(recipeId),
  });
  const comments = Array.isArray(data) ? data : [];

  const invalidateComments = () => {
    void queryClient.invalidateQueries({queryKey: commentsQueryKey});
  };

  const createMutation = useMutation({
    mutationFn: (body: string) =>
      eciperay.recipes.createComment(recipeId, {body}),
    onSuccess: () => {
      setDraft('');
      invalidateComments();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({commentId, body}: {commentId: string; body: string}) =>
      eciperay.recipes.updateComment(recipeId, commentId, {body}),
    onSuccess: () => {
      setEditingId(null);
      setEditDraft('');
      invalidateComments();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      eciperay.recipes.deleteComment(recipeId, commentId),
    onSuccess: invalidateComments,
  });

  return (
    <div className="mbe-4 rounded-xl border border-gray-100 p-4">
      <h3 className="mbe-3 text-sm font-semibold text-gray-900">Comments</h3>
      {isLoading ? (
        <YStack
          alignItems="center"
          justifyContent="center"
          marginBottom="$3"
        >
          <BookLoadingSpinner size="sm" />
        </YStack>
      ) : null}
      {!isLoading && comments.length === 0 ? (
        <p className="mbe-3 text-sm text-gray-600">No comments yet</p>
      ) : null}
      <ul className="mbe-4 space-y-3">
        {comments.map(comment => (
          <RecipeCommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            ownerUserId={ownerUserId}
            isEditing={editingId === comment.id}
            editDraft={editDraft}
            isUpdatePending={updateMutation.isPending}
            isDeletePending={deleteMutation.isPending}
            onEditDraftChange={setEditDraft}
            onStartEdit={() => {
              setEditingId(comment.id);
              setEditDraft(comment.body);
            }}
            onCancelEdit={() => {
              setEditingId(null);
              setEditDraft('');
            }}
            onSaveEdit={() => {
              updateMutation.mutate({
                commentId: comment.id,
                body: editDraft.trim(),
              });
            }}
            onDelete={() => {
              deleteMutation.mutate(comment.id);
            }}
          />
        ))}
      </ul>
      {currentUserId ? (
        <form
          className="space-y-2"
          onSubmit={event => {
            event.preventDefault();
            createMutation.mutate(draft.trim());
          }}
        >
          <textarea
            className="
              rounded-lg border border-gray-300 bg-field px-3 py-2 text-sm inline-full
            "
            placeholder="Add a comment"
            value={draft}
            onChange={event => {
              setDraft(event.target.value);
            }}
          />
          <button
            type="submit"
            className="
              bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white
            "
            disabled={createMutation.isPending || !draft.trim()}
          >
            Post comment
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-600">
          Sign in to join the conversation
        </p>
      )}
    </div>
  );
};

if (import.meta.env.DEV) {
  const recipeCommentsSectionDemo: ShowcaseDemoRenderer = ({Frame}) => {
    const recipe = makeRecipeDetail();
    return (
      <Frame>
        <RecipeCommentsSection
          recipeId={recipe.id}
          ownerUserId={recipe.userId}
        />
      </Frame>
    );
  };
  RecipeCommentsSection.demo = recipeCommentsSectionDemo;
}
