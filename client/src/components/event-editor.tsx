import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";
import type { EventWithDetails } from "@shared/schema";

// Form schema
const eventFormSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.date({ required_error: "Start date is required" }),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.date().optional(),
  endTime: z.string().optional(),
}).refine((data) => {
  // Validate that end datetime is after start datetime if both are provided
  if (data.endDate && data.endTime) {
    const startDateTime = combineDateAndTime(data.startDate, data.startTime);
    const endDateTime = combineDateAndTime(data.endDate, data.endTime);
    return endDateTime > startDateTime;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

type EventFormValues = z.infer<typeof eventFormSchema>;

// Helper to combine date and time string into a Date object
function combineDateAndTime(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// Helper to extract time string from Date
function getTimeString(date: Date): string {
  return format(date, "HH:mm");
}

interface EventEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string; // If provided, we're editing an existing event
  onSuccess?: () => void;
}

export function EventEditor({ open, onOpenChange, eventId, onSuccess }: EventEditorProps) {
  const { toast } = useToast();
  const isEditMode = !!eventId;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch existing event data if editing
  const { data: event, isLoading: eventLoading } = useQuery<EventWithDetails>({
    queryKey: [`/api/events/${eventId}`],
    enabled: isEditMode && open,
    queryFn: async () => {
      // Note: We need to fetch the event data. The getEvent endpoint might not be exposed publicly,
      // but we can use the events list and filter, or the API might return it directly
      const res = await fetch(`/api/events`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      const foundEvent = data.data?.find((e: EventWithDetails) => e.id === eventId);
      if (!foundEvent) throw new Error("Event not found");
      return foundEvent;
    },
  });

  // Form setup
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      startDate: new Date(),
      startTime: "12:00",
      endDate: undefined,
      endTime: "",
    },
  });

  // Reset form when event data loads (edit mode)
  useEffect(() => {
    if (event && isEditMode) {
      const startDate = new Date(event.startTime);
      const endDate = event.endTime ? new Date(event.endTime) : undefined;

      form.reset({
        title: event.title,
        description: event.description || "",
        location: event.location || "",
        startDate: startDate,
        startTime: getTimeString(startDate),
        endDate: endDate,
        endTime: endDate ? getTimeString(endDate) : "",
      });
    }
  }, [event, isEditMode, form]);

  // Reset form when dialog closes or opens in create mode
  useEffect(() => {
    if (!open) {
      form.reset({
        title: "",
        description: "",
        location: "",
        startDate: new Date(),
        startTime: "12:00",
        endDate: undefined,
        endTime: "",
      });
    } else if (!isEditMode) {
      // Reset for create mode
      form.reset({
        title: "",
        description: "",
        location: "",
        startDate: new Date(),
        startTime: "12:00",
        endDate: undefined,
        endTime: "",
      });
    }
  }, [open, isEditMode, form]);

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const startDateTime = combineDateAndTime(data.startDate, data.startTime);
      const endDateTime = data.endDate && data.endTime
        ? combineDateAndTime(data.endDate, data.endTime)
        : null;

      const res = await apiRequest("POST", "/api/events", {
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime?.toISOString() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Success", description: "Event created successfully!" });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create event", variant: "destructive" });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const startDateTime = combineDateAndTime(data.startDate, data.startTime);
      const endDateTime = data.endDate && data.endTime
        ? combineDateAndTime(data.endDate, data.endTime)
        : null;

      const res = await apiRequest("PATCH", `/api/events/${eventId}`, {
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime?.toISOString() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      toast({ title: "Success", description: "Event updated successfully!" });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update event", variant: "destructive" });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Success", description: "Event deleted successfully!" });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete event", variant: "destructive" });
    },
  });

  const handleSubmit = (values: EventFormValues) => {
    if (isEditMode) {
      updateEventMutation.mutate(values);
    } else {
      createEventMutation.mutate(values);
    }
  };

  const handleDelete = () => {
    deleteEventMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const isLoading = eventLoading;
  const isMutating = createEventMutation.isPending || updateEventMutation.isPending || deleteEventMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Event" : "Create Event"}</SheetTitle>
            <SheetDescription>
              {isEditMode
                ? "Update your event details."
                : "Create a new event for your community."}
            </SheetDescription>
          </SheetHeader>

          {isEditMode && isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6 pb-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter event title"
                              {...field}
                              data-testid="input-event-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your event..."
                              className="min-h-24 resize-none"
                              {...field}
                              data-testid="textarea-event-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Location */}
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Event location or link"
                              {...field}
                              data-testid="input-event-location"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Start Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Date *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                    data-testid="button-start-date"
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time *</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                data-testid="input-start-time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* End Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>End Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                    data-testid="button-end-date"
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => {
                                    const startDate = form.getValues("startDate");
                                    return date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                                           (startDate && date < startDate);
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                data-testid="input-end-time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        data-testid="button-cancel-event"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isMutating}
                        data-testid="button-save-event"
                      >
                        {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? "Save Changes" : "Create Event"}
                      </Button>
                    </div>
                  </form>
                </Form>

                {/* Delete Section (Edit Mode Only) */}
                {isEditMode && event && (
                  <>
                    <Separator />
                    <div className="pt-2">
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={isMutating}
                        data-testid="button-delete-event"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Event
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event?.title}"? This action cannot be undone.
              All RSVPs will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
