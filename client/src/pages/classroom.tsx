import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CourseCard, CourseCardSkeleton } from "@/components/course-card";
import { CourseEditor } from "@/components/course-editor";
import { LoadMore } from "@/components/load-more";
import { TopBar } from "@/components/top-bar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { CourseWithDetails } from "@shared/schema";

// Paginated response type
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function ClassroomPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseEditorOpen, setCourseEditorOpen] = useState(false);
  const [allCourses, setAllCourses] = useState<CourseWithDetails[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const LIMIT = 20;

  const { data: coursesResponse, isLoading, isFetching } = useQuery<PaginatedResponse<CourseWithDetails>>({
    queryKey: ["/api/courses", { limit: LIMIT, offset }],
  });

  // Update allCourses when new data arrives
  useEffect(() => {
    if (coursesResponse?.data) {
      if (offset === 0) {
        setAllCourses(coursesResponse.data);
      } else {
        setAllCourses((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newCourses = coursesResponse.data.filter((c) => !existingIds.has(c.id));
          return [...prev, ...newCourses];
        });
      }
      setHasMore(coursesResponse.pagination.hasMore);
    }
  }, [coursesResponse, offset]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setOffset((prev) => prev + LIMIT);
    }
  }, [isFetching, hasMore]);

  const courses = allCourses;

  const { data: enrolledCourseIds } = useQuery<string[]>({
    queryKey: ["/api/enrollments/my"],
    enabled: isAuthenticated,
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return apiRequest("POST", `/api/courses/${courseId}/enroll`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments/my"] });
      toast({ title: "Success", description: "Enrolled successfully!", variant: "success" });
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

  const filteredCourses = courses?.filter((course) => {
    const matchesSearch = !searchQuery || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "enrolled") return matchesSearch && enrolledCourseIds?.includes(course.id);
    if (activeTab === "available") return matchesSearch && !enrolledCourseIds?.includes(course.id);
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      
      <div className="flex-1 overflow-auto">
        <div className="container max-w-6xl py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Classroom</h1>
              <p className="text-muted-foreground">Browse and enroll in courses</p>
            </div>
            {isAuthenticated && (
              <Button
                onClick={() => setCourseEditorOpen(true)}
                data-testid="button-create-course"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-courses"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all-courses">All</TabsTrigger>
                <TabsTrigger value="enrolled" data-testid="tab-enrolled">Enrolled</TabsTrigger>
                <TabsTrigger value="available" data-testid="tab-available">Available</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading && courses.length === 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </div>
          ) : filteredCourses && filteredCourses.length > 0 ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isEnrolled={enrolledCourseIds?.includes(course.id)}
                    onEnroll={(courseId) => enrollMutation.mutate(courseId)}
                    isEnrolling={enrollMutation.isPending}
                  />
                ))}
              </div>
              {!searchQuery && activeTab === "all" && (
                <LoadMore
                  hasMore={hasMore}
                  isLoading={isFetching && courses.length > 0}
                  onLoadMore={loadMore}
                />
              )}
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg mb-2">No courses found</p>
              <p className="text-sm">
                {searchQuery ? "Try a different search term" : "Check back later for new courses"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Course Editor Dialog */}
      <CourseEditor
        open={courseEditorOpen}
        onOpenChange={setCourseEditorOpen}
      />
    </div>
  );
}
