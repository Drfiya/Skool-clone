import { CalendarDays, MapPin, Users, Clock, Pencil, Check, HelpCircle, X } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EventWithDetails } from "@shared/schema";
import { format, isSameDay, isToday, isTomorrow } from "date-fns";

interface EventCardProps {
  event: EventWithDetails;
  onRsvp?: (eventId: string, status: "going" | "maybe" | "not_going") => void;
  isRsvping?: boolean;
  onEdit?: (eventId: string) => void;
  currentUserId?: string;
}

export function EventCard({ event, onRsvp, isRsvping, onEdit, currentUserId }: EventCardProps) {
  const startDate = new Date(event.startTime);
  const endDate = event.endTime ? new Date(event.endTime) : null;
  const isCreator = currentUserId && event.creator.id === currentUserId;

  const getDateLabel = () => {
    if (isToday(startDate)) return "Today";
    if (isTomorrow(startDate)) return "Tomorrow";
    return format(startDate, "EEEE, MMM d");
  };

  const getTimeLabel = () => {
    const startTime = format(startDate, "h:mm a");
    if (endDate) {
      const endTime = format(endDate, "h:mm a");
      return `${startTime} - ${endTime}`;
    }
    return startTime;
  };

  const getCreatorInitials = () => {
    const first = event.creator.firstName?.[0] || "";
    const last = event.creator.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const getCreatorName = () => {
    if (event.creator.firstName || event.creator.lastName) {
      return `${event.creator.firstName || ""} ${event.creator.lastName || ""}`.trim();
    }
    return "Someone";
  };

  const handleRsvp = (status: "going" | "maybe" | "not_going") => {
    if (!onRsvp) return;
    // If clicking the current status, do nothing (user already has this status)
    if (event.userRsvpStatus === status) return;
    onRsvp(event.id, status);
  };

  const isGoing = event.userRsvpStatus === "going";
  const isMaybe = event.userRsvpStatus === "maybe";
  const isNotGoing = event.userRsvpStatus === "not_going";

  return (
    <Card className="overflow-visible" data-testid={`card-event-${event.id}`}>
      <CardContent className="pt-4">
        <div className="flex gap-4">
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-md bg-primary/10 text-primary flex-shrink-0">
            <span className="text-xs font-medium uppercase">{format(startDate, "MMM")}</span>
            <span className="text-xl font-bold leading-tight">{format(startDate, "d")}</span>
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/calendar/${event.id}`}>
              <h3 className="font-semibold text-base mb-1 line-clamp-1 hover:text-primary hover:underline cursor-pointer transition-colors" data-testid={`text-event-title-${event.id}`}>
                {event.title}
              </h3>
            </Link>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{getDateLabel()}, {getTimeLabel()}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-green-600 dark:text-green-400">{event.goingCount} going</span>
                </div>
                {event.maybeCount > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400">{event.maybeCount} maybe</span>
                )}
                {event.notGoingCount > 0 && (
                  <span className="text-muted-foreground">{event.notGoingCount} declined</span>
                )}
              </div>
            </div>
          </div>
        </div>
        {event.description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {event.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>Hosted by</span>
          <Avatar className="h-5 w-5">
            <AvatarImage src={event.creator.profileImageUrl || undefined} alt={getCreatorName()} />
            <AvatarFallback className="text-[10px]">{getCreatorInitials()}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{getCreatorName()}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 gap-2 flex-wrap">
        <Button
          variant={isGoing ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex-1 min-w-[70px]",
            isGoing && "bg-green-600 hover:bg-green-700 text-white border-green-600"
          )}
          onClick={() => handleRsvp("going")}
          disabled={isRsvping}
          data-testid={`button-going-${event.id}`}
        >
          <Check className="h-4 w-4 mr-1" />
          Going
        </Button>
        <Button
          variant={isMaybe ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex-1 min-w-[70px]",
            isMaybe && "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
          )}
          onClick={() => handleRsvp("maybe")}
          disabled={isRsvping}
          data-testid={`button-maybe-${event.id}`}
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          Maybe
        </Button>
        <Button
          variant={isNotGoing ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex-1 min-w-[70px]",
            isNotGoing && "bg-muted hover:bg-muted/80 text-muted-foreground border-muted"
          )}
          onClick={() => handleRsvp("not_going")}
          disabled={isRsvping}
          data-testid={`button-not-going-${event.id}`}
        >
          <X className="h-4 w-4 mr-1" />
          Can't Go
        </Button>
        {isCreator && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(event.id)}
            data-testid={`button-edit-event-${event.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto underline"
          asChild
          data-testid={`button-view-event-${event.id}`}
        >
          <Link href={`/calendar/${event.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function EventCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-4">
          <div className="w-14 h-14 rounded-md bg-muted animate-pulse" />
          <div className="flex-1">
            <div className="h-5 w-3/4 bg-muted animate-pulse rounded mb-2" />
            <div className="space-y-1">
              <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 gap-2 flex-wrap">
        <div className="h-8 flex-1 min-w-[70px] bg-muted animate-pulse rounded" />
        <div className="h-8 flex-1 min-w-[70px] bg-muted animate-pulse rounded" />
        <div className="h-8 flex-1 min-w-[70px] bg-muted animate-pulse rounded" />
      </CardFooter>
    </Card>
  );
}
