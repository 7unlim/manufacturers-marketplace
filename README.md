# manufacturers-marketplace

## Project overview

This repository holds a React/TypeScript storefront that connects to a Node/Express backend backed by SQLite. Enterprise buyers browse manufacturer inventories, seek AI recommendations when building bids, and submit adjusted proposals.

## Backend

1. `cd backend`
2. `npm install` (already run)
3. `npm run dev` to start the Express API on port 4000 (the server seeds sample companies/materials automatically). `npm run build` compiles the TypeScript sources to `dist`.

Available APIs:

- `GET /api/companies`
- `GET /api/materials`
- `POST /api/bids`
- `PUT /api/bids/:id`
- `POST /api/bids/:id/submit`
- `POST /api/ai/bid-assist`

## Frontend

1. `cd frontend`
2. `npm install`
3. `npm run dev` to start the Vite dev server on port 5173.
4. `npm run build` to compile a production bundle in `dist`.

The SPA hits the backend at `http://localhost:4000` by default. You can override using the `VITE_API_URL` environment variable.