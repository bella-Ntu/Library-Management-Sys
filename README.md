# Shelf library

Library management app built with React, Vite, Express, and MongoDB. Students can browse and borrow books, while librarians manage the collection and reader recommendations.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set the MongoDB URI, JWT secret, and initial librarian username and password.
3. Start the API and frontend in separate terminals:

   ```bash
   npm run dev:api
   npm run dev
   ```

The API connects to MongoDB and makes sure the educational catalog is present, with books across mathematics, computer science, science, business, and other courses. It keeps existing librarian-added books and books with loan history. Check the connection at `http://localhost:3000/api/health`.

## Security

Keep `.env` private; it is ignored by Git. Never expose database credentials or secrets in frontend code (including `VITE_` variables). If Atlas SRV DNS lookups fail with `querySrv ECONNREFUSED`, configure trusted DNS resolver IPs in the server-only `MONGODB_DNS_SERVERS` setting.
