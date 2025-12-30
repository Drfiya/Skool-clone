import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadMoreProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  useInfiniteScroll?: boolean;
  className?: string;
}

export function LoadMore({
  hasMore,
  isLoading,
  onLoadMore,
  useInfiniteScroll = false,
  className = "",
}: LoadMoreProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!useInfiniteScroll || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const current = observerRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [useInfiniteScroll, hasMore, isLoading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div className={`flex justify-center py-4 ${className}`} ref={observerRef}>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading more...</span>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={isLoading}
          data-testid="button-load-more"
        >
          Load More
        </Button>
      )}
    </div>
  );
}
