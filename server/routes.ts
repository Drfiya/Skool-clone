import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { insertPostSchema, insertCommentSchema, insertCourseSchema, insertEventSchema } from "@shared/schema";
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

const rsvpStatusSchema = z.enum(["going", "maybe", "not_going"]);

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

  // ===== Members =====
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
