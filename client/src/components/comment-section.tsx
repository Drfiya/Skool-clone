import { useState } from "react";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommentWithAuthor } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface CommentSectionProps {
  comments: CommentWithAuthor[];
  onAddComment: (content: string) => void;
  isAddingComment?: boolean;
}

export function CommentSection({ comments, onAddComment, isAddingComment }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const { user, isAuthenticated } = useAuth();

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment("");
    }
  };

  const getInitials = (author: CommentWithAuthor["author"]) => {
    const first = author.firstName?.[0] || "";
    const last = author.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const getAuthorName = (author: CommentWithAuthor["author"]) => {
    if (author.firstName || author.lastName) {
      return `${author.firstName || ""} ${author.lastName || ""}`.trim();
    }
    return "Anonymous";
  };

  const getCurrentUserInitials = () => {
    if (!user) return "?";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "?";
  };

  return (
    <div className="space-y-4">
      {isAuthenticated && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-xs">{getCurrentUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-10 resize-none flex-1"
              rows={1}
              data-testid="textarea-comment"
            />
            <Button 
              size="icon" 
              onClick={handleSubmit}
              disabled={!newComment.trim() || isAddingComment}
              data-testid="button-submit-comment"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={comment.author.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">{getInitials(comment.author)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{getAuthorName(comment.author)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm mt-0.5">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
}
