import React, { useState, useRef, useEffect } from 'react';
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

/** Year picker — shows a scrollable grid of years in a popup */
interface YearPickerProps {
  value: string;
  onChange: (year: string) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 700;

const YearPicker: React.FC<YearPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [typedValue, setTypedValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep typedValue in sync when value changes externally
  useEffect(() => {
    setTypedValue(value);
  }, [value]);

  // Generate years from current down to MIN_YEAR
  const years: number[] = [];
  for (let y = CURRENT_YEAR; y >= MIN_YEAR; y--) years.push(y);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll selected year into view when popup opens
  useEffect(() => {
    if (open) {
      if (selectedRef.current) {
        selectedRef.current.scrollIntoView({ block: 'center' });
      }
      // Focus the text input so user can type immediately
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const handleSelect = (y: number) => {
    onChange(String(y));
    setTypedValue(String(y));
    setOpen(false);
  };

  const handleTyped = (raw: string) => {
    // Allow only digits, max 4
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setTypedValue(digits);
    if (digits.length === 4) {
      const y = parseInt(digits, 10);
      if (y >= MIN_YEAR && y <= CURRENT_YEAR) {
        onChange(digits);
      }
    }
  };

  const commitTyped = () => {
    if (typedValue.length === 4) {
      const y = parseInt(typedValue, 10);
      if (y >= MIN_YEAR && y <= CURRENT_YEAR) {
        onChange(typedValue);
        setOpen(false);
        return;
      }
    }
    // Invalid — revert
    setTypedValue(value);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        className="oai-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ color: value ? 'var(--oai-text)' : 'var(--oai-muted)' }}>
          {value || 'Select year…'}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="14"
          height="14"
          style={{ color: 'var(--oai-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 200,
            backgroundColor: 'var(--oai-surface)',
            border: '1px solid var(--oai-border)',
            borderRadius: 'var(--oai-radius)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            padding: '8px 6px 6px',
          }}
        >
          {/* Type-in field */}
          <div style={{ marginBottom: '6px', padding: '0 2px' }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="Type year (e.g. 1984)"
              value={typedValue}
              onChange={(e) => handleTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitTyped(); }
                if (e.key === 'Escape') { setOpen(false); setTypedValue(value); }
              }}
              onBlur={commitTyped}
              style={{
                width: '100%',
                padding: '5px 8px',
                fontSize: '0.85rem',
                backgroundColor: 'var(--oai-bg)',
                border: '1px solid var(--oai-border)',
                borderRadius: '4px',
                color: 'var(--oai-text)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Scrollable year grid */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '3px',
              }}
            >
              {years.map((y) => {
                const isSelected = String(y) === value;
                return (
                  <button
                    key={y}
                    ref={isSelected ? selectedRef : undefined}
                    type="button"
                    onClick={() => handleSelect(y)}
                    style={{
                      padding: '5px 2px',
                      fontSize: '0.78rem',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 700 : 400,
                      backgroundColor: isSelected ? 'var(--oai-green)' : 'transparent',
                      color: isSelected ? '#fff' : 'var(--oai-text)',
                      transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--oai-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
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
      <YearPicker value={form.publishYear} onChange={(y) => set('publishYear', y)} />
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
