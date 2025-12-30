import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, CalendarDays, MapPin, Clock, Users, Pencil, Check, HelpCircle, X } from "lucide-react";
import { format, isToday, isTomorrow, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TopBar } from "@/components/top-bar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { EventWithDetails, EventAttendeesGrouped, MemberWithProfile } from "@shared/schema";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Fetch event details
  const { data: event, isLoading: eventLoading } = useQuery<EventWithDetails>({
    queryKey: [`/api/events/${id}`],
    enabled: !!id,
  });

  // Fetch attendees
  const { data: attendees, isLoading: attendeesLoading } = useQuery<EventAttendeesGrouped>({
    queryKey: [`/api/events/${id}/attendees`],
    enabled: !!id,
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      return apiRequest("POST", `/api/events/${eventId}/rsvp`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/attendees`] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Success", description: "RSVP updated" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in to RSVP", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update RSVP", variant: "destructive" });
    },
  });

  const getDateLabel = (startDate: Date) => {
    if (isToday(startDate)) return "Today";
    if (isTomorrow(startDate)) return "Tomorrow";
    return format(startDate, "EEEE, MMMM d, yyyy");
  };

  const getTimeLabel = (startDate: Date, endDate: Date | null) => {
    const startTime = format(startDate, "h:mm a");
    if (endDate) {
      if (isSameDay(startDate, endDate)) {
        return `${startTime} - ${format(endDate, "h:mm a")}`;
      }
      return `${startTime} - ${format(endDate, "MMM d, h:mm a")}`;
    }
    return startTime;
  };

  const getCreatorInitials = () => {
    if (!event) return "?";
    const first = event.creator.firstName?.[0] || "";
    const last = event.creator.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const getCreatorName = () => {
    if (!event) return "Someone";
    if (event.creator.firstName || event.creator.lastName) {
      return `${event.creator.firstName || ""} ${event.creator.lastName || ""}`.trim();
    }
    return "Someone";
  };

  const isEventCreator = user && event && event.creator.id === user.id;

  const isLoading = eventLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <div className="container max-w-4xl py-6">
            <EventDetailSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col h-full">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <div className="container max-w-4xl py-6">
            <div className="text-center py-16">
              <CalendarDays className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
              <p className="text-muted-foreground mb-4">The event you are looking for does not exist or has been removed.</p>
              <Button asChild>
                <Link href="/calendar">Back to Calendar</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const startDate = new Date(event.startTime);
  const endDate = event.endTime ? new Date(event.endTime) : null;

  return (
    <div className="flex flex-col h-full">
      <TopBar />

      <div className="flex-1 overflow-auto">
        <div className="container max-w-4xl py-6">
          {/* Back Button & Edit Button */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" asChild data-testid="button-back-to-calendar">
              <Link href="/calendar">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Calendar
              </Link>
            </Button>
            {isEventCreator && (
              <Button
                variant="outline"
                data-testid="button-edit-event"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Header Card */}
              <Card data-testid="card-event-header">
                <CardContent className="pt-6">
                  {/* Date Badge */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <span className="text-xs font-medium uppercase">{format(startDate, "MMM")}</span>
                      <span className="text-2xl font-bold leading-tight">{format(startDate, "d")}</span>
                    </div>
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold mb-1" data-testid="text-event-title">
                        {event.title}
                      </h1>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Hosted by</span>
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={event.creator.profileImageUrl || undefined} alt={getCreatorName()} />
                          <AvatarFallback className="text-[10px]">{getCreatorInitials()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{getCreatorName()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{getDateLabel(startDate)}</p>
                        <p className="text-sm text-muted-foreground">{getTimeLabel(startDate, endDate)}</p>
                      </div>
                    </div>
                    {event.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{event.location}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{event.goingCount} going</p>
                        <p className="text-sm text-muted-foreground">
                          {event.maybeCount > 0 && `${event.maybeCount} maybe`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">About this event</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Attendees Card */}
              <Card data-testid="card-attendees">
                <CardHeader>
                  <CardTitle className="text-lg">Attendees</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="going" className="w-full">
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="going" className="gap-1">
                        <Check className="h-4 w-4" />
                        Going ({event.goingCount})
                      </TabsTrigger>
                      <TabsTrigger value="maybe" className="gap-1">
                        <HelpCircle className="h-4 w-4" />
                        Maybe ({event.maybeCount})
                      </TabsTrigger>
                      <TabsTrigger value="notGoing" className="gap-1">
                        <X className="h-4 w-4" />
                        Not Going ({event.notGoingCount})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="going" className="mt-4">
                      {attendeesLoading ? (
                        <AttendeeListSkeleton />
                      ) : attendees?.going && attendees.going.length > 0 ? (
                        <AttendeeList attendees={attendees.going} />
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No one is going yet</p>
                      )}
                    </TabsContent>
                    <TabsContent value="maybe" className="mt-4">
                      {attendeesLoading ? (
                        <AttendeeListSkeleton />
                      ) : attendees?.maybe && attendees.maybe.length > 0 ? (
                        <AttendeeList attendees={attendees.maybe} />
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No maybes yet</p>
                      )}
                    </TabsContent>
                    <TabsContent value="notGoing" className="mt-4">
                      {attendeesLoading ? (
                        <AttendeeListSkeleton />
                      ) : attendees?.notGoing && attendees.notGoing.length > 0 ? (
                        <AttendeeList attendees={attendees.notGoing} />
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No one has declined</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - RSVP */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <Card data-testid="card-rsvp">
                  <CardHeader>
                    <CardTitle className="text-lg">Your Response</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isAuthenticated ? (
                      <>
                        <Button
                          variant={event.userRsvpStatus === "going" ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "going" })}
                          disabled={rsvpMutation.isPending}
                          data-testid="button-rsvp-going"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Going
                          {event.userRsvpStatus === "going" && (
                            <Badge variant="secondary" className="ml-auto">Your response</Badge>
                          )}
                        </Button>
                        <Button
                          variant={event.userRsvpStatus === "maybe" ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "maybe" })}
                          disabled={rsvpMutation.isPending}
                          data-testid="button-rsvp-maybe"
                        >
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Maybe
                          {event.userRsvpStatus === "maybe" && (
                            <Badge variant="secondary" className="ml-auto">Your response</Badge>
                          )}
                        </Button>
                        <Button
                          variant={event.userRsvpStatus === "not_going" ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "not_going" })}
                          disabled={rsvpMutation.isPending}
                          data-testid="button-rsvp-not-going"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Not Going
                          {event.userRsvpStatus === "not_going" && (
                            <Badge variant="secondary" className="ml-auto">Your response</Badge>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-3">Sign in to RSVP to this event</p>
                        <Button asChild className="w-full">
                          <a href="/api/login">Sign In</a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Attendee List Component
interface AttendeeListProps {
  attendees: MemberWithProfile[];
}

function AttendeeList({ attendees }: AttendeeListProps) {
  const getMemberInitials = (member: MemberWithProfile) => {
    const first = member.firstName?.[0] || "";
    const last = member.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const getMemberName = (member: MemberWithProfile) => {
    if (member.firstName || member.lastName) {
      return `${member.firstName || ""} ${member.lastName || ""}`.trim();
    }
    return "Community Member";
  };

  return (
    <div className="space-y-2">
      {attendees.map((member) => (
        <Link key={member.id} href={`/members/${member.id}`}>
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.profileImageUrl || undefined} alt={getMemberName(member)} />
              <AvatarFallback>{getMemberInitials(member)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{getMemberName(member)}</p>
              {member.profile?.role && member.profile.role !== "member" && (
                <Badge variant="outline" className="text-xs capitalize">
                  {member.profile.role}
                </Badge>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// Skeleton Components
function EventDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-40" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="w-16 h-16 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-8 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
              <Skeleton className="h-px w-full mb-4" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>

          {/* Attendees Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full mb-4" />
              <AttendeeListSkeleton />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Skeleton */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AttendeeListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
