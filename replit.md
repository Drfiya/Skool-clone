# Skool Clone

## Overview

A community platform clone inspired by Skool, providing online community management features including a social feed, course/classroom system, member directory, events calendar, and gamification through leaderboards. Built as a full-stack TypeScript application with React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration supporting light/dark modes
- **Build Tool**: Vite with React plugin

The frontend follows a page-based architecture with shared components. Pages are located in `client/src/pages/` and reusable components in `client/src/components/`. The app uses a sidebar navigation pattern with a collapsible menu.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API endpoints under `/api/` prefix
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: Express sessions with PostgreSQL store (connect-pg-simple)

The server follows a modular structure:
- `server/routes.ts` - API route definitions
- `server/storage.ts` - Data access layer with storage interface
- `server/db.ts` - Database connection setup
- `server/replit_integrations/auth/` - Authentication module

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via drizzle-kit with migrations output to `./migrations`

Key database tables:
- `users` and `sessions` - Authentication (mandatory for Replit Auth)
- `profiles` - Extended user profiles with points and roles
- `posts`, `post_likes`, `comments` - Community feed system
- `courses`, `course_modules`, `lessons`, `enrollments`, `lesson_progress` - Learning management
- `events`, `event_attendees` - Calendar and events

### Shared Code
The `shared/` directory contains code shared between frontend and backend:
- Database schema definitions
- TypeScript types and interfaces
- Zod validation schemas

### Build System
- Development: Vite dev server with HMR for frontend, tsx for backend
- Production: Custom build script (`script/build.ts`) using esbuild for server bundling and Vite for client

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- Session storage uses the same PostgreSQL instance

### Authentication
- **Replit Auth**: OpenID Connect authentication provider
- Requires `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables

### UI/Component Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, tooltips, etc.)
- **shadcn/ui**: Pre-styled component library built on Radix
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **embla-carousel-react**: Carousel component
- **react-day-picker**: Calendar/date picker component

### Form Handling
- **React Hook Form**: Form state management
- **Zod**: Schema validation with `@hookform/resolvers` for integration
- **drizzle-zod**: Generate Zod schemas from Drizzle table definitions

### Development Tools
- **TypeScript**: Type checking across the entire codebase
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS/Autoprefixer**: CSS processing