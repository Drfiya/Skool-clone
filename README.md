# Skool Clone

A community platform inspired by Skool, featuring a social feed, course/classroom system, member directory, events calendar, and gamification through leaderboards.

## Features

- **Community Feed** - Posts with likes, comments, and categories (announcements, discussions, questions)
- **Classroom** - Course management with modules, lessons, and progress tracking
- **Member Directory** - Browse community members with profiles and roles
- **Events Calendar** - Create and RSVP to community events
- **Leaderboard** - Gamification with points system
- **Dark/Light Mode** - Theme support with Tailwind CSS

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Wouter, TanStack Query |
| UI | shadcn/ui, Radix UI, Tailwind CSS |
| Backend | Express.js, Passport.js |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Replit Auth (OpenID Connect) |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/skool
SESSION_SECRET=your-session-secret
ISSUER_URL=https://replit.com
REPL_ID=your-repl-id
```

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema to database |

## Project Structure

```
├── client/src/
│   ├── pages/        # Page components
│   ├── components/   # Shared UI components
│   ├── hooks/        # Custom React hooks
│   └── lib/          # Utilities
├── server/
│   ├── routes.ts     # API endpoints
│   ├── storage.ts    # Data access layer
│   └── db.ts         # Database connection
├── shared/
│   └── schema.ts     # Drizzle schema definitions
└── script/
    └── build.ts      # Production build script
```

## License

MIT
