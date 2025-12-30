# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Skool Clone - a community platform with social feed, course/classroom system, member directory, events calendar, and gamification (leaderboards). Full-stack TypeScript with React frontend and Express backend on PostgreSQL.

## Commands

```bash
npm run dev       # Start development server (Vite + Express with HMR)
npm run build     # Production build (client + server)
npm run start     # Run production build
npm run check     # TypeScript type checking
npm run db:push   # Push Drizzle schema changes to database
```

## Architecture

### Tech Stack
- **Frontend**: React 18, Vite, Wouter (routing), TanStack Query (server state)
- **Backend**: Express.js with Passport.js (Replit Auth via OpenID Connect)
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: shadcn/ui (Radix primitives), Tailwind CSS with light/dark modes

### Directory Structure
```
client/src/
├── pages/          # Page components (Feed, Classroom, Members, Calendar, etc.)
├── components/     # Shared components + shadcn/ui
├── hooks/          # useAuth, useToast, useMobile
├── lib/            # queryClient, utilities
server/
├── routes.ts       # All API endpoints
├── storage.ts      # IStorage interface + DatabaseStorage implementation
├── db.ts           # Database connection
shared/
├── schema.ts       # Drizzle table definitions + Zod schemas
├── models/auth.ts  # users & sessions tables (required for Replit Auth)
```

### Path Aliases
- `@/*` → `client/src/`
- `@shared/*` → `shared/`

### Key Patterns

**Data Access**: All database operations go through `IStorage` interface in `server/storage.ts`. Use `DatabaseStorage` implementation methods.

**Authentication**: Replit Auth with Passport.js. Get user ID via `getUserId(req)` from `req.user?.claims?.sub`. Use `isAuthenticated` middleware for protected routes.

**API Routes**: RESTful under `/api/`. Endpoints in `server/routes.ts` grouped by feature (posts, comments, courses, events, members, leaderboard).

**Frontend Data**: TanStack Query for server state. Auth state via `useAuth()` hook returning `{user, isLoading, isAuthenticated, logout}`.

**Schema Types**: Use Drizzle's `$inferSelect` and `$inferInsert` for type safety. Extended response types (e.g., `PostWithAuthor`, `CourseWithDetails`) defined at end of `shared/schema.ts`.

### Database Tables
- Auth: `users`, `sessions`
- Profiles: `profiles` (extends users with bio, points, role)
- Feed: `posts`, `post_likes`, `comments`
- Learning: `courses`, `course_modules`, `lessons`, `enrollments`, `lesson_progress`
- Events: `events`, `event_attendees`

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session secret
- `ISSUER_URL`, `REPL_ID` - Replit Auth configuration
