import type { Book } from '../types/book';

export const formatPrice = (price: number | string | null | undefined): string =>
  `$${parseFloat(String(price || 0)).toFixed(2)}`;

export const getBookLocation = (book: Pick<Book, 'shelf_name' | 'shelf_number'>): string | null => {
  const parts = [book.shelf_name, book.shelf_number].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
};

export const getErrorMessage = (err: unknown, fallback = 'Something went wrong'): string =>
  (err as { response?: { data?: { msg?: string } } }).response?.data?.msg || fallback;
