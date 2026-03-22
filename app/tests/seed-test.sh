#!/usr/bin/env bash
# seed_test.sh — Seeds 100 sample books for admin@bookstore.com tenant (bux1)
# Tenant ID: 128a5f0c-79b4-41e2-a9a8-1582e37bd676
#
# Usage: bash app/tests/seed_test.sh
# Run from repo root or from the app/ directory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

TENANT_ID="128a5f0c-79b4-41e2-a9a8-1582e37bd676"
PGPASSWORD="${PGPASSWORD:-changeme_strong_password_here}"
PGUSER="${PGUSER:-bookstore}"
PGDB="${PGDB:-bookstore}"

# ── Generate SQL ───────────────────────────────────────────────────────────────
SQL_FILE="/tmp/seed_books_100.sql"

cat > "${SQL_FILE}" <<'ENDSQL'
INSERT INTO books (id, tenant_id, title, author, isbn, publisher, publish_year, genre, description, price, stock, language) VALUES
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 'Scribner', 1925, 'Fiction', 'A novel about the American Dream.', 12.99, 15, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'To Kill a Mockingbird', 'Harper Lee', '9780061935466', 'HarperCollins', 1960, 'Fiction', 'A story of racial injustice.', 14.99, 20, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', '1984', 'George Orwell', '9780451524935', 'Signet Classic', 1949, 'Dystopian', 'A totalitarian future society.', 10.99, 25, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Pride and Prejudice', 'Jane Austen', '9780141439518', 'Penguin Classics', 1813, 'Romance', 'A romantic novel of manners.', 9.99, 18, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Catcher in the Rye', 'J.D. Salinger', '9780316769174', 'Little Brown', 1951, 'Fiction', 'A story of teenage alienation.', 11.99, 12, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Brave New World', 'Aldous Huxley', '9780060850524', 'Harper Perennial', 1932, 'Dystopian', 'A dystopian social science fiction.', 12.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Hobbit', 'J.R.R. Tolkien', '9780547928227', 'Houghton Mifflin', 1937, 'Fantasy', 'A fantasy adventure story.', 13.99, 30, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', '9780590353427', 'Scholastic', 1997, 'Fantasy', 'A young wizard''s first year at Hogwarts.', 14.99, 50, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Lord of the Rings', 'J.R.R. Tolkien', '9780618640157', 'Houghton Mifflin', 1954, 'Fantasy', 'An epic high-fantasy novel.', 24.99, 20, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Animal Farm', 'George Orwell', '9780451526342', 'Signet Classic', 1945, 'Satire', 'An allegorical novella.', 8.99, 22, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Alchemist', 'Paulo Coelho', '9780062315007', 'HarperOne', 1988, 'Fiction', 'A philosophical novel.', 13.99, 35, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Fahrenheit 451', 'Ray Bradbury', '9781451673319', 'Simon Schuster', 1953, 'Dystopian', 'A future where books are burned.', 10.99, 18, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Don Quixote', 'Miguel de Cervantes', '9780060934347', 'HarperCollins', 1605, 'Classic', 'Adventures of a wannabe knight.', 15.99, 8, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Moby Dick', 'Herman Melville', '9781503280786', 'CreateSpace', 1851, 'Adventure', 'The quest to hunt a white whale.', 9.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Divine Comedy', 'Dante Alighieri', '9780142437223', 'Penguin Classics', 1320, 'Poetry', 'A journey through the afterlife.', 14.99, 7, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'War and Peace', 'Leo Tolstoy', '9781400079988', 'Vintage', 1869, 'Historical Fiction', 'A panoramic view of Russian life.', 19.99, 6, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Crime and Punishment', 'Fyodor Dostoevsky', '9780143058144', 'Penguin Classics', 1866, 'Psychological Fiction', 'A psychological study of a murderer.', 12.99, 14, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Hamlet', 'William Shakespeare', '9780743477123', 'Simon Schuster', 1603, 'Drama', 'A tragedy of revenge.', 8.99, 20, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Wuthering Heights', 'Emily Bronte', '9780141439556', 'Penguin Classics', 1847, 'Gothic Fiction', 'A dark romantic novel.', 10.99, 16, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Jane Eyre', 'Charlotte Bronte', '9780141441146', 'Penguin Classics', 1847, 'Romance', 'A young orphan''s journey.', 11.99, 19, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Great Expectations', 'Charles Dickens', '9780141439563', 'Penguin Classics', 1861, 'Fiction', 'The story of orphan Pip.', 10.99, 13, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Odyssey', 'Homer', '9780140268867', 'Penguin Classics', 800, 'Epic Poetry', 'Odysseus''s journey home from Troy.', 12.99, 9, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Iliad', 'Homer', '9780140275360', 'Penguin Classics', 750, 'Epic Poetry', 'The Trojan War epic.', 12.99, 8, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Ulysses', 'James Joyce', '9781840226355', 'Wordsworth Editions', 1922, 'Modernist Fiction', 'A day in Dublin''s life.', 14.99, 5, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'A Tale of Two Cities', 'Charles Dickens', '9780141439600', 'Penguin Classics', 1859, 'Historical Fiction', 'The French Revolution era.', 10.99, 15, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Count of Monte Cristo', 'Alexandre Dumas', '9780140449266', 'Penguin Classics', 1844, 'Adventure', 'A story of betrayal and revenge.', 16.99, 12, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Les Miserables', 'Victor Hugo', '9780451419439', 'Signet Classic', 1862, 'Historical Fiction', 'France in the 19th century.', 18.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Anna Karenina', 'Leo Tolstoy', '9780143035008', 'Penguin Classics', 1878, 'Romance', 'A tragic love story.', 15.99, 11, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Madame Bovary', 'Gustave Flaubert', '9780140449129', 'Penguin Classics', 1857, 'Realist Fiction', 'A provincial doctor''s wife.', 11.99, 9, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Brothers Karamazov', 'Fyodor Dostoevsky', '9780374528379', 'Farrar Straus', 1880, 'Philosophical Fiction', 'A spiritual drama of moral debates.', 17.99, 8, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Invisible Man', 'Ralph Ellison', '9780679732761', 'Vintage', 1952, 'Fiction', 'A Black man''s experience in America.', 13.99, 14, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'One Hundred Years of Solitude', 'Gabriel Garcia Marquez', '9780060883287', 'HarperCollins', 1967, 'Magical Realism', 'The Buendia family''s story.', 14.99, 16, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Love in the Time of Cholera', 'Gabriel Garcia Marquez', '9780307389732', 'Vintage', 1985, 'Romance', 'A love story spanning fifty years.', 14.99, 12, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Sun Also Rises', 'Ernest Hemingway', '9780743297332', 'Scribner', 1926, 'Fiction', 'The Lost Generation in Europe.', 12.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'A Farewell to Arms', 'Ernest Hemingway', '9780684801469', 'Scribner', 1929, 'War Fiction', 'A wartime love story.', 12.99, 11, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'For Whom the Bell Tolls', 'Ernest Hemingway', '9780684803357', 'Scribner', 1940, 'War Fiction', 'The Spanish Civil War.', 13.99, 9, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Old Man and the Sea', 'Ernest Hemingway', '9780684801223', 'Scribner', 1952, 'Fiction', 'An old fisherman''s epic struggle.', 10.99, 17, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Of Mice and Men', 'John Steinbeck', '9780140177398', 'Penguin Books', 1937, 'Fiction', 'Two ranch workers'' friendship.', 9.99, 20, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Grapes of Wrath', 'John Steinbeck', '9780143039433', 'Penguin Books', 1939, 'Fiction', 'The Great Depression''s toll.', 13.99, 14, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'East of Eden', 'John Steinbeck', '9780142004235', 'Penguin Books', 1952, 'Fiction', 'Two families in Salinas Valley.', 15.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Catch-22', 'Joseph Heller', '9781451626650', 'Simon Schuster', 1961, 'Satire', 'The absurdity of war.', 13.99, 15, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Slaughterhouse-Five', 'Kurt Vonnegut', '9780440180296', 'Dell', 1969, 'Science Fiction', 'WWII and time travel.', 11.99, 18, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Handmaid''s Tale', 'Margaret Atwood', '9780385490818', 'Anchor Books', 1985, 'Dystopian', 'A theocratic future America.', 13.99, 22, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Beloved', 'Toni Morrison', '9781400033416', 'Vintage', 1987, 'Fiction', 'A former slave''s haunting.', 13.99, 14, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Color Purple', 'Alice Walker', '9780156028356', 'Mariner Books', 1982, 'Fiction', 'A Black woman in the South.', 12.99, 13, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Their Eyes Were Watching God', 'Zora Neale Hurston', '9780061859885', 'Amistad', 1937, 'Fiction', 'A Southern Black woman''s journey.', 12.99, 11, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Lolita', 'Vladimir Nabokov', '9780679723165', 'Vintage', 1955, 'Fiction', 'A controversial novel.', 12.99, 8, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Stranger', 'Albert Camus', '9780679720201', 'Vintage', 1942, 'Philosophical Fiction', 'Existentialism in French Algeria.', 10.99, 19, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Nausea', 'Jean-Paul Sartre', '9780811201568', 'New Directions', 1938, 'Philosophical Fiction', 'Existentialism and consciousness.', 11.99, 9, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'In Search of Lost Time', 'Marcel Proust', '9780141180441', 'Penguin Classics', 1913, 'Modernist Fiction', 'Memory and time in France.', 29.99, 4, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Trial', 'Franz Kafka', '9780805210408', 'Schocken', 1925, 'Absurdist Fiction', 'A man arrested without reason.', 11.99, 12, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Metamorphosis', 'Franz Kafka', '9780553213690', 'Bantam Classics', 1915, 'Absurdist Fiction', 'A man transformed into an insect.', 8.99, 20, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Siddhartha', 'Hermann Hesse', '9780553208849', 'Bantam Books', 1922, 'Philosophical Fiction', 'A spiritual journey in ancient India.', 10.99, 25, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Steppenwolf', 'Hermann Hesse', '9780312278670', 'Picador', 1927, 'Philosophical Fiction', 'A man between two worlds.', 12.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Picture of Dorian Gray', 'Oscar Wilde', '9780141439570', 'Penguin Classics', 1890, 'Gothic Fiction', 'A beautiful man''s dark bargain.', 10.99, 16, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Frankenstein', 'Mary Shelley', '9780141439471', 'Penguin Classics', 1818, 'Gothic Fiction', 'The dangers of playing God.', 9.99, 22, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Dracula', 'Bram Stoker', '9780141439082', 'Penguin Classics', 1897, 'Horror', 'The famous vampire story.', 10.99, 20, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Rebecca', 'Daphne du Maurier', '9780380730407', 'Avon', 1938, 'Gothic Mystery', 'A new wife haunted by her predecessor.', 12.99, 15, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Gone with the Wind', 'Margaret Mitchell', '9781451635621', 'Scribner', 1936, 'Historical Romance', 'The American Civil War era.', 16.99, 18, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Little Women', 'Louisa May Alcott', '9780147514011', 'Puffin Classics', 1868, 'Fiction', 'Four sisters growing up.', 10.99, 24, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Middlemarch', 'George Eliot', '9780141439549', 'Penguin Classics', 1874, 'Realist Fiction', 'Provincial English life.', 14.99, 8, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Tess of the d''Urbervilles', 'Thomas Hardy', '9780141439594', 'Penguin Classics', 1891, 'Tragedy', 'A young country woman''s fate.', 11.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Jude the Obscure', 'Thomas Hardy', '9780140435382', 'Penguin Classics', 1895, 'Fiction', 'A working-class man''s ambitions.', 11.99, 8, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Adventures of Huckleberry Finn', 'Mark Twain', '9780486280615', 'Dover Publications', 1884, 'Adventure', 'A boy''s journey down the Mississippi.', 7.99, 18, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Adventures of Tom Sawyer', 'Mark Twain', '9780143039563', 'Penguin Classics', 1876, 'Adventure', 'A boy''s adventures in Missouri.', 8.99, 20, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Leaves of Grass', 'Walt Whitman', '9780140421996', 'Penguin Classics', 1855, 'Poetry', 'Influential American poetry.', 12.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Waste Land', 'T.S. Eliot', '9780156948777', 'Mariner Books', 1922, 'Poetry', 'A landmark modernist poem.', 11.99, 8, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'A Room with a View', 'E.M. Forster', '9780141441825', 'Penguin Classics', 1908, 'Romance', 'An Edwardian love story.', 10.99, 14, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Howards End', 'E.M. Forster', '9780141442495', 'Penguin Classics', 1910, 'Fiction', 'Class conflict in England.', 11.99, 9, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Mrs Dalloway', 'Virginia Woolf', '9780156628709', 'Mariner Books', 1925, 'Modernist Fiction', 'A day in London.', 10.99, 11, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'To the Lighthouse', 'Virginia Woolf', '9780156907392', 'Mariner Books', 1927, 'Modernist Fiction', 'A family''s holiday in Scotland.', 10.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Orlando', 'Virginia Woolf', '9780156701600', 'Mariner Books', 1928, 'Fiction', 'A gender-bending fantasia.', 11.99, 8, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Sound and the Fury', 'William Faulkner', '9780679732242', 'Vintage', 1929, 'Modernist Fiction', 'The Compson family''s decline.', 12.99, 7, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'As I Lay Dying', 'William Faulkner', '9780679724258', 'Vintage', 1930, 'Fiction', 'A poor family''s journey.', 11.99, 9, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Light in August', 'William Faulkner', '9780679732266', 'Vintage', 1932, 'Fiction', 'Race and identity in the South.', 12.99, 8, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Bell Jar', 'Sylvia Plath', '9780060837020', 'HarperCollins', 1963, 'Fiction', 'A young woman''s breakdown.', 12.99, 20, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'On the Road', 'Jack Kerouac', '9780140283297', 'Penguin Books', 1957, 'Fiction', 'The Beat Generation''s travels.', 12.99, 15, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Naked Lunch', 'William S. Burroughs', '9780802140180', 'Grove Press', 1959, 'Experimental Fiction', 'A surreal drug-fueled journey.', 13.99, 6, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Fear and Loathing in Las Vegas', 'Hunter S. Thompson', '9780679785897', 'Vintage', 1971, 'Gonzo Journalism', 'A wild trip to Las Vegas.', 13.99, 12, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Zen and the Art of Motorcycle Maintenance', 'Robert M. Pirsig', '9780060839871', 'HarperTorch', 1974, 'Philosophy', 'A philosophical road trip.', 13.99, 14, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Road', 'Cormac McCarthy', '9780307387899', 'Vintage', 2006, 'Post-Apocalyptic', 'A father and son''s survival.', 13.99, 20, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Blood Meridian', 'Cormac McCarthy', '9780679728757', 'Vintage', 1985, 'Western', 'Violence on the US-Mexico border.', 14.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'No Country for Old Men', 'Cormac McCarthy', '9780307387134', 'Vintage', 2005, 'Thriller', 'A deadly game of cat and mouse.', 13.99, 15, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Song of Solomon', 'Toni Morrison', '9781400033423', 'Vintage', 1977, 'Fiction', 'A Black family across generations.', 13.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The House on Mango Street', 'Sandra Cisneros', '9780679734772', 'Vintage', 1984, 'Fiction', 'Growing up Latina in Chicago.', 11.99, 18, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Interpreter of Maladies', 'Jhumpa Lahiri', '9780395927205', 'Houghton Mifflin', 1999, 'Short Stories', 'Indian-American immigrant life.', 12.99, 16, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Namesake', 'Jhumpa Lahiri', '9780618485222', 'Houghton Mifflin', 2003, 'Fiction', 'An immigrant family in America.', 13.99, 15, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'White Teeth', 'Zadie Smith', '9780375703867', 'Vintage', 2000, 'Fiction', 'Multicultural London.', 14.99, 13, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Atonement', 'Ian McEwan', '9780385721707', 'Anchor Books', 2001, 'Fiction', 'A lie that destroys lives.', 13.99, 14, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Never Let Me Go', 'Kazuo Ishiguro', '9781400078776', 'Vintage', 2005, 'Dystopian', 'Clones coming of age.', 13.99, 18, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Remains of the Day', 'Kazuo Ishiguro', '9780679731726', 'Vintage', 1989, 'Fiction', 'An English butler reflects.', 12.99, 12, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Midnight''s Children', 'Salman Rushdie', '9780812976533', 'Random House', 1981, 'Magical Realism', 'India''s independence story.', 15.99, 9, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Satanic Verses', 'Salman Rushdie', '9780812976526', 'Random House', 1988, 'Magical Realism', 'A controversial novel.', 15.99, 6, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Things Fall Apart', 'Chinua Achebe', '9780385474542', 'Anchor Books', 1958, 'Fiction', 'Colonial Africa''s impact.', 11.99, 20, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Arrow of God', 'Chinua Achebe', '9780385014717', 'Anchor Books', 1964, 'Fiction', 'Colonial Nigeria.', 11.99, 10, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Season of Migration to the North', 'Tayeb Salih', '9780894775697', 'Heinemann', 1966, 'Fiction', 'Sudan meets Europe.', 12.99, 7, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The God of Small Things', 'Arundhati Roy', '9780812979657', 'Random House', 1997, 'Fiction', 'India''s caste system.', 13.99, 16, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Life of Pi', 'Yann Martel', '9780156027328', 'Mariner Books', 2001, 'Fiction', 'A boy and a tiger at sea.', 13.99, 25, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Kite Runner', 'Khaled Hosseini', '9781594631931', 'Riverhead Books', 2003, 'Fiction', 'Afghanistan and redemption.', 14.99, 30, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'A Thousand Splendid Suns', 'Khaled Hosseini', '9781594483073', 'Riverhead Books', 2007, 'Fiction', 'Two Afghan women''s bond.', 14.99, 25, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'The Electric Kool-Aid Acid Test', 'Tom Wolfe', '9780553380644', 'Bantam', 1968, 'Non-Fiction', 'Ken Kesey and the Merry Pranksters.', 12.99, 7, 'English'),
(gen_random_uuid(), '128a5f0c-79b4-41e2-a9a8-1582e37bd676', 'Beloved Infidel', 'Sheilah Graham', '9780553271638', 'Bantam Books', 1958, 'Memoir', 'A Hollywood romance memoir.', 9.99, 5, 'English')
ON CONFLICT (tenant_id, isbn) WHERE isbn IS NOT NULL DO NOTHING;
ENDSQL

echo "✅  SQL file generated: ${SQL_FILE}"

# ── Run against Postgres container ────────────────────────────────────────────
echo "🔄  Inserting books into database..."

docker compose -f "${APP_DIR}/docker-compose.yml" exec -T \
  -e PGPASSWORD="${PGPASSWORD}" \
  postgres \
  psql -U "${PGUSER}" -d "${PGDB}" -f /dev/stdin < "${SQL_FILE}"

echo "✅  Done. 100 books seeded for tenant bux1 (admin@bookstore.com)."

# ── Verify ─────────────────────────────────────────────────────────────────────
COUNT=$(docker compose -f "${APP_DIR}/docker-compose.yml" exec -T \
  -e PGPASSWORD="${PGPASSWORD}" \
  postgres \
  psql -U "${PGUSER}" -d "${PGDB}" -t -c \
  "SELECT COUNT(*) FROM books WHERE tenant_id='${TENANT_ID}';" 2>/dev/null | tr -d ' ')

echo "📚  Total books in tenant: ${COUNT}"
