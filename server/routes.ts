import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { insertPostSchema, insertCommentSchema, insertCourseSchema, insertCourseModuleSchema, insertEventSchema, insertLessonSchema } from "@shared/schema";
import { z } from "zod";

// Validation schemas
const updatePostSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1).optional(),
  category: z.enum(["discussion", "announcement", "question"]).optional(),
  isPinned: z.boolean().optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isPublished: z.boolean().optional(),
});

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
  duration: z.number().min(0).optional(),
  orderIndex: z.number().min(0).optional(),
});

const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  orderIndex: z.number().min(0).optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
});

const rsvpStatusSchema = z.enum(["going", "maybe", "not_going"]);

// Profile update schema with URL validation
const updateProfileSchema = z.object({
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url("Invalid URL format").optional().or(z.literal("")),
  coverImageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

// Pagination schema
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Pagination response type
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Helper to get user ID from request
  const getUserId = (req: any): string | undefined => {
    return req.user?.claims?.sub;
  };

  // ===== Posts =====
  app.get("/api/posts", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { limit, offset } = paginationSchema.parse(req.query);
      const result = await storage.getPosts(userId, { limit, offset });

      const response: PaginatedResponse<typeof result.data[0]> = {
        data: result.data,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + result.data.length < result.total,
        },
      };
      res.json(response);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      const post = await storage.getPost(req.params.id, userId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.post("/api/posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const data = insertPostSchema.parse({
        ...req.body,
        authorId: userId,
      });

      const post = await storage.createPost(data);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.post("/api/posts/:id/like", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const isLiked = await storage.toggleLike(req.params.id, userId);
      res.json({ isLiked });
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  app.patch("/api/posts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check ownership
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.author.id !== userId) {
        return res.status(403).json({ message: "You can only edit your own posts" });
      }

      const data = updatePostSchema.parse(req.body);
      const updated = await storage.updatePost(req.params.id, data);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check ownership
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.author.id !== userId) {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }

      await storage.deletePost(req.params.id);
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // ===== Comments =====
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.postId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/posts/:postId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Validate parentId if provided
      if (req.body.parentId) {
        const parentComment = await storage.getComment(req.body.parentId);
        if (!parentComment) {
          return res.status(400).json({ message: "Parent comment not found" });
        }
        // Ensure parent comment belongs to the same post
        if (parentComment.postId !== req.params.postId) {
          return res.status(400).json({ message: "Parent comment does not belong to this post" });
        }
      }

      const data = insertCommentSchema.parse({
        ...req.body,
        postId: req.params.postId,
        authorId: userId,
      });

      const comment = await storage.createComment(data);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.patch("/api/comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check ownership
      const comment = await storage.getComment(req.params.id);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      if (comment.authorId !== userId) {
        return res.status(403).json({ message: "You can only edit your own comments" });
      }

      const data = updateCommentSchema.parse(req.body);
      await storage.updateComment(req.params.id, data);

      // Return updated comment with author info
      const updatedComment = await storage.getCommentWithAuthor(req.params.id);
      res.json(updatedComment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  app.delete("/api/comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check ownership
      const comment = await storage.getComment(req.params.id);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      if (comment.authorId !== userId) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }

      await storage.deleteComment(req.params.id);
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Get replies to a specific comment
  app.get("/api/comments/:id/replies", async (req, res) => {
    try {
      // Verify parent comment exists
      const parentComment = await storage.getComment(req.params.id);
      if (!parentComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      const replies = await storage.getCommentReplies(req.params.id);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching comment replies:", error);
      res.status(500).json({ message: "Failed to fetch comment replies" });
    }
  });

  // ===== Courses =====
  app.get("/api/courses", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { limit, offset } = paginationSchema.parse(req.query);
      const result = await storage.getCourses(userId, { limit, offset });

      const response: PaginatedResponse<typeof result.data[0]> = {
        data: result.data,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + result.data.length < result.total,
        },
      };
      res.json(response);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      const course = await storage.getCourse(req.params.id, userId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.get("/api/courses/:id/modules", async (req, res) => {
    try {
      const modules = await storage.getModulesWithLessons(req.params.id);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.get("/api/courses/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const progress = await storage.getCourseLessonProgress(userId, req.params.id);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching course progress:", error);
      res.status(500).json({ message: "Failed to fetch course progress" });
    }
  });

  // Create module for a course (instructor only)
  app.post("/api/courses/:courseId/modules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check course exists and user is the instructor
      const course = await storage.getCourse(req.params.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the instructor can add modules to this course" });
      }

      const data = insertCourseModuleSchema.parse({
        ...req.body,
        courseId: req.params.courseId,
      });

      const module = await storage.createModule(data);
      res.status(201).json(module);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating module:", error);
      res.status(500).json({ message: "Failed to create module" });
    }
  });

  // Update module (instructor only)
  app.patch("/api/modules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Get module to find the course
      const module = await storage.getModule(req.params.id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Check course ownership
      const course = await storage.getCourse(module.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the instructor can edit this module" });
      }

      const data = updateModuleSchema.parse(req.body);
      const updated = await storage.updateModule(req.params.id, data);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating module:", error);
      res.status(500).json({ message: "Failed to update module" });
    }
  });

  // Delete module (instructor only)
  app.delete("/api/modules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Get module to find the course
      const module = await storage.getModule(req.params.id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Check course ownership
      const course = await storage.getCourse(module.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the instructor can delete this module" });
      }

      await storage.deleteModule(req.params.id);
      res.json({ message: "Module deleted successfully" });
    } catch (error) {
      console.error("Error deleting module:", error);
      res.status(500).json({ message: "Failed to delete module" });
    }
  });

  // Reorder modules within a course (instructor only)
  app.put("/api/courses/:courseId/modules/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check course exists and user is the instructor
      const course = await storage.getCourse(req.params.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the instructor can reorder modules" });
      }

      // Validate request body
      const { moduleIds } = req.body;
      if (!Array.isArray(moduleIds)) {
        return res.status(400).json({ message: "moduleIds must be an array of strings" });
      }

      await storage.reorderModules(req.params.courseId, moduleIds);
      res.json({ message: "Modules reordered successfully" });
    } catch (error: any) {
      if (error.message?.includes("not found or does not belong")) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error reordering modules:", error);
      res.status(500).json({ message: "Failed to reorder modules" });
    }
  });

  // Reorder lessons within a module (instructor only)
  app.put("/api/modules/:moduleId/lessons/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Get module to find the course
      const module = await storage.getModule(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Check course ownership
      const course = await storage.getCourse(module.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the instructor can reorder lessons" });
      }

      // Validate request body
      const { lessonIds } = req.body;
      if (!Array.isArray(lessonIds)) {
        return res.status(400).json({ message: "lessonIds must be an array of strings" });
      }

      await storage.reorderLessons(req.params.moduleId, lessonIds);
      res.json({ message: "Lessons reordered successfully" });
    } catch (error: any) {
      if (error.message?.includes("not found or does not belong")) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error reordering lessons:", error);
      res.status(500).json({ message: "Failed to reorder lessons" });
    }
  });

  app.post("/api/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const data = insertCourseSchema.parse({
        ...req.body,
        instructorId: userId,
      });

      const course = await storage.createCourse(data);
      res.status(201).json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  app.patch("/api/courses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check ownership (instructor only)
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the instructor can edit this course" });
      }

      const data = updateCourseSchema.parse(req.body);
      const updated = await storage.updateCourse(req.params.id, data);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  app.delete("/api/courses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check ownership (instructor only)
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the instructor can delete this course" });
      }

      await storage.deleteCourse(req.params.id);
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  app.post("/api/courses/:id/enroll", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const enrollment = await storage.createEnrollment({
        userId,
        courseId: req.params.id,
      });
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error enrolling:", error);
      res.status(500).json({ message: "Failed to enroll" });
    }
  });

  app.get("/api/enrollments/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const enrolledCourseIds = await storage.getEnrollments(userId);
      res.json(enrolledCourseIds);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.get("/api/enrollments/my/details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const enrolledCourses = await storage.getEnrolledCoursesWithDetails(userId);
      res.json(enrolledCourses);
    } catch (error) {
      console.error("Error fetching enrolled courses with details:", error);
      res.status(500).json({ message: "Failed to fetch enrolled courses" });
    }
  });

  app.patch("/api/lessons/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { isCompleted } = req.body;
      const progress = await storage.updateLessonProgress(userId, req.params.id, isCompleted);
      res.json(progress);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // ===== Lessons =====
  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const lesson = await storage.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ message: "Failed to fetch lesson" });
    }
  });

  app.get("/api/lessons/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const progress = await storage.getLessonProgress(userId, req.params.id);
      res.json(progress || { isCompleted: false });
    } catch (error) {
      console.error("Error fetching lesson progress:", error);
      res.status(500).json({ message: "Failed to fetch lesson progress" });
    }
  });

  app.get("/api/modules/:moduleId/lessons", async (req, res) => {
    try {
      // Verify module exists
      const module = await storage.getModule(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      const lessons = await storage.getLessonsByModule(req.params.moduleId);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.post("/api/modules/:moduleId/lessons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Verify module exists and get course info for authorization
      const module = await storage.getModule(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Check if user is the course instructor
      const course = await storage.getCourse(module.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the course instructor can create lessons" });
      }

      const data = insertLessonSchema.parse({
        ...req.body,
        moduleId: req.params.moduleId,
      });

      const lesson = await storage.createLesson(data);
      res.status(201).json(lesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating lesson:", error);
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  app.patch("/api/lessons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Get lesson with module info
      const lesson = await storage.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Check if user is the course instructor
      const course = await storage.getCourse(lesson.module.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the course instructor can update lessons" });
      }

      const data = updateLessonSchema.parse(req.body);
      const updated = await storage.updateLesson(req.params.id, data);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating lesson:", error);
      res.status(500).json({ message: "Failed to update lesson" });
    }
  });

  app.delete("/api/lessons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Get lesson with module info
      const lesson = await storage.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Check if user is the course instructor
      const course = await storage.getCourse(lesson.module.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the course instructor can delete lessons" });
      }

      await storage.deleteLesson(req.params.id);
      res.json({ message: "Lesson deleted successfully" });
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  // Reorder modules within a course (instructor only)
  app.put("/api/courses/:courseId/modules/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check course exists and user is the instructor
      const course = await storage.getCourse(req.params.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the instructor can reorder modules" });
      }

      const { moduleIds } = req.body;
      if (!Array.isArray(moduleIds)) {
        return res.status(400).json({ message: "moduleIds must be an array" });
      }

      await storage.reorderModules(req.params.courseId, moduleIds);
      res.json({ message: "Modules reordered successfully" });
    } catch (error) {
      console.error("Error reordering modules:", error);
      res.status(500).json({ message: "Failed to reorder modules" });
    }
  });

  // Reorder lessons within a module (instructor only)
  app.put("/api/modules/:moduleId/lessons/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Get module to find the course
      const module = await storage.getModule(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Check course ownership
      const course = await storage.getCourse(module.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructor.id !== userId) {
        return res.status(403).json({ message: "Only the instructor can reorder lessons" });
      }

      const { lessonIds } = req.body;
      if (!Array.isArray(lessonIds)) {
        return res.status(400).json({ message: "lessonIds must be an array" });
      }

      await storage.reorderLessons(req.params.moduleId, lessonIds);
      res.json({ message: "Lessons reordered successfully" });
    } catch (error) {
      console.error("Error reordering lessons:", error);
      res.status(500).json({ message: "Failed to reorder lessons" });
    }
  });

  // ===== Events =====
  app.get("/api/events", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { limit, offset } = paginationSchema.parse(req.query);
      const result = await storage.getEvents(userId, { limit, offset });

      const response: PaginatedResponse<typeof result.data[0]> = {
        data: result.data,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + result.data.length < result.total,
        },
      };
      res.json(response);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/upcoming", async (req, res) => {
    try {
      const userId = getUserId(req);
      const events = await storage.getUpcomingEvents(userId, 5);
      res.json(events);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const data = insertEventSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const event = await storage.createEvent(data);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      const event = await storage.getEvent(req.params.id, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.patch("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check ownership (creator only)
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (event.creator.id !== userId) {
        return res.status(403).json({ message: "Only the event creator can edit this event" });
      }

      const data = updateEventSchema.parse(req.body);
      // Convert datetime strings to Date objects if present
      const updateData: any = { ...data };
      if (data.startTime) updateData.startTime = new Date(data.startTime);
      if (data.endTime) updateData.endTime = new Date(data.endTime);

      const updated = await storage.updateEvent(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check ownership (creator only)
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (event.creator.id !== userId) {
        return res.status(403).json({ message: "Only the event creator can delete this event" });
      }

      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.post("/api/events/:id/rsvp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Validate RSVP status
      const status = rsvpStatusSchema.parse(req.body.status);

      // Verify event exists
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const rsvp = await storage.updateRsvp(req.params.id, userId, status);
      res.json(rsvp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status. Must be 'going', 'maybe', or 'not_going'" });
      }
      console.error("Error updating RSVP:", error);
      res.status(500).json({ message: "Failed to update RSVP" });
    }
  });

  app.get("/api/events/:id/attendees", async (req, res) => {
    try {
      // Verify event exists
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const attendees = await storage.getEventAttendees(req.params.id);
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching event attendees:", error);
      res.status(500).json({ message: "Failed to fetch event attendees" });
    }
  });

  // ===== Members =====
  // Update authenticated user's profile
  app.patch("/api/members/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const data = updateProfileSchema.parse(req.body);

      // Filter out empty strings (treat them as null/undefined)
      const updateData: { bio?: string; location?: string; website?: string; coverImageUrl?: string } = {};
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.website !== undefined && data.website !== "") updateData.website = data.website;
      if (data.coverImageUrl !== undefined && data.coverImageUrl !== "") updateData.coverImageUrl = data.coverImageUrl;

      await storage.updateProfile(userId, updateData);

      // Return the updated member with profile
      const member = await storage.getMember(userId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/members", async (req, res) => {
    try {
      const { limit, offset } = paginationSchema.parse(req.query);
      const result = await storage.getMembers({ limit, offset });

      const response: PaginatedResponse<typeof result.data[0]> = {
        data: result.data,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + result.data.length < result.total,
        },
      };
      res.json(response);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard(20);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  return httpServer;
}
