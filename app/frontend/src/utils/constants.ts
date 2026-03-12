/** Placeholder SVG images for books without a cover */
const placeholder = (w: number, h: number, fontSize: number) =>
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="%231c1c1c"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize}" fill="%23666680">📚</text></svg>`;

export const PLACEHOLDER_CARD = placeholder(120, 160, 40);
export const PLACEHOLDER_DETAIL = placeholder(200, 280, 60);
export const PLACEHOLDER_TABLE = placeholder(40, 54, 18);
