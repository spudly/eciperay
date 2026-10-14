import type {ImportTextViewProps} from '@eciperay/client';
import {useRef, useState} from 'react';

import {ErrorText} from '../ui/ErrorText.js';
import {FormScreenLayout} from '../ui/FormScreenLayout.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';

const getEditorPlainText = (el: HTMLDivElement | null): string => {
  /* c8 ignore next 3 -- editor ref is mounted before any handler calls this helper */
  if (!el) {
    return '';
  }
  const text = el.textContent;
  return (text && text.length > 0 ? text : el.innerText || '').trim();
};

const isEditorEmpty = (el: HTMLDivElement | null): boolean =>
  getEditorPlainText(el) === '';

const getEditorContent = (el: HTMLDivElement | null): string => {
  /* c8 ignore next 3 -- editor ref is mounted before import runs */
  if (!el) {
    return '';
  }
  if (isEditorEmpty(el)) {
    return '';
  }
  return el.innerHTML.trim();
};

export const ImportTextView = ({
  loading,
  error,
  onSubmit,
}: ImportTextViewProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const syncEmpty = () => {
    setIsEmpty(isEditorEmpty(editorRef.current));
  };

  return (
    <FormScreenLayout
      title="Import from text"
      description="Paste a recipe from Word, a web page, or any rich text source."
    >
      <form
        style={{display: "flex", flexDirection: "column", gap: 16}}
        onSubmit={e => {
          e.preventDefault();
          const text = getEditorContent(editorRef.current);
          if (!text) {
            return;
          }
          onSubmit(text);
        }}
      >
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-label="Recipe text"
          aria-multiline="true"
          data-placeholder="Paste your recipe here…"
          className="
            focus:ring-primary/30
            rounded-lg border border-gray-300 px-4 py-3 text-base outline-none
            inline-full min-block-48
            empty:before:pointer-events-none empty:before:text-gray-400
            empty:before:content-[attr(data-placeholder)]
            focus:ring-2
          "
          onInput={syncEmpty}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PrimaryButton
          label="Import"
          loading={loading}
          loadingLabel="Importing…"
          disabled={isEmpty}
          onPress={() => {
            const text = getEditorContent(editorRef.current);
            if (text) {
              onSubmit(text);
            }
          }}
        />
      </form>
    </FormScreenLayout>
  );
};

if (import.meta.env.DEV) {
  ImportTextView.demo = function ImportTextViewDemo() {
    return (
      <ImportTextView
        loading={false}
        onSubmit={() => {
          void 0;
        }}
      />
    );
  };
}
