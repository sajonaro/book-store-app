# Book Store Inventory App — Product Requirements Document

## What Are We Building?

Independent book stores struggle to catalog their inventory — especially rare or vintage books that lack digital records. Staff spend hours manually entering book data, and buyers have no easy way to search the catalog online.

We are building a **book store inventory and catalog system** that allows admins to photograph a book and have its metadata automatically recognized by AI, manages store operations (stock, pricing), and gives retail buyers a searchable web (and later mobile) catalog to find books by title, author, keyword, or theme.

---

## Requirements

| ID     | Description                                                                                                                                                  | User           | Acceptance Criteria (ACC)                                                                                       |
|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------|-----------------------------------------------------------------------------------------------------------------|
| FR001  | Admin can upload one or more photos of a book (cover, first pages, table of contents) and the system extracts metadata automatically via AI (Anthropic LLM). | Admin          | Uploading a photo populates title, author, ISBN, publisher, year, genre, and description fields automatically.   |
| FR002  | Admin can review and edit extracted metadata before saving the record.                                                                                        | Admin          | All extracted fields are editable; saving persists the final values to the database.                            |
| FR003  | Admin can add a new book record manually (without a photo).                                                                                                   | Admin          | A form allows manual entry of all metadata fields; record is saved to the database on submit.                   |
| FR004  | Admin can update the stock count for any book.                                                                                                                | Admin          | Stock count change is saved and immediately reflected in the catalog.                                           |
| FR005  | Admin can update the price of any book.                                                                                                                       | Admin          | Price change is saved and immediately reflected in the catalog.                                                 |
| FR006  | The system indexes all book records in Elasticsearch for full-text search.                                                                                    | System         | A newly created or updated book record appears in search results within seconds.                                |
| FR007  | Retail buyer can search the catalog by keyword, title, author, or ISBN.                                                                                       | Retail Buyer   | Search returns relevant results ranked by relevance; no results shows an empty-state message.                   |
| FR008  | Retail buyer can browse the catalog filtered by theme / genre.                                                                                                | Retail Buyer   | Selecting a genre filter shows only books in that genre.                                                        |
| FR009  | Retail buyer can view a book detail page showing all metadata (title, author, description, price, stock availability).                                        | Retail Buyer   | Book detail page renders all stored fields; out-of-stock books are labeled accordingly.                         |
| FR010  | The catalog is accessible via a web browser (responsive design).                                                                                              | Retail Buyer   | Site is usable on desktop and mobile browsers without a native app install.                                     |
| FR011  | The catalog is accessible via a native Android and iOS app (Phase 2).                                                                                         | Retail Buyer   | App connects to the same backend API; search and browse work on device (deferred to Phase 2).                  |

---

## Success Criteria

- An admin can photograph an unknown book and have a complete, accurate catalog record created in **under 2 minutes** with no manual typing.
- Search returns relevant results for **90%+ of queries** tested against the book catalog.
- A retail buyer can locate a specific book by title or author in **3 clicks or fewer** from the home page.
- Stock and price updates made by an admin are visible to buyers **within 5 seconds**.
- The system handles books from any era (pre-ISBN vintage prints through modern releases) without failing the metadata extraction step.
- All core services (backend API, PostgreSQL, Elasticsearch) start cleanly with a single `docker compose up` command.
