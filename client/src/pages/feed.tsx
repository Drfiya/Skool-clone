import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard, PostCardSkeleton } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { TopBar } from "@/components/top-bar";
import { LeaderboardTable, LeaderboardTableSkeleton } from "@/components/leaderboard-table";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { PostWithAuthor, MemberWithProfile, EventWithDetails } from "@shared/schema";

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

export default function FeedPage() {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  const { data: postsResponse, isLoading: postsLoading } = useQuery<PaginatedResponse<PostWithAuthor>>({
    queryKey: ["/api/posts"],
  });
  const posts = postsResponse?.data;

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<MemberWithProfile[]>({
    queryKey: ["/api/leaderboard"],
  });

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events/upcoming"],
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: { title?: string; content: string; category: string }) => {
      return apiRequest("POST", "/api/posts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setIsComposerOpen(false);
      toast({ title: "Success", description: "Post created successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest("POST", `/api/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in to like posts", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to like post", variant: "destructive" });
    },
  });

  const filteredPosts = posts?.filter((post) => {
    if (activeTab === "all") return true;
    if (activeTab === "announcements") return post.category === "announcement";
    if (activeTab === "questions") return post.category === "question";
    return true;
  });

  const pinnedPosts = filteredPosts?.filter((p) => p.isPinned) || [];
  const regularPosts = filteredPosts?.filter((p) => !p.isPinned) || [];
  const sortedPosts = [...pinnedPosts, ...regularPosts];

  return (
    <div className="flex flex-col h-full">
      <TopBar onCreatePost={() => setIsComposerOpen(true)} />
      
      <div className="flex-1 overflow-auto">
        <div className="container max-w-6xl py-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="all" data-testid="tab-all-posts">All Posts</TabsTrigger>
                  <TabsTrigger value="announcements" data-testid="tab-announcements">Announcements</TabsTrigger>
                  <TabsTrigger value="questions" data-testid="tab-questions">Questions</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-4">
                {postsLoading ? (
                  <>
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                  </>
                ) : sortedPosts.length > 0 ? (
                  sortedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={(postId) => likePostMutation.mutate(postId)}
                      isLiking={likePostMutation.isPending}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg mb-2">No posts yet</p>
                    <p className="text-sm">Be the first to start a conversation!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Top Members</h3>
                {leaderboardLoading ? (
                  <LeaderboardTableSkeleton />
                ) : (
                  <LeaderboardTable 
                    members={leaderboard?.slice(0, 5) || []} 
                    title="Top 5"
                  />
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-3">Upcoming Events</h3>
                <div className="space-y-3">
                  {eventsLoading ? (
                    <>
                      <EventCardSkeleton />
                      <EventCardSkeleton />
                    </>
                  ) : upcomingEvents && upcomingEvents.length > 0 ? (
                    upcomingEvents.slice(0, 2).map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No upcoming events
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PostComposer
        open={isComposerOpen}
        onOpenChange={setIsComposerOpen}
        onSubmit={(values) => createPostMutation.mutate(values)}
        isPending={createPostMutation.isPending}
      />
    </div>
  );
}
