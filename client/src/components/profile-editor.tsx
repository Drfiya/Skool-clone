import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { MemberWithProfile } from "@shared/schema";

// Form schema
const profileFormSchema = z.object({
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  coverImageUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfile: MemberWithProfile | null | undefined;
}

export function ProfileEditor({ open, onOpenChange, currentProfile }: ProfileEditorProps) {
  const { toast } = useToast();

  // Form setup
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      bio: "",
      location: "",
      website: "",
      coverImageUrl: "",
    },
  });

  // Reset form when dialog opens with current profile data
  useEffect(() => {
    if (open && currentProfile) {
      form.reset({
        bio: currentProfile.profile?.bio || "",
        location: currentProfile.profile?.location || "",
        website: currentProfile.profile?.website || "",
        coverImageUrl: currentProfile.profile?.coverImageUrl || "",
      });
    }
  }, [open, currentProfile, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PATCH", "/api/members/me", {
        bio: data.bio || null,
        location: data.location || null,
        website: data.website || null,
        coverImageUrl: data.coverImageUrl || null,
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate both the member query and any /api/members queries
      queryClient.invalidateQueries({ queryKey: ["/api/members", currentProfile?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Success", description: "Profile updated successfully!" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  const handleSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  const isMutating = updateProfileMutation.isPending;

  // Preview URL for cover image
  const coverImagePreview = form.watch("coverImageUrl");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>
            Update your profile information.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* Bio */}
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about yourself..."
                          className="min-h-24 resize-none"
                          {...field}
                          data-testid="textarea-profile-bio"
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
                          placeholder="e.g., San Francisco, CA"
                          {...field}
                          data-testid="input-profile-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Website */}
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://yourwebsite.com"
                          {...field}
                          data-testid="input-profile-website"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cover Image URL */}
                <FormField
                  control={form.control}
                  name="coverImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/cover.jpg"
                          {...field}
                          data-testid="input-profile-cover-image"
                        />
                      </FormControl>
                      <FormMessage />
                      {/* Cover Image Preview */}
                      {coverImagePreview && (
                        <div className="mt-2 rounded-md overflow-hidden border">
                          <img
                            src={coverImagePreview}
                            alt="Cover preview"
                            className="w-full h-24 object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-cancel-profile"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isMutating}
                    data-testid="button-save-profile"
                  >
                    {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
