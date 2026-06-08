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
  <View className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 mb-3">
    <Text className="text-gray-800">{note.content}</Text>
    <Text className="text-xs text-muted mt-1">
      {new Date(note.createdAt).toLocaleDateString()}
    </Text>
  </View>
);

const MessageBubble = ({role, content}: {role: string; content: string}) => (
  <View
    className={`mb-3 max-w-4/5 ${role === 'user' ? 'self-end' : 'self-start'}`}
  >
    <View
      className={`px-4 py-3 rounded-2xl ${role === 'user' ? 'bg-primary' : 'bg-gray-100'}`}
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
      <View className="flex-row items-end p-3 border-t border-gray-200 gap-2">
        <TextInput
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-base max-h-24"
          placeholder="Ask AI to tweak this recipe…"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity
          className="bg-primary rounded-full w-10 h-10 items-center justify-center"
          onPress={() => void handleSend()}
          disabled={!message.trim()}
        >
          <Text className="text-white font-bold">↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
