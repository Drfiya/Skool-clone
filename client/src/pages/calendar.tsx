import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
import { EventEditor } from "@/components/event-editor";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { EventWithDetails } from "@shared/schema";

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

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | undefined>(undefined);
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const handleEditEvent = (eventId: string) => {
    setEditingEventId(eventId);
    setEventEditorOpen(true);
  };

  const { data: eventsResponse, isLoading } = useQuery<PaginatedResponse<EventWithDetails>>({
    queryKey: ["/api/events"],
  });
  const events = eventsResponse?.data;

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      return apiRequest("POST", `/api/events/${eventId}/rsvp`, { status });
    },
    onSuccess: () => {
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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events?.filter((event) => isSameDay(new Date(event.startTime), date)) || [];
  };

  const hasEvents = (date: Date) => {
    return events?.some((event) => isSameDay(new Date(event.startTime), date)) || false;
  };

  const displayEvents = selectedDate 
    ? getEventsForDate(selectedDate) 
    : events?.slice(0, 5) || [];

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      
      <div className="flex-1 overflow-auto">
        <div className="container max-w-6xl py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Calendar</h1>
              <p className="text-muted-foreground">Community events and meetups</p>
            </div>
            {isAuthenticated && (
              <Button
                onClick={() => {
                  setEditingEventId(undefined);
                  setEventEditorOpen(true);
                }}
                data-testid="button-create-event"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                  <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      data-testid="button-prev-month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      data-testid="button-next-month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {monthDays.map((day) => {
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, new Date());
                      const dayHasEvents = hasEvents(day);

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(isSelected ? null : day)}
                          className={`
                            aspect-square flex flex-col items-center justify-center rounded-md text-sm relative
                            hover-elevate active-elevate-2
                            ${isSelected ? "bg-primary text-primary-foreground" : ""}
                            ${isToday && !isSelected ? "border border-primary" : ""}
                            ${!isSameMonth(day, currentMonth) ? "text-muted-foreground" : ""}
                          `}
                          data-testid={`button-day-${format(day, "yyyy-MM-dd")}`}
                        >
                          {format(day, "d")}
                          {dayHasEvents && (
                            <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">
                {selectedDate 
                  ? `Events on ${format(selectedDate, "MMM d, yyyy")}` 
                  : "Upcoming Events"
                }
              </h3>
              {isLoading ? (
                <>
                  <EventCardSkeleton />
                  <EventCardSkeleton />
                </>
              ) : displayEvents.length > 0 ? (
                displayEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onRsvp={(eventId, status) => rsvpMutation.mutate({ eventId, status })}
                    isRsvping={rsvpMutation.isPending}
                    onEdit={handleEditEvent}
                    currentUserId={user?.id}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {selectedDate ? "No events on this day" : "No upcoming events"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <EventEditor
        open={eventEditorOpen}
        onOpenChange={setEventEditorOpen}
        eventId={editingEventId}
      />
    </div>
  );
}
