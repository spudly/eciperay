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
import {useQuery, useQueryClient} from '@tanstack/react-query';
import type {AiConversation, RecipeNote} from '@recipoo/types';

import {apiFetch} from '../../lib/api';

type ChatResult = {assistantMessage: string; draft: object};

const fetchNotes = (id: string) =>
  apiFetch<RecipeNote[]>(`/recipes/${id}/notes`);
const fetchConversation = (id: string) =>
  apiFetch<AiConversation>(`/recipes/${id}/ai/conversation`);

const sendChat = (recipeId: string, message: string) =>
  apiFetch<ChatResult>(`/recipes/${recipeId}/ai/chat`, {
    method: 'POST',
    body: JSON.stringify({message}),
  });

const NoteCard = ({note}: {note: RecipeNote}) => (
  <View className="mb-3 rounded-lg border border-yellow-100 bg-yellow-50 p-3">
    <Text className="text-gray-800">{note.content}</Text>
    <Text className="mt-1 text-xs text-muted">
      {new Date(note.createdAt).toLocaleDateString()}
    </Text>
  </View>
);

const MessageBubble = ({role, content}: {role: string; content: string}) => (
  <View
    className={`
      mb-3 max-w-[80%]
      ${role === 'user' ? 'self-end' : 'self-start'}
    `}
  >
    <View
      className={`
        rounded-2xl px-4 py-3
        ${role === 'user' ? 'bg-primary' : `bg-gray-100`}
      `}
    >
      <Text className={role === 'user' ? 'text-white' : 'text-gray-900'}>
        {content}
      </Text>
    </View>
  </View>
);

export const NotesTab = ({recipeId}: {recipeId: string}) => {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const {data: convo} = useQuery({
    queryKey: ['conversation', recipeId],
    queryFn: () => fetchConversation(recipeId),
  });
  const {data: notes = []} = useQuery({
    queryKey: ['notes', recipeId],
    queryFn: () => fetchNotes(recipeId),
  });

  const handleSend = async () => {
    /* istanbul ignore next -- button is disabled when message is empty; this guard is a safety net */
    if (!message.trim()) {
      return;
    }
    await sendChat(recipeId, message);
    setMessage('');
    await queryClient.invalidateQueries({queryKey: ['conversation', recipeId]});
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={
        /* istanbul ignore next */ Platform.OS === 'ios' ? 'padding' : undefined
      }
    >
      <ScrollView className="flex-1 p-4">
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
      <View className="flex-row items-end gap-2 border-t border-gray-200 p-3">
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
            size-10 items-center justify-center rounded-full bg-primary
          "
          onPress={() => void handleSend()}
          disabled={!message.trim()}
        >
          <Text className="font-bold text-white">↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
