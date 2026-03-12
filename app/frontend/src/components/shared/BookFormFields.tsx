import React from 'react';
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
  </div>
);

export default BookFormFields;
