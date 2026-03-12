// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface BookFields {
    title?: string;
    author?: string;
    isbn?: string | null;
    publisher?: string | null;
    publish_year?: number | null;
    genre?: string | null;
    description?: string | null;
    price?: number;
    stock?: number;
    language?: string | null;
    shelf_name?: string | null;
    shelf_number?: string | null;
    cover_thumbnail?: string;
}

export function isValidUUID(id: string): boolean {
    return UUID_REGEX.test(id);
}

// Sanitize and coerce all book fields from request body
export function sanitizeBook(body: Record<string, unknown>): BookFields {
    return {
        title:           typeof body.title === 'string'            ? body.title.trim().slice(0, 500)            : undefined,
        author:          typeof body.author === 'string'           ? body.author.trim().slice(0, 500)           : undefined,
        isbn:            typeof body.isbn === 'string'             ? body.isbn.trim().slice(0, 20)              : null,
        publisher:       typeof body.publisher === 'string'        ? body.publisher.trim().slice(0, 255)        : null,
        publish_year:    body.publish_year != null                 ? Number(body.publish_year)                  : null,
        genre:           typeof body.genre === 'string'            ? body.genre.trim().slice(0, 100)            : null,
        description:     typeof body.description === 'string'      ? body.description.trim()                    : null,
        price:           body.price != null                        ? parseFloat(body.price as string)           : 0.00,
        stock:           body.stock != null                        ? parseInt(body.stock as string, 10)         : 0,
        // New fields
        language:        typeof body.language === 'string'         ? body.language.trim().slice(0, 100)         : null,
        shelf_name:      typeof body.shelf_name === 'string'       ? body.shelf_name.trim().slice(0, 100)       : null,
        shelf_number:    typeof body.shelf_number === 'string'     ? body.shelf_number.trim().slice(0, 50)      : null,
        // cover_thumbnail — base64 data-URI; pass through as-is (size validated elsewhere)
        cover_thumbnail: typeof body.cover_thumbnail === 'string' && body.cover_thumbnail.length > 0
            ? body.cover_thumbnail
            : undefined,
    };
}

export function validateBookFields({ title, author, publish_year, price, stock }: BookFields): string | null {
    if (!title || !author) {
        return 'Send all required fields: title, author';
    }
    if (publish_year != null && (isNaN(publish_year) || publish_year < 1000 || publish_year > new Date().getFullYear() + 5)) {
        return 'publish_year must be a valid year';
    }
    if (price == null || isNaN(price) || price < 0) {
        return 'price must be a non-negative number';
    }
    if (stock == null || isNaN(stock) || stock < 0) {
        return 'stock must be a non-negative integer';
    }
    return null;
}
