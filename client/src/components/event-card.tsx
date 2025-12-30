import { CalendarDays, MapPin, Users, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EventWithDetails } from "@shared/schema";
import { format, isSameDay, isToday, isTomorrow } from "date-fns";

interface EventCardProps {
  event: EventWithDetails;
  onRsvp?: (eventId: string, status: "going" | "maybe" | "not_going") => void;
  isRsvping?: boolean;
}

export function EventCard({ event, onRsvp, isRsvping }: EventCardProps) {
  const startDate = new Date(event.startTime);
  const endDate = event.endTime ? new Date(event.endTime) : null;

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

  return (
    <Card className="overflow-visible" data-testid={`card-event-${event.id}`}>
      <CardContent className="pt-4">
        <div className="flex gap-4">
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-md bg-primary/10 text-primary flex-shrink-0">
            <span className="text-xs font-medium uppercase">{format(startDate, "MMM")}</span>
            <span className="text-xl font-bold leading-tight">{format(startDate, "d")}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1 line-clamp-1" data-testid={`text-event-title-${event.id}`}>
              {event.title}
            </h3>
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
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{event.attendeesCount} attending</span>
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
      <CardFooter className="pt-0 gap-2">
        <Button 
          variant={event.isAttending ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => onRsvp?.(event.id, event.isAttending ? "not_going" : "going")}
          disabled={isRsvping}
          data-testid={`button-rsvp-${event.id}`}
        >
          {event.isAttending ? "Going" : "RSVP"}
        </Button>
        <Button 
          variant="ghost"
          size="sm"
          onClick={() => onRsvp?.(event.id, "maybe")}
          disabled={isRsvping}
          data-testid={`button-maybe-${event.id}`}
        >
          Maybe
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
      <CardFooter className="pt-0 gap-2">
        <div className="h-8 flex-1 bg-muted animate-pulse rounded" />
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      </CardFooter>
    </Card>
  );
}
