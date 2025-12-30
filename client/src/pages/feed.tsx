import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard, PostCardSkeleton } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { TopBar } from "@/components/top-bar";
import { LeaderboardTable, LeaderboardTableSkeleton } from "@/components/leaderboard-table";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
import { DeleteConfirmation } from "@/components/delete-confirmation";
import { LoadMore } from "@/components/load-more";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
  const [editingPost, setEditingPost] = useState<PostWithAuthor | null>(null);
  const [deletingPost, setDeletingPost] = useState<PostWithAuthor | null>(null);
  const [allPosts, setAllPosts] = useState<PostWithAuthor[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const LIMIT = 20;

  const { data: postsResponse, isLoading: postsLoading, isFetching } = useQuery<PaginatedResponse<PostWithAuthor>>({
    queryKey: ["/api/posts", { limit: LIMIT, offset }],
  });

  // Update allPosts when new data arrives
  useEffect(() => {
    if (postsResponse?.data) {
      if (offset === 0) {
        setAllPosts(postsResponse.data);
      } else {
        setAllPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = postsResponse.data.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      }
      setHasMore(postsResponse.pagination.hasMore);
    }
  }, [postsResponse, offset]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setOffset((prev) => prev + LIMIT);
    }
  }, [isFetching, hasMore]);

  const posts = allPosts;

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<MemberWithProfile[]>({
    queryKey: ["/api/leaderboard"],
  });

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events/upcoming"],
  });

  const resetPagination = useCallback(() => {
    setOffset(0);
    setAllPosts([]);
    setHasMore(true);
  }, []);

  const createPostMutation = useMutation({
    mutationFn: async (data: { title?: string; content: string; category: string }) => {
      return apiRequest("POST", "/api/posts", data);
    },
    onSuccess: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setIsComposerOpen(false);
      toast({ title: "Success", description: "Post created successfully", variant: "success" });
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

  const updatePostMutation = useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: { title?: string; content: string; category: string } }) => {
      return apiRequest("PATCH", `/api/posts/${postId}`, data);
    },
    onSuccess: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setEditingPost(null);
      toast({ title: "Success", description: "Post updated successfully", variant: "success" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update post", variant: "destructive" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest("DELETE", `/api/posts/${postId}`);
    },
    onSuccess: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setDeletingPost(null);
      toast({ title: "Success", description: "Post deleted successfully", variant: "success" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
    },
  });

  const handleEditPost = (post: PostWithAuthor) => {
    setEditingPost(post);
  };

  const handleDeletePost = (post: PostWithAuthor) => {
    setDeletingPost(post);
  };

  const handleConfirmDelete = () => {
    if (deletingPost) {
      deletePostMutation.mutate(deletingPost.id);
    }
  };

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
                {postsLoading && posts.length === 0 ? (
                  <>
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                  </>
                ) : sortedPosts.length > 0 ? (
                  <>
                    {sortedPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={user?.id}
                        onLike={(postId) => likePostMutation.mutate(postId)}
                        onEdit={handleEditPost}
                        onDelete={handleDeletePost}
                        isLiking={likePostMutation.isPending}
                      />
                    ))}
                    <LoadMore
                      hasMore={hasMore}
                      isLoading={isFetching && posts.length > 0}
                      onLoadMore={loadMore}
                    />
                  </>
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

      {/* Edit Post Dialog */}
      <PostComposer
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
        onSubmit={(values) => {
          if (editingPost) {
            updatePostMutation.mutate({ postId: editingPost.id, data: values });
          }
        }}
        isPending={updatePostMutation.isPending}
        editMode={true}
        initialData={editingPost ? {
          title: editingPost.title || undefined,
          content: editingPost.content,
          category: editingPost.category as "discussion" | "announcement" | "question",
        } : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        open={!!deletingPost}
        onOpenChange={(open) => !open && setDeletingPost(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Post?"
        description="Are you sure you want to delete this post? This action cannot be undone."
        isDeleting={deletePostMutation.isPending}
      />
    </div>
  );
}
