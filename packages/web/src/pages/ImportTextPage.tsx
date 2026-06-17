import {useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {eciperay} from '../lib/api.js';

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

export const ImportTextPage = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const syncEmpty = () => {
    setIsEmpty(isEditorEmpty(editorRef.current));
  };

  const handleImport = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const text = getEditorContent(editorRef.current);
    if (!text) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const recipe = await eciperay.import.importText(text);
      void navigate(`/import/review/${recipe.id}`);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Import from text
      </h1>
      <p className="text-muted mb-6 text-sm">
        Paste a recipe from Word, a web page, or any rich text source.
      </p>
      <form
        onSubmit={e => {
          void handleImport(e);
        }}
        className="space-y-4"
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
            min-h-48 w-full rounded-lg border border-gray-300 px-4 py-3
            outline-none
            focus:ring-2
            [&:empty]:before:pointer-events-none [&:empty]:before:text-gray-400
            [&:empty]:before:content-[attr(data-placeholder)]
          "
          onInput={syncEmpty}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || isEmpty}
          className="
            bg-primary w-full rounded-lg py-3 font-semibold text-white
            disabled:opacity-50
          "
        >
          {loading ? 'Importing…' : 'Import'}
        </button>
      </form>
    </div>
  );
};
