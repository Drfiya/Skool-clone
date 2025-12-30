import { 
  users, profiles, posts, postLikes, comments, 
  courses, courseModules, lessons, enrollments, lessonProgress,
  events, eventAttendees,
  type Profile, type InsertProfile,
  type Post, type InsertPost,
  type PostLike, type InsertPostLike,
  type Comment, type InsertComment,
  type Course, type InsertCourse,
  type CourseModule, type InsertCourseModule,
  type Lesson, type InsertLesson,
  type Enrollment, type InsertEnrollment,
  type LessonProgress, type InsertLessonProgress,
  type Event, type InsertEvent,
  type EventAttendee, type InsertEventAttendee,
  type PostWithAuthor, type CommentWithAuthor, type CourseWithDetails,
  type MemberWithProfile, type EventWithDetails,
} from "@shared/schema";
import type { User } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, sql, and, gte, count } from "drizzle-orm";

// Pagination options
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// Paginated result
export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface IStorage {
  // Profiles
  getProfile(userId: string): Promise<Profile | undefined>;
  createOrUpdateProfile(data: InsertProfile): Promise<Profile>;

  // Posts
  getPosts(userId?: string, pagination?: PaginationOptions): Promise<PaginatedResult<PostWithAuthor>>;
  getPostsByAuthor(authorId: string, userId?: string): Promise<PostWithAuthor[]>;
  getPost(id: string, userId?: string): Promise<PostWithAuthor | undefined>;
  createPost(data: InsertPost): Promise<Post>;
  updatePost(id: string, data: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: string): Promise<boolean>;

  // Post Likes
  toggleLike(postId: string, userId: string): Promise<boolean>;

  // Comments
  getComments(postId: string): Promise<CommentWithAuthor[]>;
  getComment(id: string): Promise<Comment | undefined>;
  createComment(data: InsertComment): Promise<Comment>;
  deleteComment(id: string): Promise<boolean>;

  // Courses
  getCourses(userId?: string, pagination?: PaginationOptions): Promise<PaginatedResult<CourseWithDetails>>;
  getCourse(id: string, userId?: string): Promise<CourseWithDetails | undefined>;
  createCourse(data: InsertCourse): Promise<Course>;
  updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<boolean>;

  // Enrollments
  getEnrollments(userId: string): Promise<string[]>;
  createEnrollment(data: InsertEnrollment): Promise<Enrollment>;

  // Course Modules and Lessons
  getModulesWithLessons(courseId: string): Promise<(CourseModule & { lessons: Lesson[] })[]>;

  // Lesson Progress
  updateLessonProgress(userId: string, lessonId: string, isCompleted: boolean): Promise<LessonProgress>;

  // Events
  getEvents(userId?: string, pagination?: PaginationOptions): Promise<PaginatedResult<EventWithDetails>>;
  getEvent(id: string, userId?: string): Promise<EventWithDetails | undefined>;
  getUpcomingEvents(userId?: string, limit?: number): Promise<EventWithDetails[]>;
  createEvent(data: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;

  // Event RSVP
  updateRsvp(eventId: string, userId: string, status: string): Promise<EventAttendee>;

  // Members
  getMembers(pagination?: PaginationOptions): Promise<PaginatedResult<MemberWithProfile>>;
  getMember(id: string): Promise<MemberWithProfile | undefined>;
  getLeaderboard(limit?: number): Promise<MemberWithProfile[]>;

  // Points
  addPoints(userId: string, points: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Profiles
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async createOrUpdateProfile(data: InsertProfile): Promise<Profile> {
    const [profile] = await db
      .insert(profiles)
      .values(data)
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...data },
      })
      .returning();
    return profile;
  }

  // Posts
  async getPosts(userId?: string, pagination?: PaginationOptions): Promise<PaginatedResult<PostWithAuthor>> {
    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;

    // Get total count
    const [totalResult] = await db.select({ count: count() }).from(posts);
    const total = Number(totalResult?.count || 0);

    const result = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.isPinned), desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const postsWithCounts = await Promise.all(
      result.map(async (r) => {
        const [likesResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(postLikes)
          .where(eq(postLikes.postId, r.post.id));

        const [commentsResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(comments)
          .where(eq(comments.postId, r.post.id));

        let isLiked = false;
        if (userId) {
          const [userLike] = await db
            .select()
            .from(postLikes)
            .where(and(eq(postLikes.postId, r.post.id), eq(postLikes.userId, userId)));
          isLiked = !!userLike;
        }

        return {
          ...r.post,
          author: r.author!,
          likesCount: Number(likesResult?.count || 0),
          commentsCount: Number(commentsResult?.count || 0),
          isLiked,
        };
      })
    );

    return { data: postsWithCounts, total };
  }

  async getPostsByAuthor(authorId: string, userId?: string): Promise<PostWithAuthor[]> {
    const result = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.authorId, authorId))
      .orderBy(desc(posts.createdAt));

    const postsWithCounts = await Promise.all(
      result.map(async (r) => {
        const [likesResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(postLikes)
          .where(eq(postLikes.postId, r.post.id));
        
        const [commentsResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(comments)
          .where(eq(comments.postId, r.post.id));

        let isLiked = false;
        if (userId) {
          const [userLike] = await db
            .select()
            .from(postLikes)
            .where(and(eq(postLikes.postId, r.post.id), eq(postLikes.userId, userId)));
          isLiked = !!userLike;
        }

        return {
          ...r.post,
          author: r.author!,
          likesCount: Number(likesResult?.count || 0),
          commentsCount: Number(commentsResult?.count || 0),
          isLiked,
        };
      })
    );

    return postsWithCounts;
  }

  async getPost(id: string, userId?: string): Promise<PostWithAuthor | undefined> {
    const [result] = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, id));

    if (!result) return undefined;

    const [likesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postLikes)
      .where(eq(postLikes.postId, id));
    
    const [commentsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.postId, id));

    let isLiked = false;
    if (userId) {
      const [userLike] = await db
        .select()
        .from(postLikes)
        .where(and(eq(postLikes.postId, id), eq(postLikes.userId, userId)));
      isLiked = !!userLike;
    }

    return {
      ...result.post,
      author: result.author!,
      likesCount: Number(likesResult?.count || 0),
      commentsCount: Number(commentsResult?.count || 0),
      isLiked,
    };
  }

  async createPost(data: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(data).returning();
    // Award points for creating a post
    await this.addPoints(data.authorId, 10);
    return post;
  }

  async updatePost(id: string, data: Partial<InsertPost>): Promise<Post | undefined> {
    const [post] = await db.update(posts).set(data).where(eq(posts.id, id)).returning();
    return post;
  }

  async deletePost(id: string): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id));
    return true;
  }

  // Post Likes
  async toggleLike(postId: string, userId: string): Promise<boolean> {
    const [existingLike] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

    if (existingLike) {
      await db.delete(postLikes).where(eq(postLikes.id, existingLike.id));
      return false;
    } else {
      await db.insert(postLikes).values({ postId, userId });
      // Award points for liking
      const [post] = await db.select().from(posts).where(eq(posts.id, postId));
      if (post) {
        await this.addPoints(post.authorId, 1);
      }
      return true;
    }
  }

  // Comments
  async getComments(postId: string): Promise<CommentWithAuthor[]> {
    const result = await db
      .select({
        comment: comments,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);

    return result.map((r) => ({
      ...r.comment,
      author: r.author!,
    }));
  }

  async createComment(data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    // Award points for commenting
    await this.addPoints(data.authorId, 5);
    return comment;
  }

  async getComment(id: string): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }

  async deleteComment(id: string): Promise<boolean> {
    await db.delete(comments).where(eq(comments.id, id));
    return true;
  }

  // Courses
  async getCourses(userId?: string, pagination?: PaginationOptions): Promise<PaginatedResult<CourseWithDetails>> {
    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;

    // Get total count
    const [totalResult] = await db.select({ count: count() }).from(courses).where(eq(courses.isPublished, true));
    const total = Number(totalResult?.count || 0);

    const result = await db
      .select({
        course: courses,
        instructor: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .where(eq(courses.isPublished, true))
      .orderBy(desc(courses.createdAt))
      .limit(limit)
      .offset(offset);

    const coursesWithDetails = await Promise.all(
      result.map(async (r) => {
        const modulesList = await db
          .select()
          .from(courseModules)
          .where(eq(courseModules.courseId, r.course.id));

        let lessonsCount = 0;
        for (const mod of modulesList) {
          const [lessonCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(lessons)
            .where(eq(lessons.moduleId, mod.id));
          lessonsCount += Number(lessonCount?.count || 0);
        }

        const [enrollmentsResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(enrollments)
          .where(eq(enrollments.courseId, r.course.id));

        let progress: number | undefined;
        if (userId) {
          const [enrollment] = await db
            .select()
            .from(enrollments)
            .where(and(eq(enrollments.courseId, r.course.id), eq(enrollments.userId, userId)));

          if (enrollment && lessonsCount > 0) {
            let completedLessons = 0;
            for (const mod of modulesList) {
              const lessonsList = await db
                .select()
                .from(lessons)
                .where(eq(lessons.moduleId, mod.id));

              for (const lesson of lessonsList) {
                const [prog] = await db
                  .select()
                  .from(lessonProgress)
                  .where(and(
                    eq(lessonProgress.lessonId, lesson.id),
                    eq(lessonProgress.userId, userId),
                    eq(lessonProgress.isCompleted, true)
                  ));
                if (prog) completedLessons++;
              }
            }
            progress = Math.round((completedLessons / lessonsCount) * 100);
          }
        }

        return {
          ...r.course,
          instructor: r.instructor!,
          modulesCount: modulesList.length,
          lessonsCount,
          enrollmentsCount: Number(enrollmentsResult?.count || 0),
          progress,
        };
      })
    );

    return { data: coursesWithDetails, total };
  }

  async getCourse(id: string, userId?: string): Promise<CourseWithDetails | undefined> {
    const [result] = await db
      .select({
        course: courses,
        instructor: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .where(eq(courses.id, id));

    if (!result) return undefined;

    const modulesList = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, id));

    let lessonsCount = 0;
    for (const mod of modulesList) {
      const [lessonCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(lessons)
        .where(eq(lessons.moduleId, mod.id));
      lessonsCount += Number(lessonCount?.count || 0);
    }

    const [enrollmentsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.courseId, id));

    return {
      ...result.course,
      instructor: result.instructor!,
      modulesCount: modulesList.length,
      lessonsCount,
      enrollmentsCount: Number(enrollmentsResult?.count || 0),
    };
  }

  async createCourse(data: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(data).returning();
    return course;
  }

  async updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course | undefined> {
    const [course] = await db.update(courses).set(data).where(eq(courses.id, id)).returning();
    return course;
  }

  async deleteCourse(id: string): Promise<boolean> {
    await db.delete(courses).where(eq(courses.id, id));
    return true;
  }

  // Enrollments
  async getEnrollments(userId: string): Promise<string[]> {
    const result = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.userId, userId));
    return result.map((r) => r.courseId);
  }

  async createEnrollment(data: InsertEnrollment): Promise<Enrollment> {
    const [enrollment] = await db.insert(enrollments).values(data).returning();
    return enrollment;
  }

  // Course Modules and Lessons
  async getModulesWithLessons(courseId: string): Promise<(CourseModule & { lessons: Lesson[] })[]> {
    const modulesList = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(courseModules.orderIndex);

    const modulesWithLessons = await Promise.all(
      modulesList.map(async (mod) => {
        const lessonsList = await db
          .select()
          .from(lessons)
          .where(eq(lessons.moduleId, mod.id))
          .orderBy(lessons.orderIndex);
        
        return { ...mod, lessons: lessonsList };
      })
    );

    return modulesWithLessons;
  }

  // Lesson Progress
  async updateLessonProgress(userId: string, lessonId: string, isCompleted: boolean): Promise<LessonProgress> {
    const [existing] = await db
      .select()
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));

    if (existing) {
      const [updated] = await db
        .update(lessonProgress)
        .set({ isCompleted, completedAt: isCompleted ? new Date() : null })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(lessonProgress)
        .values({ userId, lessonId, isCompleted, completedAt: isCompleted ? new Date() : null })
        .returning();
      if (isCompleted) {
        await this.addPoints(userId, 20);
      }
      return created;
    }
  }

  // Events
  async getEvents(userId?: string, pagination?: PaginationOptions): Promise<PaginatedResult<EventWithDetails>> {
    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;

    // Get total count
    const [totalResult] = await db.select({ count: count() }).from(events);
    const total = Number(totalResult?.count || 0);

    const result = await db
      .select({
        event: events,
        creator: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(events)
      .leftJoin(users, eq(events.createdBy, users.id))
      .orderBy(events.startTime)
      .limit(limit)
      .offset(offset);

    const eventsWithDetails = await Promise.all(
      result.map(async (r) => {
        const [attendeesResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(eventAttendees)
          .where(and(eq(eventAttendees.eventId, r.event.id), eq(eventAttendees.status, "going")));

        let isAttending = false;
        if (userId) {
          const [userAttending] = await db
            .select()
            .from(eventAttendees)
            .where(and(
              eq(eventAttendees.eventId, r.event.id),
              eq(eventAttendees.userId, userId),
              eq(eventAttendees.status, "going")
            ));
          isAttending = !!userAttending;
        }

        return {
          ...r.event,
          creator: r.creator!,
          attendeesCount: Number(attendeesResult?.count || 0),
          isAttending,
        };
      })
    );

    return { data: eventsWithDetails, total };
  }

  async getUpcomingEvents(userId?: string, limit = 5): Promise<EventWithDetails[]> {
    const now = new Date();
    const result = await db
      .select({
        event: events,
        creator: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(events)
      .leftJoin(users, eq(events.createdBy, users.id))
      .where(gte(events.startTime, now))
      .orderBy(events.startTime)
      .limit(limit);

    const eventsWithDetails = await Promise.all(
      result.map(async (r) => {
        const [attendeesResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(eventAttendees)
          .where(and(eq(eventAttendees.eventId, r.event.id), eq(eventAttendees.status, "going")));

        let isAttending = false;
        if (userId) {
          const [userAttending] = await db
            .select()
            .from(eventAttendees)
            .where(and(
              eq(eventAttendees.eventId, r.event.id),
              eq(eventAttendees.userId, userId),
              eq(eventAttendees.status, "going")
            ));
          isAttending = !!userAttending;
        }

        return {
          ...r.event,
          creator: r.creator!,
          attendeesCount: Number(attendeesResult?.count || 0),
          isAttending,
        };
      })
    );

    return eventsWithDetails;
  }

  async createEvent(data: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(data).returning();
    return event;
  }

  async getEvent(id: string, userId?: string): Promise<EventWithDetails | undefined> {
    const [result] = await db
      .select({
        event: events,
        creator: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(events)
      .leftJoin(users, eq(events.createdBy, users.id))
      .where(eq(events.id, id));

    if (!result) return undefined;

    const [attendeesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, id), eq(eventAttendees.status, "going")));

    let isAttending = false;
    if (userId) {
      const [userAttending] = await db
        .select()
        .from(eventAttendees)
        .where(and(
          eq(eventAttendees.eventId, id),
          eq(eventAttendees.userId, userId),
          eq(eventAttendees.status, "going")
        ));
      isAttending = !!userAttending;
    }

    return {
      ...result.event,
      creator: result.creator!,
      attendeesCount: Number(attendeesResult?.count || 0),
      isAttending,
    };
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return event;
  }

  async deleteEvent(id: string): Promise<boolean> {
    await db.delete(events).where(eq(events.id, id));
    return true;
  }

  // Event RSVP
  async updateRsvp(eventId: string, userId: string, status: string): Promise<EventAttendee> {
    const [existing] = await db
      .select()
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));

    if (existing) {
      const [updated] = await db
        .update(eventAttendees)
        .set({ status })
        .where(eq(eventAttendees.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(eventAttendees)
        .values({ eventId, userId, status })
        .returning();
      return created;
    }
  }

  // Members
  async getMembers(pagination?: PaginationOptions): Promise<PaginatedResult<MemberWithProfile>> {
    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;

    // Get total count
    const [totalResult] = await db.select({ count: count() }).from(users);
    const total = Number(totalResult?.count || 0);

    const result = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        email: users.email,
      })
      .from(users)
      .limit(limit)
      .offset(offset);

    const membersWithProfiles = await Promise.all(
      result.map(async (user) => {
        const [profile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, user.id));

        return {
          ...user,
          profile: profile || null,
        };
      })
    );

    return { data: membersWithProfiles, total };
  }

  async getMember(id: string): Promise<MemberWithProfile | undefined> {
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, id));

    if (!user) return undefined;

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, id));

    return {
      ...user,
      profile: profile || null,
    };
  }

  async getLeaderboard(limit = 20): Promise<MemberWithProfile[]> {
    const allProfiles = await db
      .select()
      .from(profiles)
      .orderBy(desc(profiles.points))
      .limit(limit);

    const leaderboard = await Promise.all(
      allProfiles.map(async (profile) => {
        const [user] = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, profile.userId));

        return {
          ...user!,
          profile,
        };
      })
    );

    return leaderboard.filter((m) => m.id);
  }

  // Points
  async addPoints(userId: string, points: number): Promise<void> {
    const [existing] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (existing) {
      await db
        .update(profiles)
        .set({ points: (existing.points || 0) + points })
        .where(eq(profiles.id, existing.id));
    } else {
      await db.insert(profiles).values({ userId, points });
    }
  }
}

export const storage = new DatabaseStorage();
