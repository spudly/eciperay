import {
  makeRecipeDetail,
  queryKeys,
  useAuth,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';

import {api} from '../../lib/api';

import {BookLoadingSpinner} from '../ui/BookLoadingSpinner';
import {RecipeCommentItem} from './RecipeCommentItem';

type Props = {recipeId: string; ownerUserId: string};

export const RecipeCommentsSection = ({recipeId, ownerUserId}: Props) => {
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = session?.user.id;
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const commentsQueryKey = queryKeys.recipeComments(recipeId);

  const {data, isLoading} = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => api.recipes.listComments(recipeId),
  });
  const comments = Array.isArray(data) ? data : [];

  const invalidateComments = () => {
    void queryClient.invalidateQueries({queryKey: commentsQueryKey});
  };

  const createMutation = useMutation({
    mutationFn: (body: string) => api.recipes.createComment(recipeId, {body}),
    onSuccess: () => {
      setDraft('');
      invalidateComments();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({commentId, body}: {commentId: string; body: string}) =>
      api.recipes.updateComment(recipeId, commentId, {body}),
    onSuccess: () => {
      setEditingId(null);
      setEditDraft('');
      invalidateComments();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      api.recipes.deleteComment(recipeId, commentId),
    onSuccess: invalidateComments,
  });

  return (
    <View className="mb-4 rounded-xl border border-gray-100 p-4">
      <Text className="mb-3 text-sm font-semibold text-gray-900">Comments</Text>
      {isLoading ? (
        <View className="ui-loading-center mb-3">
          <BookLoadingSpinner size="sm" />
        </View>
      ) : null}
      {!isLoading && comments.length === 0 ? (
        <Text className="mb-3 text-sm text-gray-600">No comments yet</Text>
      ) : null}
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
      {currentUserId ? (
        <View>
          <TextInput
            className="
              mb-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
            "
            multiline
            placeholder="Add a comment"
            value={draft}
            onChangeText={setDraft}
          />
          <TouchableOpacity
            className="bg-primary self-start rounded-lg px-4 py-2"
            disabled={createMutation.isPending || !draft.trim()}
            onPress={() => {
              createMutation.mutate(draft.trim());
            }}
          >
            <Text className="text-sm font-medium text-white">Post comment</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

if (__DEV__) {
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
