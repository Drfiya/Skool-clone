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

### 2024-12-30 - Task 3: Course & Lesson Management System
- Implemented complete course content management (critical core feature)
- Backend changes (`server/routes.ts`, `server/storage.ts`):
  - Module CRUD: POST/PATCH/DELETE `/api/courses/:id/modules`
  - Lesson CRUD: POST/PATCH/DELETE `/api/modules/:id/lessons`
  - GET `/api/modules/:moduleId/lessons` - list lessons
  - GET `/api/lessons/:id` - get single lesson
  - GET `/api/lessons/:id/progress` - get lesson progress
  - PUT `/api/courses/:id/modules/reorder` - reorder modules
  - PUT `/api/modules/:id/lessons/reorder` - reorder lessons
  - GET `/api/courses/:id/progress` - get all lesson progress for a course
- Frontend changes:
  - Created `client/src/pages/course-detail.tsx` - Course Detail page with modules/lessons accordion
  - Created `client/src/pages/lesson.tsx` - Lesson Viewer with video support, progress tracking, navigation
  - Created `client/src/components/course-editor.tsx` - Full course editor dialog for instructors
  - Updated `client/src/App.tsx` - Added routes for course detail and lesson pages
  - Updated `client/src/pages/classroom.tsx` - Wired "Create Course" button to editor
- Features:
  - Course detail view with expandable modules and lesson list
  - Lesson viewer with YouTube/Vimeo/HTML5 video support
  - Mark lesson complete functionality
  - Previous/Next lesson navigation
  - Course outline sidebar with progress indicators
  - Full CRUD for courses, modules, and lessons
  - Drag-to-reorder (via up/down buttons) for modules and lessons

### 2024-12-30 - Task 4: Post & Comment Improvements
- Implemented complete post and comment management
- Backend changes:
  - `PATCH /api/comments/:id` - update comment content (author only)
  - `GET /api/comments/:id/replies` - fetch threaded replies
  - Updated `getComments` to include `replyCount` for each comment
  - Added parent comment validation when creating replies
- Frontend changes:
  - Updated `client/src/components/post-card.tsx` - Edit/Delete dropdown for post authors
  - Updated `client/src/components/post-composer.tsx` - Added edit mode with pre-filled form
  - Updated `client/src/components/comment-section.tsx` - Complete rewrite with threading
  - Updated `client/src/pages/feed.tsx` - Post edit/delete mutations with confirmation dialog
- Features:
  - Post edit/delete with AlertDialog confirmation
  - Expandable comment section on each post
  - Add new comments with author avatar
  - Edit/delete own comments
  - Threaded replies with visual indentation
  - "View X replies" expandable for nested comments
  - Reply form inline below comments

### 2024-12-30 - Task 5: Event Management Completion
- Implemented complete event management with RSVP system
- Backend changes:
  - `GET /api/events/:id/attendees` - returns attendees grouped by RSVP status
  - Updated event responses to include goingCount, maybeCount, notGoingCount
  - Added userRsvpStatus to event responses for logged-in users
- Frontend changes:
  - Created `client/src/components/event-editor.tsx` - Event create/edit dialog with date pickers
  - Created `client/src/pages/event-detail.tsx` - Event Detail page with attendee tabs
  - Updated `client/src/components/event-card.tsx` - Three RSVP buttons, clickable title
  - Updated `client/src/pages/calendar.tsx` - Wired Create Event button
  - Updated routing in App.tsx for `/calendar/:id`
- Features:
  - Full RSVP states with color-coded buttons (Going=green, Maybe=yellow, Can't Go=gray)
  - Event detail page with attendee lists grouped by status
  - Date/time pickers for event creation
  - Event editing and deletion for creators
