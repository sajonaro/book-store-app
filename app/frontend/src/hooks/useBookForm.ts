import { useState, useRef } from 'react';
import type { Book } from '../types/book';

export interface BookFormState {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishYear: string;
  genre: string;
  description: string;
  price: string;
  stock: string;
  language: string;
  shelfName: string;
  shelfNumber: string;
  coverThumb: string | null;
  keywords: string[];
}

const EMPTY: BookFormState = {
  title: '', author: '', isbn: '', publisher: '', publishYear: '',
  genre: '', description: '', price: '', stock: '', language: '',
  shelfName: '', shelfNumber: '', coverThumb: null,
  keywords: [],
};

export function useBookForm(initial?: Partial<BookFormState>) {
  const [form, setForm] = useState<BookFormState>({ ...EMPTY, ...initial });
  const coverFileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof BookFormState>(key: K, value: BookFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /** Populate form from a Book object (API response) */
  const populateFromBook = (d: Partial<Book>) => {
    setForm({
      title: d.title || '',
      author: d.author || '',
      isbn: d.isbn || '',
      publisher: d.publisher || '',
      publishYear: d.publish_year != null ? String(d.publish_year) : '',
      genre: d.genre || '',
      description: d.description || '',
      price: d.price != null ? String(d.price) : '',
      stock: d.stock != null ? String(d.stock) : '',
      language: d.language || '',
      shelfName: d.shelf_name || '',
      shelfNumber: d.shelf_number || '',
      coverThumb: d.cover_thumbnail || null,
      keywords: Array.isArray(d.keywords) ? d.keywords.filter(Boolean) : [],
    });
  };

  /** Populate form from AI recognition metadata */
  const populateFromMeta = (meta: Record<string, unknown>, thumb?: string | null) => {
    setForm((prev) => ({
      ...prev,
      ...(meta.title ? { title: meta.title as string } : {}),
      ...(meta.author ? { author: meta.author as string } : {}),
      ...(meta.isbn ? { isbn: meta.isbn as string } : {}),
      ...(meta.publisher ? { publisher: meta.publisher as string } : {}),
      ...(meta.year ? { publishYear: String(meta.year) } : {}),
      ...(meta.genre ? { genre: meta.genre as string } : {}),
      ...(meta.language ? { language: meta.language as string } : {}),
      ...(meta.description ? { description: meta.description as string } : {}),
      ...(thumb ? { coverThumb: thumb } : {}),
      // Merge AI-suggested keywords with any already entered
      ...(Array.isArray(meta.keywords) && (meta.keywords as string[]).length > 0
        ? {
            keywords: Array.from(
              new Set([
                ...prev.keywords,
                ...(meta.keywords as string[]).map((k) => String(k).trim().toLowerCase()).filter(Boolean),
              ])
            ),
          }
        : {}),
    }));
  };

  /** Convert form state to API request payload */
  const toApiPayload = () => ({
    title: form.title,
    author: form.author,
    isbn: form.isbn || undefined,
    publisher: form.publisher || undefined,
    publish_year: form.publishYear ? Number(form.publishYear) : undefined,
    genre: form.genre || undefined,
    description: form.description || undefined,
    price: form.price !== '' ? Number(form.price) : 0,
    stock: form.stock !== '' ? Number(form.stock) : 0,
    language: form.language || undefined,
    shelf_name: form.shelfName || undefined,
    shelf_number: form.shelfNumber || undefined,
    cover_thumbnail: form.coverThumb || undefined,
    keywords: form.keywords.length > 0 ? form.keywords : undefined,
  });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('coverThumb', reader.result as string);
    reader.readAsDataURL(file);
  };

  return { form, set, populateFromBook, populateFromMeta, toApiPayload, handleCoverChange, coverFileRef };
}
