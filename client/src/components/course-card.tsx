import { BookOpen, Users, Clock } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { CourseWithDetails } from "@shared/schema";

interface CourseCardProps {
  course: CourseWithDetails;
  isEnrolled?: boolean;
  onEnroll?: (courseId: string) => void;
  isEnrolling?: boolean;
}

export function CourseCard({ course, isEnrolled, onEnroll, isEnrolling }: CourseCardProps) {
  const getInitials = () => {
    const first = course.instructor.firstName?.[0] || "";
    const last = course.instructor.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const getInstructorName = () => {
    if (course.instructor.firstName || course.instructor.lastName) {
      return `${course.instructor.firstName || ""} ${course.instructor.lastName || ""}`.trim();
    }
    return "Instructor";
  };

  return (
    <Card className="overflow-hidden flex flex-col" data-testid={`card-course-${course.id}`}>
      <div className="aspect-video bg-muted relative overflow-hidden">
        {course.thumbnailUrl ? (
          <img 
            src={course.thumbnailUrl} 
            alt={course.title}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="h-12 w-12 text-primary/40" />
          </div>
        )}
        {!course.isPublished && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            Draft
          </Badge>
        )}
      </div>
      <CardHeader className="pb-2">
        <h3 className="font-semibold text-base line-clamp-2" data-testid={`text-course-title-${course.id}`}>
          {course.title}
        </h3>
      </CardHeader>
      <CardContent className="pb-3 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Avatar className="h-6 w-6">
            <AvatarImage src={course.instructor.profileImageUrl || undefined} alt={getInstructorName()} />
            <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground" data-testid={`text-course-instructor-${course.id}`}>
            {getInstructorName()}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{course.lessonsCount} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{course.enrollmentsCount} enrolled</span>
          </div>
        </div>
        {isEnrolled && course.progress !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-medium">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-1.5" />
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        {isEnrolled ? (
          <Button asChild className="w-full" variant="secondary" data-testid={`button-continue-course-${course.id}`}>
            <Link href={`/classroom/${course.id}`}>
              Continue Learning
            </Link>
          </Button>
        ) : (
          <Button 
            className="w-full" 
            onClick={() => onEnroll?.(course.id)}
            disabled={isEnrolling}
            data-testid={`button-enroll-course-${course.id}`}
          >
            {isEnrolling ? "Enrolling..." : "Enroll Now"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function CourseCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="aspect-video bg-muted animate-pulse" />
      <CardHeader className="pb-2">
        <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="pb-3 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="h-9 w-full bg-muted animate-pulse rounded" />
      </CardFooter>
    </Card>
  );
}
