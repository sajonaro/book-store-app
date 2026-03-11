export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  publisher?: string | null;
  publish_year?: number | null;
  publishYear?: number | null;
  genre?: string | null;
  description?: string | null;
  price: number;
  stock: number;
  language?: string | null;
  shelf_name?: string | null;
  shelf_number?: string | null;
  cover_thumbnail?: string | null;
  created_at?: string;
  updated_at?: string;
}
