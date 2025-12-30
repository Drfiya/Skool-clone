import { Heart, MessageCircle, Share2, MoreHorizontal, Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PostWithAuthor } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: PostWithAuthor;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  isLiking?: boolean;
}

export function PostCard({ post, onLike, onComment, onShare, isLiking }: PostCardProps) {
  const getInitials = () => {
    const first = post.author.firstName?.[0] || "";
    const last = post.author.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const getAuthorName = () => {
    if (post.author.firstName || post.author.lastName) {
      return `${post.author.firstName || ""} ${post.author.lastName || ""}`.trim();
    }
    return "Anonymous";
  };

  const getCategoryColor = () => {
    switch (post.category) {
      case "announcement":
        return "bg-primary/10 text-primary border-primary/20";
      case "question":
        return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="overflow-visible" data-testid={`card-post-${post.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.profileImageUrl || undefined} alt={getAuthorName()} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm" data-testid={`text-post-author-${post.id}`}>
                {getAuthorName()}
              </span>
              {post.isPinned && (
                <Badge variant="secondary" className="gap-1">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              )}
              {post.category !== "discussion" && (
                <Badge variant="outline" className={getCategoryColor()}>
                  {post.category}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground" data-testid={`text-post-time-${post.id}`}>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-post-menu-${post.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pb-3">
        {post.title && (
          <h3 className="font-semibold text-lg mb-2" data-testid={`text-post-title-${post.id}`}>
            {post.title}
          </h3>
        )}
        <p className="text-sm whitespace-pre-wrap" data-testid={`text-post-content-${post.id}`}>
          {post.content}
        </p>
      </CardContent>
      <CardFooter className="flex items-center gap-1 pt-0">
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 ${post.isLiked ? "text-destructive" : ""}`}
          onClick={() => onLike?.(post.id)}
          disabled={isLiking}
          data-testid={`button-like-${post.id}`}
        >
          <Heart className={`h-4 w-4 ${post.isLiked ? "fill-current" : ""}`} />
          <span>{post.likesCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => onComment?.(post.id)}
          data-testid={`button-comment-${post.id}`}
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post.commentsCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShare?.(post.id)}
          data-testid={`button-share-${post.id}`}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PostCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="h-5 w-3/4 bg-muted animate-pulse rounded mb-2" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center gap-4 pt-0">
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        <div className="h-8 w-8 bg-muted animate-pulse rounded" />
      </CardFooter>
    </Card>
  );
}
