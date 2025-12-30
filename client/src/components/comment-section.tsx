import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Send, MoreHorizontal, Reply, ChevronDown, ChevronUp, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { getInitials, getDisplayName } from "@/lib/utils";
import type { CommentWithReplyCount } from "@shared/schema";

interface CommentSectionProps {
  postId: string;
}

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: CommentWithReplyCount;
  postId: string;
  currentUserId?: string;
  depth?: number;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
  onReplyAdded: () => void;
}

function CommentItem({
  comment,
  postId,
  currentUserId,
  depth = 0,
  activeReplyId,
  setActiveReplyId,
  onReplyAdded,
}: CommentItemProps) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isRepliesExpanded, setIsRepliesExpanded] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const isReplyFormActive = activeReplyId === comment.id;

  // Fetch replies when expanded
  const { data: replies, isLoading: isLoadingReplies, refetch: refetchReplies } = useQuery<CommentWithReplyCount[]>({
    queryKey: [`/api/comments/${comment.id}/replies`],
    enabled: isRepliesExpanded && comment.replyCount > 0,
  });


  const isOwner = currentUserId === comment.author.id;

  const updateMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("PATCH", `/api/comments/${comment.id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      // Also invalidate parent's replies if this is a reply
      if (comment.parentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/comments/${comment.parentId}/replies`] });
      }
      setIsEditing(false);
      toast({ title: "Success", description: "Comment updated" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update comment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/comments/${comment.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      // Also invalidate parent's replies if this is a reply
      if (comment.parentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/comments/${comment.parentId}/replies`] });
      }
      toast({ title: "Success", description: "Comment deleted" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete comment", variant: "destructive" });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/posts/${postId}/comments`, {
        content,
        parentId: comment.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/comments/${comment.id}/replies`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setReplyContent("");
      setActiveReplyId(null);
      setIsRepliesExpanded(true);
      onReplyAdded();
      toast({ title: "Success", description: "Reply added" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in to reply", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to add reply", variant: "destructive" });
    },
  });

  const handleUpdate = () => {
    if (editContent.trim() && editContent !== comment.content) {
      updateMutation.mutate(editContent.trim());
    } else {
      setIsEditing(false);
    }
  };

  const handleReplySubmit = () => {
    if (replyContent.trim()) {
      replyMutation.mutate(replyContent.trim());
    }
  };

  const handleReplyClick = () => {
    if (isReplyFormActive) {
      setActiveReplyId(null);
    } else {
      setActiveReplyId(comment.id);
    }
  };

  return (
    <div
      className={`py-3 ${depth > 0 ? "ml-4 pl-4 border-l-2 border-muted" : ""}`}
      data-testid={`comment-${comment.id}`}
    >
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.author.profileImageUrl || undefined} alt={getDisplayName(comment.author, "Anonymous")} />
          <AvatarFallback className="text-xs">{getInitials(comment.author)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate" data-testid={`comment-author-${comment.id}`}>
                {getDisplayName(comment.author, "Anonymous")}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`comment-menu-${comment.id}`} aria-label="Comment options">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate()}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] text-sm"
                data-testid={`comment-edit-textarea-${comment.id}`}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending || !editContent.trim()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1 whitespace-pre-wrap break-words" data-testid={`comment-content-${comment.id}`}>
              {comment.content}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-2">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleReplyClick}
                data-testid={`button-reply-${comment.id}`}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}

            {comment.replyCount > 0 && (
              <Collapsible open={isRepliesExpanded} onOpenChange={setIsRepliesExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    data-testid={`button-view-replies-${comment.id}`}
                  >
                    {isRepliesExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Hide replies
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        View {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>

          {/* Reply form */}
          {isReplyFormActive && (
            <div className="mt-3 flex gap-2" data-testid={`reply-form-${comment.id}`}>
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{user ? getInitials(user) : "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex flex-col gap-2">
                <Textarea
                  placeholder={`Reply to ${getDisplayName(comment.author, "Anonymous")}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                  rows={2}
                  data-testid={`textarea-reply-${comment.id}`}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveReplyId(null);
                      setReplyContent("");
                    }}
                    data-testid={`button-cancel-reply-${comment.id}`}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReplySubmit}
                    disabled={!replyContent.trim() || replyMutation.isPending}
                    data-testid={`button-submit-reply-${comment.id}`}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Replies section */}
          {comment.replyCount > 0 && (
            <Collapsible open={isRepliesExpanded} onOpenChange={setIsRepliesExpanded}>
              <CollapsibleContent className="mt-2">
                {isLoadingReplies ? (
                  <div className="ml-4 pl-4 border-l-2 border-muted py-3">
                    <div className="flex gap-3 animate-pulse">
                      <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-4 w-full bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                ) : (
                  replies?.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      currentUserId={currentUserId}
                      depth={depth + 1}
                      activeReplyId={activeReplyId}
                      setActiveReplyId={setActiveReplyId}
                      onReplyAdded={() => {
                        refetchReplies();
                        onReplyAdded();
                      }}
                    />
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const { data: comments, isLoading, refetch: refetchComments } = useQuery<CommentWithReplyCount[]>({
    queryKey: [`/api/posts/${postId}/comments`],
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/posts/${postId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setNewComment("");
      toast({ title: "Success", description: "Comment added" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in to comment", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment.trim());
    }
  };

  // Filter out replies (comments with parentId) to show only top-level comments
  const topLevelComments = comments?.filter((c) => !c.parentId) || [];

  return (
    <div className="border-t pt-4 mt-2" data-testid={`comment-section-${postId}`}>
      <div className="text-sm font-medium text-muted-foreground mb-3">
        {isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          `${topLevelComments.length} ${topLevelComments.length === 1 ? "comment" : "comments"}`
        )}
      </div>

      {/* Comments list */}
      <div className="divide-y">
        {isLoading ? (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        ) : topLevelComments.length > 0 ? (
          topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUserId={user?.id}
              depth={0}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              onReplyAdded={() => refetchComments()}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="mt-4" data-testid={`comment-form-${postId}`}>
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-xs">{user ? getInitials(user) : "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Textarea
              placeholder={isAuthenticated ? "Write a comment..." : "Log in to comment"}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={!isAuthenticated || createCommentMutation.isPending}
              className="min-h-10 resize-none flex-1"
              rows={1}
              data-testid={`comment-textarea-${postId}`}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newComment.trim() || !isAuthenticated || createCommentMutation.isPending}
              data-testid={`comment-submit-${postId}`}
              aria-label="Submit comment"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function CommentSectionSkeleton() {
  return (
    <div className="border-t pt-4 mt-2">
      <Skeleton className="h-4 w-24 mb-3" />
      <div className="divide-y">
        <CommentSkeleton />
        <CommentSkeleton />
      </div>
    </div>
  );
}
