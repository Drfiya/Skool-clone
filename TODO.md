# TODO - Skool Clone Improvement Roadmap

This document tracks the remaining tasks to make the Skool Clone fully functional and improve UI/UX.

## Completed Tasks

### Task 1: Authorization Checks ✅
- Implemented ownership verification for posts, comments, courses, and events
- Users can only edit/delete their own content
- Course instructors can only modify their own courses
- Event creators can only modify their own events
- Added input validation for RSVP status

### Task 2: Pagination ✅
- Added pagination to all list endpoints (posts, courses, events, members)
- Backend: Added `limit` and `offset` query parameters (default: 20 items, max: 100)
- Backend: Response format now includes `{ data: [], pagination: { total, limit, offset, hasMore } }`
- Frontend: Updated all pages to handle new paginated response format

### Task 3: Course & Lesson Management System ✅
- Backend: Added Module CRUD endpoints (POST/PATCH/DELETE `/api/courses/:id/modules`)
- Backend: Added Lesson CRUD endpoints (POST/PATCH/DELETE `/api/modules/:id/lessons`)
- Backend: Added reordering endpoints (`PUT /api/courses/:id/modules/reorder`, `PUT /api/modules/:id/lessons/reorder`)
- Backend: Added lesson progress endpoint (`GET /api/courses/:id/progress`)
- Frontend: Created Course Detail page (`/classroom/:id`) with modules/lessons accordion
- Frontend: Created Lesson Viewer page (`/classroom/:courseId/lesson/:lessonId`) with video support
- Frontend: Created Course Editor dialog for instructors to manage courses, modules, and lessons

### Task 4: Post & Comment Improvements ✅
- Backend: Added Comment UPDATE endpoint (`PATCH /api/comments/:id`)
- Backend: Added comment threading support with `replyCount` and `GET /api/comments/:id/replies`
- Backend: Added parent comment validation when creating replies
- Frontend: Wired post Edit/Delete buttons with confirmation dialogs
- Frontend: Added edit mode to PostComposer for updating posts
- Frontend: Implemented expandable Comments section in Feed
- Frontend: Added threaded comment replies with nested UI and reply forms

### Task 5: Event Management Completion ✅
- Backend: Added `GET /api/events/:id/attendees` endpoint with grouped response
- Backend: Added RSVP counts (goingCount, maybeCount, notGoingCount) to event responses
- Frontend: Created Event Editor dialog for create/edit with date pickers
- Frontend: Created Event Detail page (`/calendar/:id`) with attendee tabs
- Frontend: Full RSVP states with color-coded buttons (Going/Maybe/Can't Go)
- Frontend: Made EventCard clickable with "View Details" link

---

## Remaining Tasks

### TASK 6: Profile & Settings (High Priority)
**Status:** Not Started
**Priority:** High
**Missing:** Cannot update profile information

| Subtask | Type | Description | Status |
|---------|------|-------------|--------|
| 6.1 | Backend | Add Profile UPDATE endpoint (PATCH `/api/members/me`) | ⬜ |
| 6.2 | Frontend | Create Profile Edit dialog (bio, location, website, images) | ⬜ |
| 6.3 | Frontend | Create Settings page (theme, notifications, account) | ⬜ |
| 6.4 | Frontend | Show enrolled courses with progress on Profile page | ⬜ |

---

### TASK 7: UI/UX Polish (Medium Priority)
**Status:** Not Started
**Priority:** Medium
**Focus:** Consistency, accessibility, and user feedback improvements

| Subtask | Type | Description | Status |
|---------|------|-------------|--------|
| 7.1 | Frontend | Extract duplicate utilities (`getInitials`, `getDisplayName`) to shared hooks | ⬜ |
| 7.2 | Frontend | Add DeleteConfirmation dialog component | ⬜ |
| 7.3 | Frontend | Implement pagination UI (Load More / infinite scroll) | ⬜ |
| 7.4 | Frontend | Add error boundaries for graceful error handling | ⬜ |
| 7.5 | Frontend | Add ARIA labels to all icon buttons for accessibility | ⬜ |
| 7.6 | Frontend | Implement proper toast variants (info/warning/success) | ⬜ |

---

### TASK 8: Search & Filtering (Medium Priority)
**Status:** Not Started
**Priority:** Medium
**Issue:** Search functionality is displayed but not working

| Subtask | Type | Description | Status |
|---------|------|-------------|--------|
| 8.1 | Backend | Add search endpoint (`GET /api/search?q=`) across posts, courses, members, events | ⬜ |
| 8.2 | Frontend | Wire TopBar search to backend API | ⬜ |
| 8.3 | Frontend | Add sorting options to Classroom, Members, Calendar pages | ⬜ |
| 8.4 | Frontend | Add advanced filters (by category, date range, role) | ⬜ |

---

### TASK 9: Enrollment & Progress Enhancements (Lower Priority)
**Status:** Not Started
**Priority:** Lower
**Issue:** Incomplete enrollment management

| Subtask | Type | Description | Status |
|---------|------|-------------|--------|
| 9.1 | Backend | Add unenroll endpoint (DELETE `/api/enrollments/:courseId`) | ⬜ |
| 9.2 | Backend | Add enrollment details with full course data | ⬜ |
| 9.3 | Backend | Add course completion validation | ⬜ |
| 9.4 | Frontend | Add unenroll button with confirmation | ⬜ |
| 9.5 | Frontend | Create course progress dashboard | ⬜ |

---

### TASK 10: Admin & Moderation Features (Lower Priority)
**Status:** Not Started
**Priority:** Lower
**Issue:** Role system defined but not implemented

| Subtask | Type | Description | Status |
|---------|------|-------------|--------|
| 10.1 | Backend | Add role-based permission middleware | ⬜ |
| 10.2 | Backend | Add pin/unpin post endpoint (admin/moderator only) | ⬜ |
| 10.3 | Frontend | Create admin dashboard for user management | ⬜ |
| 10.4 | Frontend | Add moderation tools (pin posts, manage users) | ⬜ |

---

## Summary

| Priority | Tasks | Subtasks | Status |
|----------|-------|----------|--------|
| **Critical** | Task 3 (Course/Lesson System) | 6 | ✅ Completed |
| **High** | Task 4 (Posts/Comments) | 5 | ✅ Completed |
| **High** | Task 5 (Events) | 4 | ✅ Completed |
| **High** | Task 6 (Profile/Settings) | 4 | Not Started |
| **Medium** | Tasks 7, 8 (UI/UX, Search) | 10 | Not Started |
| **Lower** | Tasks 9, 10 (Enrollment, Admin) | 9 | Not Started |

**Total Remaining:** 23 subtasks across 5 tasks

---

## Execution Strategy

Each task will be executed using parallel subagents where appropriate:
- **Backend subagents**: Handle API endpoints, storage methods, validation
- **Frontend subagents**: Handle UI components, pages, hooks

Tasks will be completed sequentially with user approval between each task.

---

## Legend

- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked
