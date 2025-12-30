import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { Lesson, CourseModule, LessonProgress, CourseWithDetails } from "@shared/schema";

// Extended lesson type with module info
type LessonWithModule = Lesson & { module: CourseModule };

// Module with lessons type
type ModuleWithLessons = CourseModule & { lessons: Lesson[] };

// Flattened lesson for navigation
interface FlattenedLesson {
  lesson: Lesson;
  moduleTitle: string;
  globalIndex: number;
}

function LessonSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="hidden lg:block w-80 border-r bg-muted/30">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <div className="pl-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-10 w-3/4 mb-2" />
          <Skeleton className="h-5 w-48 mb-6" />

          {/* Video placeholder */}
          <Skeleton className="w-full aspect-video rounded-lg mb-6" />

          {/* Content skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  // Detect video type and render appropriate player
  const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const isVimeo = videoUrl.includes("vimeo.com");

  if (isYouTube) {
    // Extract YouTube video ID
    let videoId = "";
    if (videoUrl.includes("youtu.be/")) {
      videoId = videoUrl.split("youtu.be/")[1]?.split("?")[0] || "";
    } else if (videoUrl.includes("v=")) {
      videoId = videoUrl.split("v=")[1]?.split("&")[0] || "";
    } else if (videoUrl.includes("embed/")) {
      videoId = videoUrl.split("embed/")[1]?.split("?")[0] || "";
    }

    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isVimeo) {
    // Extract Vimeo video ID
    const videoId = videoUrl.split("vimeo.com/")[1]?.split("?")[0] || "";

    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${videoId}`}
          title="Vimeo video player"
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Default to HTML5 video for direct video URLs
  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
      <video
        src={videoUrl}
        controls
        className="absolute inset-0 w-full h-full"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

function CourseSidebar({
  modules,
  currentLessonId,
  courseId,
  courseTitle,
  lessonProgressMap,
}: {
  modules: ModuleWithLessons[];
  currentLessonId: string;
  courseId: string;
  courseTitle: string;
  lessonProgressMap: Map<string, boolean>;
}) {
  return (
    <div className="hidden lg:flex lg:flex-col w-80 border-r bg-muted/30">
      <div className="p-4 border-b">
        <Link href={`/classroom/${courseId}`}>
          <a className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to course
          </a>
        </Link>
        <h2 className="font-semibold text-lg truncate" title={courseTitle}>
          {courseTitle}
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {modules.map((module) => (
            <div key={module.id}>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">
                {module.title}
              </h3>
              <div className="space-y-1">
                {module.lessons.map((lesson) => {
                  const isCompleted = lessonProgressMap.get(lesson.id) || false;
                  const isCurrent = lesson.id === currentLessonId;

                  return (
                    <Link
                      key={lesson.id}
                      href={`/classroom/${courseId}/lesson/${lesson.id}`}
                    >
                      <a
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                          isCurrent
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="truncate">{lesson.title}</span>
                        {lesson.duration && (
                          <span className="ml-auto text-xs opacity-70">
                            {lesson.duration}m
                          </span>
                        )}
                      </a>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Fetch lesson details
  const { data: lesson, isLoading: lessonLoading } = useQuery<LessonWithModule>({
    queryKey: ["/api/lessons", lessonId],
    enabled: !!lessonId,
  });

  // Fetch course details
  const { data: course, isLoading: courseLoading } = useQuery<CourseWithDetails>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  // Fetch all modules with lessons for the sidebar and navigation
  const { data: modules, isLoading: modulesLoading } = useQuery<ModuleWithLessons[]>({
    queryKey: ["/api/courses", courseId, "modules"],
    enabled: !!courseId,
  });

  // Fetch lesson progress for current user (single lesson)
  const { data: progress } = useQuery<LessonProgress | { isCompleted: boolean }>({
    queryKey: ["/api/lessons", lessonId, "progress"],
    enabled: !!lessonId && isAuthenticated,
  });

  // Fetch all lesson progress for the course (for sidebar)
  const { data: courseProgress } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/courses", courseId, "progress"],
    enabled: !!courseId && isAuthenticated,
  });

  // Mark lesson as complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (isCompleted: boolean) => {
      return apiRequest("PATCH", `/api/lessons/${lessonId}/progress`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", lessonId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({
        title: "Progress updated",
        description: "Lesson marked as complete!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to track progress",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
    },
  });

  // Build lesson progress map for sidebar from course progress
  const lessonProgressMap = new Map<string, boolean>();
  if (courseProgress) {
    Object.entries(courseProgress).forEach(([id, completed]) => {
      lessonProgressMap.set(id, completed);
    });
  }
  // Also include the current lesson's progress (in case courseProgress hasn't updated yet)
  if (progress?.isCompleted && lessonId) {
    lessonProgressMap.set(lessonId, true);
  }

  // Flatten lessons for navigation
  const flattenedLessons: FlattenedLesson[] = [];
  if (modules) {
    let globalIndex = 0;
    modules.forEach((module) => {
      module.lessons.forEach((l) => {
        flattenedLessons.push({
          lesson: l,
          moduleTitle: module.title,
          globalIndex: globalIndex++,
        });
      });
    });
  }

  // Find current lesson index and get prev/next
  const currentIndex = flattenedLessons.findIndex((f) => f.lesson.id === lessonId);
  const prevLesson = currentIndex > 0 ? flattenedLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < flattenedLessons.length - 1
      ? flattenedLessons[currentIndex + 1]
      : null;

  const isLoading = lessonLoading || courseLoading || modulesLoading;

  if (isLoading) {
    return <LessonSkeleton />;
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <h2 className="text-2xl font-bold mb-2">Lesson not found</h2>
        <p className="text-muted-foreground mb-4">
          The lesson you are looking for does not exist or has been removed.
        </p>
        <Link href={`/classroom/${courseId}`}>
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
        </Link>
      </div>
    );
  }

  const isCompleted = progress?.isCompleted || false;
  const totalLessons = flattenedLessons.length;
  const currentLessonNumber = currentIndex + 1;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Course outline sidebar */}
      {modules && course && (
        <CourseSidebar
          modules={modules}
          currentLessonId={lessonId || ""}
          courseId={courseId || ""}
          courseTitle={course.title}
          lessonProgressMap={lessonProgressMap}
        />
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-4">
            <Link href={`/classroom/${courseId}`}>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to course
              </Button>
            </Link>
            <Badge variant="secondary" className="ml-auto">
              Lesson {currentLessonNumber} of {totalLessons}
            </Badge>
          </div>

          {/* Lesson title and metadata */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{lesson.title}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              {lesson.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{lesson.duration} minutes</span>
                </div>
              )}
              {isCompleted && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>

          {/* Video player */}
          {lesson.videoUrl && (
            <div className="mb-6">
              <VideoPlayer videoUrl={lesson.videoUrl} />
            </div>
          )}

          {/* Lesson content */}
          {lesson.content && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Lesson Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {lesson.content.split("\n").map((paragraph, idx) => (
                    <p key={idx} className="mb-4 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mark as complete button */}
          {isAuthenticated && !isCompleted && (
            <div className="mb-6">
              <Button
                onClick={() => markCompleteMutation.mutate(true)}
                disabled={markCompleteMutation.isPending}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {markCompleteMutation.isPending ? "Marking..." : "Mark as Complete"}
              </Button>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t">
            {prevLesson ? (
              <Link href={`/classroom/${courseId}/lesson/${prevLesson.lesson.id}`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  <div className="text-left hidden sm:block">
                    <div className="text-xs text-muted-foreground">Previous</div>
                    <div className="text-sm font-medium truncate max-w-[150px]">
                      {prevLesson.lesson.title}
                    </div>
                  </div>
                  <span className="sm:hidden">Previous</span>
                </Button>
              </Link>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <Link href={`/classroom/${courseId}/lesson/${nextLesson.lesson.id}`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-muted-foreground">Next</div>
                    <div className="text-sm font-medium truncate max-w-[150px]">
                      {nextLesson.lesson.title}
                    </div>
                  </div>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href={`/classroom/${courseId}`}>
                <Button className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Finish Course
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
