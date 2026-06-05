# RideUp

A peer-to-peer car marketplace where buyers and sellers transact directly with flexible payment options.

## Tech Stack
- **Framework:** [Vite](https://vitejs.dev/) + [React](https://reactjs.org/)
- **Styling:** [Tailwind CSS v3](https://tailwindcss.com/)
- **Routing:** [React Router v6](https://reactrouter.com/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database:** SQLite (via Turso/team-db)

## Project Structure
```
flexauto-market/
├── src/
│   ├── components/    (shared UI components)
│   ├── pages/         (route pages)
│   ├── contexts/      (auth, etc.)
│   ├── lib/           (API helpers, db utils)
│   ├── types/         (TypeScript types)
│   ├── styles/        (global styles)
│   └── App.tsx
├── public/
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Database
See [SCHEMA.md](./SCHEMA.md) for database structure.
Use the `team-db` CLI for shared database operations.
