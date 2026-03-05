// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id) {
    return UUID_REGEX.test(id);
}

// Sanitize and coerce all book fields from request body
export function sanitizeBook(body) {
    return {
        title:        typeof body.title === 'string'       ? body.title.trim().slice(0, 500)       : undefined,
        author:       typeof body.author === 'string'      ? body.author.trim().slice(0, 500)      : undefined,
        isbn:         typeof body.isbn === 'string'        ? body.isbn.trim().slice(0, 20)         : null,
        publisher:    typeof body.publisher === 'string'   ? body.publisher.trim().slice(0, 255)   : null,
        publish_year: body.publish_year != null            ? Number(body.publish_year)              : null,
        genre:        typeof body.genre === 'string'       ? body.genre.trim().slice(0, 100)       : null,
        description:  typeof body.description === 'string' ? body.description.trim()               : null,
        price:        body.price != null                   ? parseFloat(body.price)                : 0.00,
        stock:        body.stock != null                   ? parseInt(body.stock, 10)               : 0,
    };
}

export function validateBookFields({ title, author, publish_year, price, stock }) {
    if (!title || !author) {
        return 'Send all required fields: title, author';
    }
    if (publish_year != null && (isNaN(publish_year) || publish_year < 1000 || publish_year > new Date().getFullYear() + 5)) {
        return 'publish_year must be a valid year';
    }
    if (isNaN(price) || price < 0) {
        return 'price must be a non-negative number';
    }
    if (isNaN(stock) || stock < 0) {
        return 'stock must be a non-negative integer';
    }
    return null;
}
