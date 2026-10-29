# Shelf library

A React and Vite frontend prototype for a small library. It includes a real-book sample catalog, book details and cover images, student borrowing and returns, librarian book management, librarian account creation, and a reader recommendation inbox.

## Run locally

```bash
npm install
npm run dev
```

Visitors can browse the public collection without signing in. Use **Sign in** to access borrowing, reading/download actions, student pages, or librarian tools. The only account roles are **Student** and **Librarian**; the librarian role includes the former admin privileges.

Reading and download actions require sign-in, but the prototype does not include digital book files. A librarian must configure a digital copy before those actions can open content.

The app uses an Express/Mongoose API for books, loans, recommendations, and accounts. Server-side passwords are hashed and the login session is held in an HTTP-only cookie.

## Sharing MongoDB setup safely

Do not paste a MongoDB URI, database password, or JWT secret into chat or commit them to source control. Copy `.env.example` to `.env` and set values locally. `.env` is ignored by Git. Keep database credentials server-side; never add a `VITE_` prefix.

The API creates `users`, `books`, `loans`, and `recommendations` collections and seeds the sample book catalog when the books collection is empty. The first librarian account is created from `BOOTSTRAP_LIBRARIAN_USERNAME` and `BOOTSTRAP_LIBRARIAN_PASSWORD`; there are no default production passwords. Student accounts can register from the sign-in dialog using a username and password. Additional librarian accounts can only be created by an authenticated librarian.

If a database credential is shared accidentally, rotate it in MongoDB Atlas before using it. Share only redacted schemas and error messages.

Run the API and frontend in separate terminals with `npm run dev:api` and `npm run dev`. The Vite development server proxies `/api` requests to the API on port 3000.
