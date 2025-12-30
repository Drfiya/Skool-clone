# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- CLAUDE.md - Claude Code guidance file
- README.md - Project documentation
- CHANGELOG.md - Change tracking for session context

### Security
- Added authorization/ownership checks to all mutation endpoints
- Added RSVP status validation (must be "going", "maybe", or "not_going")

### Changed
- `server/routes.ts`:
  - Added `PATCH /api/posts/:id` with author ownership check
  - Added `DELETE /api/posts/:id` with author ownership check
  - Added `DELETE /api/comments/:id` with author ownership check
  - Added `POST /api/courses` for course creation
  - Added `PATCH /api/courses/:id` with instructor ownership check
  - Added `DELETE /api/courses/:id` with instructor ownership check
  - Added `PATCH /api/events/:id` with creator ownership check
  - Added `DELETE /api/events/:id` with creator ownership check
  - Updated `POST /api/events/:id/rsvp` with status validation and event existence check

- `server/storage.ts`:
  - Added `getComment(id)` method
  - Added `deleteComment(id)` method
  - Added `updateCourse(id, data)` method
  - Added `deleteCourse(id)` method
  - Added `getEvent(id, userId?)` method
  - Added `updateEvent(id, data)` method
  - Added `deleteEvent(id)` method

---

## Session Log

### 2024-12-30 - Initial Review
- Completed comprehensive codebase review
- Identified frontend completeness: ~75-80%
- Identified backend completeness: ~60%
- Created improvement roadmap (see TODO list below)

### 2024-12-30 - Task 1: Authorization Checks
- Implemented ownership verification for posts, comments, courses, and events
- Users can only edit/delete their own content
- Course instructors can only modify their own courses
- Event creators can only modify their own events
- Added input validation for RSVP status

### 2024-12-30 - Task 2: Pagination
- Added pagination to all list endpoints (posts, courses, events, members)
- Backend: Added `limit` and `offset` query parameters (default: 20 items, max: 100)
- Backend: Response format now includes `{ data: [], pagination: { total, limit, offset, hasMore } }`
- Frontend: Updated all pages to handle new paginated response format
- Files modified:
  - `server/routes.ts` - Added pagination schema and updated 4 endpoints
  - `server/storage.ts` - Updated 4 storage methods with pagination support
  - `client/src/pages/feed.tsx` - Updated to use paginated response
  - `client/src/pages/classroom.tsx` - Updated to use paginated response
  - `client/src/pages/members.tsx` - Updated to use paginated response
  - `client/src/pages/calendar.tsx` - Updated to use paginated response
