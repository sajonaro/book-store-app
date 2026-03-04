# book store inventory app

this is application serving 2 users: book store admin and retail buyer:

- admin can take pictures of the few first pages of a book (printed decades ago, as well as totally new), optionally with table of contents , the system then recognizes the metadata about the book and creates a record about it in system's database, allowing then to search for this book by keywords, title, author (ISBN ) etc
- admin should have basic store keeping operations available with the system: keep the count of sold items, price updates etc 
- end user should be able to (using web site, then android/iOs app) to browse the catalog (by theme, keywords, author etc) to locate necessary bool


Tools used:
- elastic search
- postgresql
- AI (antropic llm)
