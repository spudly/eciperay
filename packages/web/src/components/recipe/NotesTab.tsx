/* eslint-disable max-lines -- notes list, compose, chat, and draft review */
import {invalidateRecipeQueries, queryKeys} from '@recipoo/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import type {RecipeNote} from '@recipoo/types';

import {recipoo} from '../../lib/api.js';

import {DraftReviewCard} from './DraftReviewCard.js';

const NoteCard = ({note}: {note: RecipeNote}) => (
  <div className="mb-3 rounded-lg border border-yellow-100 bg-yellow-50 p-3">
    <p className="text-gray-800">{note.content}</p>
    <p className="text-muted mt-1 text-xs">
      {new Date(note.createdAt).toLocaleDateString()}
    </p>
  </div>
);

const MessageBubble = ({role, content}: {role: string; content: string}) => (
  <div
    className={`
      mb-3 max-w-[80%]
      ${role === 'user' ? 'ms-auto' : 'me-auto'}
    `}
  >
    <div
      className={`
        rounded-2xl px-4 py-3
        ${
          role === 'user'
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-900'
        }
      `}
    >
      {content}
    </div>
  </div>
);

type Props = {recipeId: string};

export const NotesTab = ({recipeId}: Props) => {
  const [message, setMessage] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const queryClient = useQueryClient();

  const {data: convo} = useQuery({
    queryKey: queryKeys.conversation(recipeId),
    queryFn: () => recipoo.ai.getConversation(recipeId),
  });

  const {data: notes = []} = useQuery({
    queryKey: queryKeys.notes(recipeId),
    queryFn: () => recipoo.notes.list(recipeId),
  });

  const {data: drafts = []} = useQuery({
    queryKey: queryKeys.drafts(recipeId),
    queryFn: () => recipoo.drafts.listPending(recipeId),
  });

  const invalidate = () => invalidateRecipeQueries(queryClient, recipeId);

  const chatMutation = useMutation({
    mutationFn: (text: string) => recipoo.ai.chat(recipeId, text),
    onSuccess: () => {
      void invalidate();
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: () => recipoo.ai.cleanup(recipeId),
    onSuccess: () => {
      void invalidate();
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (content: string) => recipoo.notes.create(recipeId, content),
    onSuccess: () => {
      setNoteContent('');
      void queryClient.invalidateQueries({queryKey: queryKeys.notes(recipeId)});
    },
  });

  const handleSend = () => {
    chatMutation.mutate(message);
    setMessage('');
  };

  const handleCreateNote = () => {
    createNoteMutation.mutate(noteContent);
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 p-4">
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
      </div>
      <div className="border-t border-gray-200 p-3">
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            className="
              flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm
            "
            placeholder="Add a note…"
            value={noteContent}
            onChange={e => {
              setNoteContent(e.target.value);
            }}
          />
          <button
            type="button"
            className="
              rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white
              disabled:opacity-50
            "
            disabled={!noteContent.trim() || createNoteMutation.isPending}
            onClick={handleCreateNote}
          >
            Save Note
          </button>
          <button
            type="button"
            className="
              rounded-lg bg-indigo-100 px-4 py-2 text-sm font-medium
              text-indigo-800
              disabled:opacity-50
            "
            disabled={cleanupMutation.isPending}
            onClick={() => {
              cleanupMutation.mutate();
            }}
          >
            AI Cleanup
          </button>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            className="
              max-h-24 flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-base
            "
            placeholder="Ask AI to tweak this recipe…"
            value={message}
            onChange={e => {
              setMessage(e.target.value);
            }}
          />
          <button
            type="button"
            className="
              bg-primary flex size-10 items-center justify-center rounded-full
              font-bold text-white
              disabled:opacity-50
            "
            disabled={!message.trim() || chatMutation.isPending}
            onClick={handleSend}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
};
