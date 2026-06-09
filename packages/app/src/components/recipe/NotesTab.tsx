/* eslint-disable max-lines -- notes list, compose, chat, and draft review */
import {invalidateRecipeQueries, queryKeys} from '@recipoo/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import clsx from 'clsx';
import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {RecipeNote} from '@recipoo/types';

import {api} from '../../lib/api';

import {DraftReviewCard} from './DraftReviewCard';

const NoteCard = ({note}: {note: RecipeNote}) => (
  <View className="mb-3 rounded-lg border border-yellow-100 bg-yellow-50 p-3">
    <Text className="text-gray-800">{note.content}</Text>
    <Text className="text-muted mt-1 text-xs">
      {new Date(note.createdAt).toLocaleDateString()}
    </Text>
  </View>
);

const MessageBubble = ({role, content}: {role: string; content: string}) => (
  <View
    className={clsx('mb-3 max-w-[80%]', {
      'self-end': role === 'user',
      'self-start': role !== 'user',
    })}
  >
    <View
      className={clsx('rounded-2xl px-4 py-3', {
        'bg-primary': role === 'user',
        'bg-gray-100': role !== 'user',
      })}
    >
      <Text
        className={clsx({
          'text-white': role === 'user',
          'text-gray-900': role !== 'user',
        })}
      >
        {content}
      </Text>
    </View>
  </View>
);

export const NotesTab = ({recipeId}: {recipeId: string}) => {
  const [message, setMessage] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const queryClient = useQueryClient();

  const {data: convo} = useQuery({
    queryKey: queryKeys.conversation(recipeId),
    queryFn: () => api.ai.getConversation(recipeId),
  });

  const {data: notes = []} = useQuery({
    queryKey: queryKeys.notes(recipeId),
    queryFn: () => api.notes.list(recipeId),
  });

  const {data: drafts = []} = useQuery({
    queryKey: queryKeys.drafts(recipeId),
    queryFn: () => api.drafts.listPending(recipeId),
  });

  const invalidate = () => invalidateRecipeQueries(queryClient, recipeId);

  const chatMutation = useMutation({
    mutationFn: (text: string) => api.ai.chat(recipeId, text),
    onSuccess: () => {
      void invalidate();
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: () => api.ai.cleanup(recipeId),
    onSuccess: () => {
      void invalidate();
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (content: string) => api.notes.create(recipeId, content),
    onSuccess: () => {
      setNoteContent('');
      void queryClient.invalidateQueries({queryKey: queryKeys.notes(recipeId)});
    },
  });

  const handleSend = () => {
    /* istanbul ignore next -- button disabled when message is empty */
    if (!message.trim()) {
      return;
    }
    chatMutation.mutate(message);
    setMessage('');
  };

  const handleCreateNote = () => {
    /* istanbul ignore next -- button disabled when note is empty */
    if (!noteContent.trim()) {
      return;
    }
    createNoteMutation.mutate(noteContent);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={
        /* istanbul ignore next -- android KeyboardAvoidingView behavior is undefined */
        Platform.OS === 'ios' ? 'padding' : undefined
      }
    >
      <ScrollView className="flex-1 p-4">
        {drafts.map(draft => (
          <DraftReviewCard
            key={draft.id}
            recipeId={recipeId}
            draft={draft}
          />
        ))}
        {notes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
          />
        ))}
        {(convo?.messages ?? []).map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
          />
        ))}
      </ScrollView>
      <View className="border-t border-gray-200 p-3">
        <View className="mb-3 flex-row flex-wrap gap-2">
          <TextInput
            className="
              min-w-[40%] flex-1 rounded-lg border border-gray-200 px-3 py-2
              text-sm
            "
            placeholder="Add a note…"
            value={noteContent}
            onChangeText={setNoteContent}
          />
          <TouchableOpacity
            className="
              rounded-lg bg-gray-800 px-4 py-2
              disabled:opacity-50
            "
            disabled={!noteContent.trim() || createNoteMutation.isPending}
            onPress={handleCreateNote}
          >
            <Text className="text-sm font-medium text-white">Save Note</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="
              rounded-lg bg-indigo-100 px-4 py-2
              disabled:opacity-50
            "
            disabled={cleanupMutation.isPending}
            onPress={() => {
              cleanupMutation.mutate();
            }}
          >
            <Text className="text-sm font-medium text-indigo-800">
              AI Cleanup
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-end gap-2">
          <TextInput
            className="
              max-h-24 flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-base
            "
            placeholder="Ask AI to tweak this recipe…"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity
            className="
              bg-primary size-10 items-center justify-center rounded-full
              disabled:opacity-50
            "
            disabled={!message.trim() || chatMutation.isPending}
            onPress={handleSend}
          >
            <Text className="font-bold text-white">↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
