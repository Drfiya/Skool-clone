# Skool Clone - Design Guidelines

## Design Approach
**Reference-Based Design** - Drawing directly from Skool's proven community platform interface, optimized for engagement, learning, and member interaction.

## Core Design Philosophy
Clean, functional interface prioritizing content discovery and community interaction. Modern SaaS aesthetic with emphasis on readability, clear hierarchy, and intuitive navigation patterns.

## Typography System
- **Primary Font**: Inter or similar geometric sans-serif (Google Fonts)
- **Headings**: Bold (700), sizes ranging from text-3xl to text-lg
- **Body Text**: Regular (400) at text-base, Medium (500) for emphasis
- **Labels/Meta**: text-sm for secondary information
- **Code/Technical**: Mono font for technical content

## Layout & Spacing System
**Tailwind Spacing Units**: Primarily use 2, 4, 6, 8, 12, 16, 20 for consistency
- Container max-width: `max-w-7xl`
- Section padding: `p-6` mobile, `p-8` desktop
- Card padding: `p-4` to `p-6`
- Component gaps: `gap-4` to `gap-6`

## Application Structure

### Navigation Architecture
**Sidebar Navigation** (fixed left, ~240px width):
- Logo/community name header
- Primary sections: Feed, Classroom, Members, Calendar, Leaderboard
- User profile section at bottom
- Collapsible on mobile (hamburger menu)

**Top Bar**:
- Search functionality (prominent)
- Notifications bell icon
- User avatar dropdown
- Create post/content button (primary CTA)

### Core Page Layouts

**Community Feed** (main content area):
- Post cards with author info, timestamp, engagement metrics
- Filter tabs: All Posts, Following, Announcements
- Infinite scroll or pagination
- Right sidebar: trending topics, member highlights, upcoming events

**Classroom/Courses**:
- Grid layout for course cards (2-3 columns desktop)
- Course progress indicators
- Module/lesson hierarchy (collapsible accordions)
- Video player integration area
- Discussion threads beneath content

**Member Directory**:
- Avatar grid or list view toggle
- Search and filter controls
- Member cards: avatar, name, points, join date, brief bio
- Pagination for large communities

**Profile Pages**:
- Cover photo area (banner)
- Avatar overlay
- Stats row: points, posts, courses completed
- Tabbed content: Activity, About, Courses

## Component Library

### Cards
- Post Card: padding-6, rounded-lg, includes author row, content preview, engagement footer (likes, comments, share)
- Course Card: aspect ratio 16:9 thumbnail, title, instructor, progress bar, CTA button
- Member Card: centered avatar, name, role badge, stats, "Message" button

### Forms & Inputs
- Text inputs: rounded-md, padding-3, full-width within containers
- Rich text editor for post creation (toolbar with formatting options)
- File upload areas with drag-and-drop visual feedback
- Toggle switches for settings

### Data Display
- Tables for leaderboard: striped rows, sticky header
- Progress bars: rounded-full, height-2
- Badges: rounded-full, text-xs, padding-x-3
- Avatars: rounded-full, consistent sizes (sm: 8, md: 10, lg: 12, xl: 16)

### Navigation Elements
- Tabs: underline active state, text-sm font-medium
- Breadcrumbs: text-sm with separator icons
- Pagination: numbered buttons, prev/next controls

### Interactive Components
- Dropdown menus: rounded-lg, shadow-lg, padding-2
- Modals: centered overlay, max-width-2xl, padding-6
- Toast notifications: fixed bottom-right
- Comment threads: nested with left border indicators

## Key UX Patterns

**Engagement Focus**:
- Like/reaction buttons prominently placed
- Comment counts as clickable elements
- Share functionality on all content
- Real-time notification indicators

**Content Hierarchy**:
- Pinned posts highlighted at top of feed
- Course modules numbered clearly
- Member roles/badges visible consistently
- Timestamps relative (e.g., "2 hours ago")

**Mobile Responsiveness**:
- Sidebar converts to bottom navigation bar
- Cards stack single column
- Touch-friendly tap targets (min 44px)
- Simplified navigation on small screens

## Images
**Profile/User Images**: Avatar photos throughout (member directory, posts, comments)
**Course Thumbnails**: 16:9 ratio images for each course/module
**Post Attachments**: Support for inline images within posts
**Community Banner**: Optional hero image for community branding
No large hero images needed - this is a dashboard-style application focused on content and functionality.

## Animations
Minimal, performance-focused:
- Smooth page transitions (fade)
- Dropdown/modal entry animations (scale + fade)
- Loading states (skeleton screens for cards)
- Hover states on interactive elements (subtle scale/shadow)