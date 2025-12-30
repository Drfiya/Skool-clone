import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, BookOpen, Users, Clock, Check, Play, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TopBar } from "@/components/top-bar";
import { CourseEditor } from "@/components/course-editor";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { getInitials, getDisplayName } from "@/lib/utils";
import type { CourseWithDetails, CourseModule, Lesson, LessonProgress } from "@shared/schema";

// Type for module with lessons
type ModuleWithLessons = CourseModule & { lessons: Lesson[] };

// Type for lesson progress response
type LessonProgressMap = Record<string, boolean>;

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [courseEditorOpen, setCourseEditorOpen] = useState(false);

  // Fetch course details
  const { data: course, isLoading: courseLoading } = useQuery<CourseWithDetails>({
    queryKey: [`/api/courses/${id}`],
    enabled: !!id,
  });

  // Fetch modules with lessons
  const { data: modules, isLoading: modulesLoading } = useQuery<ModuleWithLessons[]>({
    queryKey: [`/api/courses/${id}/modules`],
    enabled: !!id,
  });

  // Fetch enrolled course IDs for current user
  const { data: enrolledCourseIds } = useQuery<string[]>({
    queryKey: ["/api/enrollments/my"],
    enabled: isAuthenticated,
  });

  // Fetch lesson progress for enrolled users
  const { data: lessonProgressData } = useQuery<LessonProgressMap>({
    queryKey: [`/api/courses/${id}/progress`],
    enabled: isAuthenticated && enrolledCourseIds?.includes(id || ""),
  });

  const isEnrolled = enrolledCourseIds?.includes(id || "");

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return apiRequest("POST", `/api/courses/${courseId}/enroll`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/my"] });
      toast({ title: "Success", description: "Enrolled successfully!" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in to enroll", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to enroll", variant: "destructive" });
    },
  });

  const isLessonCompleted = (lessonId: string): boolean => {
    return lessonProgressData?.[lessonId] || false;
  };

  const getModuleProgress = (lessons: Lesson[]): number => {
    if (!lessonProgressData || lessons.length === 0) return 0;
    const completedCount = lessons.filter(l => lessonProgressData[l.id]).length;
    return Math.round((completedCount / lessons.length) * 100);
  };

  const isLoading = courseLoading || modulesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <div className="container max-w-6xl py-6">
            <CourseDetailSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col h-full">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <div className="container max-w-6xl py-6">
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
              <p className="text-muted-foreground mb-4">The course you are looking for does not exist.</p>
              <Button asChild>
                <Link href="/classroom">Back to Classroom</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar />

      <div className="flex-1 overflow-auto">
        <div className="container max-w-6xl py-6">
          {/* Back Button & Edit Button */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" asChild data-testid="button-back-to-classroom">
              <Link href="/classroom">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Classroom
              </Link>
            </Button>
            {user && course.instructor.id === user.id && (
              <Button
                variant="outline"
                onClick={() => setCourseEditorOpen(true)}
                data-testid="button-edit-course"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Course
              </Button>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content - Modules and Lessons */}
            <div className="lg:col-span-2 space-y-6">
              {/* Course Header (Mobile) */}
              <div className="lg:hidden">
                <CourseInfoCard
                  course={course}
                  isEnrolled={isEnrolled}
                  isEnrolling={enrollMutation.isPending}
                  onEnroll={() => enrollMutation.mutate(course.id)}
                />
              </div>

              {/* Course Content */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Course Content</h2>
                  <p className="text-sm text-muted-foreground">
                    {course.modulesCount} modules - {course.lessonsCount} lessons
                  </p>
                </CardHeader>
                <CardContent>
                  {modules && modules.length > 0 ? (
                    <Accordion type="multiple" className="w-full" defaultValue={modules.map(m => m.id)}>
                      {modules.map((module, moduleIndex) => (
                        <AccordionItem key={module.id} value={module.id} data-testid={`module-${module.id}`}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                                {moduleIndex + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{module.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {module.lessons.length} lessons
                                  {isEnrolled && (
                                    <span className="ml-2">
                                      - {getModuleProgress(module.lessons)}% complete
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-1 pl-11">
                              {module.description && (
                                <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                              )}
                              {module.lessons.length > 0 ? (
                                module.lessons.map((lesson, lessonIndex) => (
                                  <LessonItem
                                    key={lesson.id}
                                    lesson={lesson}
                                    lessonIndex={lessonIndex}
                                    courseId={course.id}
                                    isEnrolled={isEnrolled}
                                    isCompleted={isLessonCompleted(lesson.id)}
                                  />
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground py-2">
                                  No lessons in this module yet
                                </p>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No modules available yet</p>
                      <p className="text-sm">Check back later for course content</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Course Info (Desktop) */}
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <CourseInfoCard
                  course={course}
                  isEnrolled={isEnrolled}
                  isEnrolling={enrollMutation.isPending}
                  onEnroll={() => enrollMutation.mutate(course.id)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Editor Dialog */}
      <CourseEditor
        open={courseEditorOpen}
        onOpenChange={setCourseEditorOpen}
        courseId={id}
      />
    </div>
  );
}

// Course Info Card Component
interface CourseInfoCardProps {
  course: CourseWithDetails;
  isEnrolled?: boolean;
  isEnrolling: boolean;
  onEnroll: () => void;
}

function CourseInfoCard({ course, isEnrolled, isEnrolling, onEnroll }: CourseInfoCardProps) {
  return (
    <Card className="overflow-hidden" data-testid="card-course-info">
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="h-16 w-16 text-primary/40" />
          </div>
        )}
        {!course.isPublished && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            Draft
          </Badge>
        )}
      </div>

      <CardContent className="pt-4 space-y-4">
        {/* Title */}
        <h1 className="text-xl font-bold" data-testid="text-course-title">{course.title}</h1>

        {/* Description */}
        {course.description && (
          <p className="text-sm text-muted-foreground">{course.description}</p>
        )}

        {/* Instructor */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={course.instructor.profileImageUrl || undefined} alt={getDisplayName(course.instructor, "Instructor")} />
            <AvatarFallback>{getInitials(course.instructor)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{getDisplayName(course.instructor, "Instructor")}</p>
            <p className="text-xs text-muted-foreground">Instructor</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{course.lessonsCount} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{course.enrollmentsCount} enrolled</span>
          </div>
        </div>

        {/* Progress (for enrolled users) */}
        {isEnrolled && course.progress !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Your Progress</span>
              <span className="text-sm font-medium">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-2" />
          </div>
        )}

        {/* Action Button */}
        {isEnrolled ? (
          <Badge variant="secondary" className="w-full justify-center py-2">
            <Check className="h-4 w-4 mr-1" />
            Enrolled
          </Badge>
        ) : (
          <Button
            className="w-full"
            onClick={onEnroll}
            disabled={isEnrolling}
            data-testid="button-enroll"
          >
            {isEnrolling ? "Enrolling..." : "Enroll Now"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Lesson Item Component
interface LessonItemProps {
  lesson: Lesson;
  lessonIndex: number;
  courseId: string;
  isEnrolled?: boolean;
  isCompleted: boolean;
}

function LessonItem({ lesson, lessonIndex, courseId, isEnrolled, isCompleted }: LessonItemProps) {
  const content = (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isEnrolled
          ? "hover:bg-muted cursor-pointer"
          : "opacity-75"
      }`}
      data-testid={`lesson-${lesson.id}`}
    >
      {/* Completion/Play Icon */}
      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
        isCompleted
          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          : "bg-muted text-muted-foreground"
      }`}>
        {isCompleted ? (
          <Check className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </div>

      {/* Lesson Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCompleted ? "text-muted-foreground" : ""}`}>
          {lessonIndex + 1}. {lesson.title}
        </p>
        {lesson.duration && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{lesson.duration} min</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      {isCompleted && (
        <Badge variant="outline" className="flex-shrink-0 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
          Completed
        </Badge>
      )}
    </div>
  );

  if (isEnrolled) {
    return (
      <Link href={`/classroom/${courseId}/lesson/${lesson.id}`}>
        {content}
      </Link>
    );
  }

  return content;
}

// Skeleton Loading Component
function CourseDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-40" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Mobile Info Card Skeleton */}
          <div className="lg:hidden">
            <Card className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardContent className="pt-4 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>

          {/* Modules Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-20 mt-1" />
                    </div>
                  </div>
                  <div className="pl-11 space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Desktop Sidebar Skeleton */}
        <div className="hidden lg:block">
          <Card className="overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <CardContent className="pt-4 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
