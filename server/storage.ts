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
  type PostWithAuthor, type CommentWithAuthor, type CommentWithReplyCount, type CourseWithDetails,
  type MemberWithProfile, type EventWithDetails, type EventAttendeesGrouped,
} from "@shared/schema";
import type { User } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, sql, and, gte, count, isNull } from "drizzle-orm";

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

// Profile update data type
export interface ProfileUpdateData {
  bio?: string;
  location?: string;
  website?: string;
  coverImageUrl?: string;
}

export interface IStorage {
  // Profiles
  getProfile(userId: string): Promise<Profile | undefined>;
  createOrUpdateProfile(data: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, data: ProfileUpdateData): Promise<Profile | undefined>;

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
  getComments(postId: string): Promise<CommentWithReplyCount[]>;
  getCommentReplies(parentId: string): Promise<CommentWithReplyCount[]>;
  getComment(id: string): Promise<Comment | undefined>;
  getCommentWithAuthor(id: string): Promise<CommentWithAuthor | undefined>;
  createComment(data: InsertComment): Promise<Comment>;
  updateComment(id: string, data: { content: string }): Promise<Comment | undefined>;
  deleteComment(id: string): Promise<boolean>;

  // Courses
  getCourses(userId?: string, pagination?: PaginationOptions): Promise<PaginatedResult<CourseWithDetails>>;
  getCourse(id: string, userId?: string): Promise<CourseWithDetails | undefined>;
  createCourse(data: InsertCourse): Promise<Course>;
  updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<boolean>;

  // Enrollments
  getEnrollments(userId: string): Promise<string[]>;
  getEnrolledCoursesWithDetails(userId: string): Promise<CourseWithDetails[]>;
  createEnrollment(data: InsertEnrollment): Promise<Enrollment>;

  // Course Modules and Lessons
  getModulesWithLessons(courseId: string): Promise<(CourseModule & { lessons: Lesson[] })[]>;

  // Lesson Progress
  getLessonProgress(userId: string, lessonId: string): Promise<LessonProgress | undefined>;
  getCourseLessonProgress(userId: string, courseId: string): Promise<Record<string, boolean>>;
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
  getEventAttendees(eventId: string): Promise<EventAttendeesGrouped>;

  // Members
  getMembers(pagination?: PaginationOptions): Promise<PaginatedResult<MemberWithProfile>>;
  getMember(id: string): Promise<MemberWithProfile | undefined>;
  getLeaderboard(limit?: number): Promise<MemberWithProfile[]>;

  // Points
  addPoints(userId: string, points: number): Promise<void>;

  // Lessons
  getLesson(id: string): Promise<(Lesson & { module: CourseModule }) | undefined>;
  getLessonsByModule(moduleId: string): Promise<Lesson[]>;
  createLesson(data: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, data: Partial<InsertLesson>): Promise<Lesson | undefined>;
  deleteLesson(id: string): Promise<boolean>;

  // Module CRUD
  getModule(id: string): Promise<CourseModule | undefined>;
  getModulesByCourse(courseId: string): Promise<CourseModule[]>;
  createModule(data: InsertCourseModule): Promise<CourseModule>;
  updateModule(id: string, data: Partial<InsertCourseModule>): Promise<CourseModule | undefined>;
  deleteModule(id: string): Promise<boolean>;

  // Reordering
  reorderModules(courseId: string, moduleIds: string[]): Promise<void>;
  reorderLessons(moduleId: string, lessonIds: string[]): Promise<void>;
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

  async updateProfile(userId: string, data: ProfileUpdateData): Promise<Profile | undefined> {
    // First check if profile exists
    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));

    if (existing) {
      // Update existing profile
      const [updated] = await db
        .update(profiles)
        .set(data)
        .where(eq(profiles.userId, userId))
        .returning();
      return updated;
    } else {
      // Create new profile with the update data
      const [created] = await db
        .insert(profiles)
        .values({ userId, ...data })
        .returning();
      return created;
    }
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
  async getComments(postId: string): Promise<CommentWithReplyCount[]> {
    // Get only top-level comments (where parentId is null)
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
      .where(and(eq(comments.postId, postId), isNull(comments.parentId)))
      .orderBy(comments.createdAt);

    // Get reply counts for each comment
    const commentsWithReplyCounts = await Promise.all(
      result.map(async (r) => {
        const [replyCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(comments)
          .where(eq(comments.parentId, r.comment.id));

        return {
          ...r.comment,
          author: r.author!,
          replyCount: Number(replyCountResult?.count || 0),
        };
      })
    );

    return commentsWithReplyCounts;
  }

  async getCommentReplies(parentId: string): Promise<CommentWithReplyCount[]> {
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
      .where(eq(comments.parentId, parentId))
      .orderBy(comments.createdAt);

    // Get reply counts for each reply (for nested threading support)
    const repliesWithCounts = await Promise.all(
      result.map(async (r) => {
        const [replyCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(comments)
          .where(eq(comments.parentId, r.comment.id));

        return {
          ...r.comment,
          author: r.author!,
          replyCount: Number(replyCountResult?.count || 0),
        };
      })
    );

    return repliesWithCounts;
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

  async getCommentWithAuthor(id: string): Promise<CommentWithAuthor | undefined> {
    const [result] = await db
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
      .where(eq(comments.id, id));

    if (!result) return undefined;

    return {
      ...result.comment,
      author: result.author!,
    };
  }

  async updateComment(id: string, data: { content: string }): Promise<Comment | undefined> {
    const [comment] = await db.update(comments).set(data).where(eq(comments.id, id)).returning();
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

  async getEnrolledCoursesWithDetails(userId: string): Promise<CourseWithDetails[]> {
    // Get all enrollments for this user
    const userEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.userId, userId));

    if (userEnrollments.length === 0) {
      return [];
    }

    const courseIds = userEnrollments.map((e) => e.courseId);

    // Get course details for each enrolled course
    const coursesWithDetails: CourseWithDetails[] = [];

    for (const courseId of courseIds) {
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
        .where(eq(courses.id, courseId));

      if (!result) continue;

      const modulesList = await db
        .select()
        .from(courseModules)
        .where(eq(courseModules.courseId, courseId));

      let lessonsCount = 0;
      let completedLessons = 0;

      for (const mod of modulesList) {
        const lessonsList = await db
          .select()
          .from(lessons)
          .where(eq(lessons.moduleId, mod.id));

        lessonsCount += lessonsList.length;

        for (const lesson of lessonsList) {
          const [prog] = await db
            .select()
            .from(lessonProgress)
            .where(
              and(
                eq(lessonProgress.lessonId, lesson.id),
                eq(lessonProgress.userId, userId),
                eq(lessonProgress.isCompleted, true)
              )
            );
          if (prog) completedLessons++;
        }
      }

      const [enrollmentsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(enrollments)
        .where(eq(enrollments.courseId, courseId));

      const progress = lessonsCount > 0 ? Math.round((completedLessons / lessonsCount) * 100) : 0;

      coursesWithDetails.push({
        ...result.course,
        instructor: result.instructor!,
        modulesCount: modulesList.length,
        lessonsCount,
        enrollmentsCount: Number(enrollmentsResult?.count || 0),
        progress,
      });
    }

    return coursesWithDetails;
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
  async getLessonProgress(userId: string, lessonId: string): Promise<LessonProgress | undefined> {
    const [progress] = await db
      .select()
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
    return progress;
  }

  async getCourseLessonProgress(userId: string, courseId: string): Promise<Record<string, boolean>> {
    // Get all modules for this course
    const modulesList = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId));

    // Get all lessons for these modules
    const lessonIds: string[] = [];
    for (const mod of modulesList) {
      const lessonsList = await db
        .select({ id: lessons.id })
        .from(lessons)
        .where(eq(lessons.moduleId, mod.id));
      lessonIds.push(...lessonsList.map(l => l.id));
    }

    // Get progress for all lessons
    const progressMap: Record<string, boolean> = {};
    if (lessonIds.length > 0) {
      const progressList = await db
        .select()
        .from(lessonProgress)
        .where(and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.isCompleted, true)
        ));

      // Initialize all lessons as not completed
      for (const lessonId of lessonIds) {
        progressMap[lessonId] = false;
      }

      // Mark completed lessons
      for (const prog of progressList) {
        if (lessonIds.includes(prog.lessonId)) {
          progressMap[prog.lessonId] = true;
        }
      }
    }

    return progressMap;
  }

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

  // Events - helper to get RSVP counts and user status
  private async getEventRsvpDetails(eventId: string, userId?: string) {
    // Get counts for each status
    const [goingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.status, "going")));

    const [maybeResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.status, "maybe")));

    const [notGoingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.status, "not_going")));

    let userRsvpStatus: "going" | "maybe" | "not_going" | null = null;
    if (userId) {
      const [userRsvp] = await db
        .select()
        .from(eventAttendees)
        .where(and(
          eq(eventAttendees.eventId, eventId),
          eq(eventAttendees.userId, userId)
        ));
      if (userRsvp) {
        userRsvpStatus = userRsvp.status as "going" | "maybe" | "not_going";
      }
    }

    const goingCount = Number(goingResult?.count || 0);
    const maybeCount = Number(maybeResult?.count || 0);
    const notGoingCount = Number(notGoingResult?.count || 0);

    return {
      goingCount,
      maybeCount,
      notGoingCount,
      attendeesCount: goingCount, // For backwards compatibility, attendeesCount = goingCount
      isAttending: userRsvpStatus === "going",
      userRsvpStatus,
    };
  }

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
        const rsvpDetails = await this.getEventRsvpDetails(r.event.id, userId);

        return {
          ...r.event,
          creator: r.creator!,
          ...rsvpDetails,
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
        const rsvpDetails = await this.getEventRsvpDetails(r.event.id, userId);

        return {
          ...r.event,
          creator: r.creator!,
          ...rsvpDetails,
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

    const rsvpDetails = await this.getEventRsvpDetails(id, userId);

    return {
      ...result.event,
      creator: result.creator!,
      ...rsvpDetails,
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

  async getEventAttendees(eventId: string): Promise<EventAttendeesGrouped> {
    // Get all attendees for the event
    const attendeeRecords = await db
      .select({
        attendee: eventAttendees,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          email: users.email,
        },
      })
      .from(eventAttendees)
      .leftJoin(users, eq(eventAttendees.userId, users.id))
      .where(eq(eventAttendees.eventId, eventId));

    // Build members with profiles for each attendee
    const attendeesWithProfiles = await Promise.all(
      attendeeRecords.map(async (record) => {
        const [profile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, record.user!.id));

        return {
          status: record.attendee.status,
          member: {
            ...record.user!,
            profile: profile || null,
          } as MemberWithProfile,
        };
      })
    );

    // Group by RSVP status
    const going: MemberWithProfile[] = [];
    const maybe: MemberWithProfile[] = [];
    const notGoing: MemberWithProfile[] = [];

    for (const attendee of attendeesWithProfiles) {
      switch (attendee.status) {
        case "going":
          going.push(attendee.member);
          break;
        case "maybe":
          maybe.push(attendee.member);
          break;
        case "not_going":
          notGoing.push(attendee.member);
          break;
      }
    }

    return { going, maybe, notGoing };
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

  // Lessons
  async getLesson(id: string): Promise<(Lesson & { module: CourseModule }) | undefined> {
    const [result] = await db
      .select({
        lesson: lessons,
        module: courseModules,
      })
      .from(lessons)
      .leftJoin(courseModules, eq(lessons.moduleId, courseModules.id))
      .where(eq(lessons.id, id));

    if (!result || !result.module) return undefined;

    return {
      ...result.lesson,
      module: result.module,
    };
  }

  async getLessonsByModule(moduleId: string): Promise<Lesson[]> {
    return db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(lessons.orderIndex);
  }

  async createLesson(data: InsertLesson): Promise<Lesson> {
    const [lesson] = await db.insert(lessons).values(data).returning();
    return lesson;
  }

  async updateLesson(id: string, data: Partial<InsertLesson>): Promise<Lesson | undefined> {
    const [lesson] = await db.update(lessons).set(data).where(eq(lessons.id, id)).returning();
    return lesson;
  }

  async deleteLesson(id: string): Promise<boolean> {
    // lessonProgress records are deleted automatically via cascade (onDelete: "cascade" in schema)
    await db.delete(lessons).where(eq(lessons.id, id));
    return true;
  }

  // Module CRUD
  async getModule(id: string): Promise<CourseModule | undefined> {
    const [module] = await db.select().from(courseModules).where(eq(courseModules.id, id));
    return module;
  }

  async getModulesByCourse(courseId: string): Promise<CourseModule[]> {
    return db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(courseModules.orderIndex);
  }

  async createModule(data: InsertCourseModule): Promise<CourseModule> {
    const [module] = await db.insert(courseModules).values(data).returning();
    return module;
  }

  async updateModule(id: string, data: Partial<InsertCourseModule>): Promise<CourseModule | undefined> {
    const [module] = await db.update(courseModules).set(data).where(eq(courseModules.id, id)).returning();
    return module;
  }

  async deleteModule(id: string): Promise<boolean> {
    // Lessons are deleted automatically via cascade (onDelete: "cascade" in schema)
    await db.delete(courseModules).where(eq(courseModules.id, id));
    return true;
  }

  // Reordering
  async reorderModules(courseId: string, moduleIds: string[]): Promise<void> {
    // Validate that all moduleIds exist and belong to the correct course
    const existingModules = await db
      .select({ id: courseModules.id })
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId));

    const existingIds = new Set(existingModules.map(m => m.id));

    // Check all provided IDs exist and belong to this course
    for (const moduleId of moduleIds) {
      if (!existingIds.has(moduleId)) {
        throw new Error(`Module ${moduleId} not found or does not belong to course ${courseId}`);
      }
    }

    // Update each module's orderIndex based on its position in the array
    for (let i = 0; i < moduleIds.length; i++) {
      await db
        .update(courseModules)
        .set({ orderIndex: i })
        .where(eq(courseModules.id, moduleIds[i]));
    }
  }

  async reorderLessons(moduleId: string, lessonIds: string[]): Promise<void> {
    // Validate that all lessonIds exist and belong to the correct module
    const existingLessons = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId));

    const existingIds = new Set(existingLessons.map(l => l.id));

    // Check all provided IDs exist and belong to this module
    for (const lessonId of lessonIds) {
      if (!existingIds.has(lessonId)) {
        throw new Error(`Lesson ${lessonId} not found or does not belong to module ${moduleId}`);
      }
    }

    // Update each lesson's orderIndex based on its position in the array
    for (let i = 0; i < lessonIds.length; i++) {
      await db
        .update(lessons)
        .set({ orderIndex: i })
        .where(eq(lessons.id, lessonIds[i]));
    }
  }
}

export const storage = new DatabaseStorage();
