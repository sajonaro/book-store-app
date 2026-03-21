import React, { useState, useRef } from 'react';
import type { BookFormState } from '../../hooks/useBookForm';

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, required, children }) => (
  <div>
    <label className='oai-label'>
      {label} {required && <span style={{ color: 'var(--oai-red)' }}>*</span>}
    </label>
    {children}
  </div>
);

/** GitHub-style keyword tag input */
interface KeywordsInputProps {
  keywords: string[];
  onChange: (kw: string[]) => void;
}

const KeywordsInput: React.FC<KeywordsInputProps> = ({ keywords, onChange }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || keywords.includes(tag) || keywords.length >= 30) return;
    onChange([...keywords, tag]);
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(keywords.filter((k) => k !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && input === '' && keywords.length > 0) {
      removeTag(keywords[keywords.length - 1]);
    }
  };

  return (
    <div
      className='oai-input'
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center',
        minHeight: '42px',
        height: 'auto',
        cursor: 'text',
        padding: '6px 10px',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {keywords.map((kw) => (
        <span
          key={kw}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--oai-green)',
            color: '#fff',
            borderRadius: '9999px',
            padding: '2px 10px',
            fontSize: '0.75rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {kw}
          <button
            type='button'
            onClick={(e) => { e.stopPropagation(); removeTag(kw); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '0.9rem',
              lineHeight: 1,
              padding: 0,
              marginLeft: '2px',
            }}
            aria-label={`Remove ${kw}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={keywords.length === 0 ? 'math, français, math-french…' : ''}
        style={{
          flex: 1,
          minWidth: '120px',
          background: 'none',
          border: 'none',
          outline: 'none',
          color: 'var(--oai-text)',
          fontSize: '0.875rem',
          padding: 0,
        }}
      />
    </div>
  );
};

interface BookFormFieldsProps {
  form: BookFormState;
  set: <K extends keyof BookFormState>(key: K, value: BookFormState[K]) => void;
}

const BookFormFields: React.FC<BookFormFieldsProps> = ({ form, set }) => (
  <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
    <Field label='Title' required>
      <input type='text' value={form.title} onChange={(e) => set('title', e.target.value)} className='oai-input' />
    </Field>
    <Field label='Author' required>
      <input type='text' value={form.author} onChange={(e) => set('author', e.target.value)} className='oai-input' />
    </Field>
    <Field label='ISBN'>
      <input type='text' value={form.isbn} onChange={(e) => set('isbn', e.target.value)} className='oai-input' />
    </Field>
    <Field label='Publisher'>
      <input type='text' value={form.publisher} onChange={(e) => set('publisher', e.target.value)} className='oai-input' />
    </Field>
    <Field label='Publish Year'>
      <input type='number' value={form.publishYear} onChange={(e) => set('publishYear', e.target.value)} className='oai-input' />
    </Field>
    <Field label='Genre'>
      <input type='text' value={form.genre} onChange={(e) => set('genre', e.target.value)} className='oai-input' />
    </Field>
    <Field label='Language'>
      <input type='text' placeholder='e.g. English, Spanish' value={form.language} onChange={(e) => set('language', e.target.value)} className='oai-input' />
    </Field>
    <Field label='Price ($)'>
      <input type='number' min='0' step='0.01' value={form.price} onChange={(e) => set('price', e.target.value)} className='oai-input' />
    </Field>
    <Field label='Stock'>
      <input type='number' min='0' step='1' value={form.stock} onChange={(e) => set('stock', e.target.value)} className='oai-input' />
    </Field>
    <Field label='Shelf Name'>
      <input type='text' placeholder='e.g. Fiction A' value={form.shelfName} onChange={(e) => set('shelfName', e.target.value)} className='oai-input' />
    </Field>
    <Field label='Shelf Number'>
      <input type='text' placeholder='e.g. 3' value={form.shelfNumber} onChange={(e) => set('shelfNumber', e.target.value)} className='oai-input' />
    </Field>
    <div className='sm:col-span-2'>
      <Field label='Description'>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          className='oai-input'
          style={{ resize: 'vertical' }}
        />
      </Field>
    </div>
    <div className='sm:col-span-2'>
      <Field label='Keywords'>
        <p className='text-xs mb-1' style={{ color: 'var(--oai-muted)' }}>
          Type a keyword and press <kbd style={{ background: 'var(--oai-surface)', border: '1px solid var(--oai-border)', borderRadius: '3px', padding: '0 4px', fontSize: '0.7rem' }}>Enter</kbd> or <kbd style={{ background: 'var(--oai-surface)', border: '1px solid var(--oai-border)', borderRadius: '3px', padding: '0 4px', fontSize: '0.7rem' }}>,</kbd> to add. Click × to remove.
        </p>
        <KeywordsInput
          keywords={form.keywords}
          onChange={(kw) => set('keywords', kw)}
        />
      </Field>
    </div>
  </div>
);

export default BookFormFields;
