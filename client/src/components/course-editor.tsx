import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Loader2,
  BookOpen,
} from "lucide-react";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { Course, CourseModule, Lesson } from "@shared/schema";

// Form schemas
const courseFormSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  description: z.string().optional(),
  thumbnailUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

const moduleFormSchema = z.object({
  title: z.string().min(1, "Module title is required"),
  description: z.string().optional(),
});

const lessonFormSchema = z.object({
  title: z.string().min(1, "Lesson title is required"),
  content: z.string().optional(),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  duration: z.coerce.number().min(0).optional(),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;
type ModuleFormValues = z.infer<typeof moduleFormSchema>;
type LessonFormValues = z.infer<typeof lessonFormSchema>;

// Type for module with lessons
type ModuleWithLessons = CourseModule & { lessons: Lesson[] };

interface CourseEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string; // If provided, we're editing an existing course
  onSuccess?: () => void;
}

export function CourseEditor({ open, onOpenChange, courseId, onSuccess }: CourseEditorProps) {
  const { toast } = useToast();
  const isEditMode = !!courseId;

  // State for managing modules/lessons editing
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [addingModuleToCourse, setAddingModuleToCourse] = useState(false);
  const [addingLessonToModule, setAddingLessonToModule] = useState<string | null>(null);

  // Confirmation dialogs state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "course" | "module" | "lesson";
    id: string;
    title: string;
  } | null>(null);

  // Fetch existing course data if editing
  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: isEditMode && open,
  });

  // Fetch modules with lessons if editing
  const { data: modules, isLoading: modulesLoading } = useQuery<ModuleWithLessons[]>({
    queryKey: [`/api/courses/${courseId}/modules`],
    enabled: isEditMode && open,
  });

  // Course form
  const courseForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      thumbnailUrl: "",
    },
  });

  // Module form
  const moduleForm = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Lesson form
  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: "",
      content: "",
      videoUrl: "",
      duration: 0,
    },
  });

  // Reset course form when course data loads
  useEffect(() => {
    if (course && isEditMode) {
      courseForm.reset({
        title: course.title,
        description: course.description || "",
        thumbnailUrl: course.thumbnailUrl || "",
      });
    }
  }, [course, isEditMode, courseForm]);

  // Reset forms when dialog closes
  useEffect(() => {
    if (!open) {
      courseForm.reset({ title: "", description: "", thumbnailUrl: "" });
      moduleForm.reset({ title: "", description: "" });
      lessonForm.reset({ title: "", content: "", videoUrl: "", duration: 0 });
      setEditingModule(null);
      setEditingLesson(null);
      setAddingModuleToCourse(false);
      setAddingLessonToModule(null);
    }
  }, [open, courseForm, moduleForm, lessonForm]);

  // ==== MUTATIONS ====

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: async (data: CourseFormValues) => {
      const res = await apiRequest("POST", "/api/courses", {
        title: data.title,
        description: data.description || null,
        thumbnailUrl: data.thumbnailUrl || null,
      });
      return res.json();
    },
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Success", description: "Course created successfully!" });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create course", variant: "destructive" });
    },
  });

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: async (data: CourseFormValues & { isPublished?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/courses/${courseId}`, {
        title: data.title,
        description: data.description || null,
        thumbnailUrl: data.thumbnailUrl || null,
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
      toast({ title: "Success", description: "Course updated successfully!" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update course", variant: "destructive" });
    },
  });

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Success", description: "Course deleted successfully!" });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete course", variant: "destructive" });
    },
  });

  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: async (data: ModuleFormValues) => {
      const orderIndex = modules?.length || 0;
      const res = await apiRequest("POST", `/api/courses/${courseId}/modules`, {
        title: data.title,
        description: data.description || null,
        orderIndex,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/modules`] });
      toast({ title: "Success", description: "Module created successfully!" });
      setAddingModuleToCourse(false);
      moduleForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create module", variant: "destructive" });
    },
  });

  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: async ({ moduleId, data }: { moduleId: string; data: ModuleFormValues }) => {
      const res = await apiRequest("PATCH", `/api/modules/${moduleId}`, {
        title: data.title,
        description: data.description || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/modules`] });
      toast({ title: "Success", description: "Module updated successfully!" });
      setEditingModule(null);
      moduleForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update module", variant: "destructive" });
    },
  });

  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      await apiRequest("DELETE", `/api/modules/${moduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/modules`] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
      toast({ title: "Success", description: "Module deleted successfully!" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete module", variant: "destructive" });
    },
  });

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: async ({ moduleId, data }: { moduleId: string; data: LessonFormValues }) => {
      const module = modules?.find(m => m.id === moduleId);
      const orderIndex = module?.lessons.length || 0;
      const res = await apiRequest("POST", `/api/modules/${moduleId}/lessons`, {
        title: data.title,
        content: data.content || null,
        videoUrl: data.videoUrl || null,
        duration: data.duration || null,
        orderIndex,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/modules`] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
      toast({ title: "Success", description: "Lesson created successfully!" });
      setAddingLessonToModule(null);
      lessonForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create lesson", variant: "destructive" });
    },
  });

  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: async ({ lessonId, data }: { lessonId: string; data: LessonFormValues }) => {
      const res = await apiRequest("PATCH", `/api/lessons/${lessonId}`, {
        title: data.title,
        content: data.content || null,
        videoUrl: data.videoUrl || null,
        duration: data.duration || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/modules`] });
      toast({ title: "Success", description: "Lesson updated successfully!" });
      setEditingLesson(null);
      lessonForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update lesson", variant: "destructive" });
    },
  });

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      await apiRequest("DELETE", `/api/lessons/${lessonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/modules`] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
      toast({ title: "Success", description: "Lesson deleted successfully!" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete lesson", variant: "destructive" });
    },
  });

  // Reorder modules mutation
  const reorderModulesMutation = useMutation({
    mutationFn: async (moduleIds: string[]) => {
      await apiRequest("PUT", `/api/courses/${courseId}/modules/reorder`, { moduleIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/modules`] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reorder modules", variant: "destructive" });
    },
  });

  // Reorder lessons mutation
  const reorderLessonsMutation = useMutation({
    mutationFn: async ({ moduleId, lessonIds }: { moduleId: string; lessonIds: string[] }) => {
      await apiRequest("PUT", `/api/modules/${moduleId}/lessons/reorder`, { lessonIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/modules`] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reorder lessons", variant: "destructive" });
    },
  });

  // ==== HANDLERS ====

  const handleCourseSubmit = (values: CourseFormValues) => {
    if (isEditMode) {
      updateCourseMutation.mutate(values);
    } else {
      createCourseMutation.mutate(values);
    }
  };

  const handleTogglePublish = () => {
    if (course) {
      updateCourseMutation.mutate({
        ...courseForm.getValues(),
        isPublished: !course.isPublished,
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === "course") {
      deleteCourseMutation.mutate();
    } else if (deleteConfirm.type === "module") {
      deleteModuleMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === "lesson") {
      deleteLessonMutation.mutate(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  const handleMoveModule = (moduleId: string, direction: "up" | "down") => {
    if (!modules) return;
    const currentIndex = modules.findIndex(m => m.id === moduleId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;

    const newModuleIds = modules.map(m => m.id);
    [newModuleIds[currentIndex], newModuleIds[newIndex]] = [newModuleIds[newIndex], newModuleIds[currentIndex]];
    reorderModulesMutation.mutate(newModuleIds);
  };

  const handleMoveLesson = (moduleId: string, lessonId: string, direction: "up" | "down") => {
    const module = modules?.find(m => m.id === moduleId);
    if (!module) return;

    const currentIndex = module.lessons.findIndex(l => l.id === lessonId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= module.lessons.length) return;

    const newLessonIds = module.lessons.map(l => l.id);
    [newLessonIds[currentIndex], newLessonIds[newIndex]] = [newLessonIds[newIndex], newLessonIds[currentIndex]];
    reorderLessonsMutation.mutate({ moduleId, lessonIds: newLessonIds });
  };

  const startEditModule = (module: CourseModule) => {
    setEditingModule(module.id);
    moduleForm.reset({
      title: module.title,
      description: module.description || "",
    });
  };

  const startEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson.id);
    lessonForm.reset({
      title: lesson.title,
      content: lesson.content || "",
      videoUrl: lesson.videoUrl || "",
      duration: lesson.duration || 0,
    });
  };

  const isLoading = courseLoading || modulesLoading;
  const isMutating = createCourseMutation.isPending || updateCourseMutation.isPending ||
                     deleteCourseMutation.isPending || createModuleMutation.isPending ||
                     updateModuleMutation.isPending || deleteModuleMutation.isPending ||
                     createLessonMutation.isPending || updateLessonMutation.isPending ||
                     deleteLessonMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Course" : "Create Course"}</SheetTitle>
            <SheetDescription>
              {isEditMode
                ? "Update your course details, modules, and lessons."
                : "Create a new course for your community."}
            </SheetDescription>
          </SheetHeader>

          {isEditMode && isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6 pb-6">
                {/* Course Details Form */}
                <Form {...courseForm}>
                  <form onSubmit={courseForm.handleSubmit(handleCourseSubmit)} className="space-y-4">
                    <FormField
                      control={courseForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Title *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter course title"
                              {...field}
                              data-testid="input-course-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your course..."
                              className="min-h-24 resize-none"
                              {...field}
                              data-testid="textarea-course-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="thumbnailUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thumbnail URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/image.jpg"
                              {...field}
                              data-testid="input-course-thumbnail"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-2">
                      {!isEditMode && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onOpenChange(false)}
                          data-testid="button-cancel-course"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="submit"
                        disabled={isMutating}
                        data-testid="button-save-course"
                      >
                        {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? "Save Changes" : "Create Course"}
                      </Button>
                    </div>
                  </form>
                </Form>

                {/* Edit Mode: Publish Toggle & Modules/Lessons */}
                {isEditMode && course && (
                  <>
                    <Separator />

                    {/* Publish Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Published</Label>
                        <p className="text-sm text-muted-foreground">
                          {course.isPublished
                            ? "Course is visible to all members"
                            : "Course is hidden from members"}
                        </p>
                      </div>
                      <Switch
                        checked={course.isPublished}
                        onCheckedChange={handleTogglePublish}
                        disabled={isMutating}
                        data-testid="switch-course-publish"
                      />
                    </div>

                    <Separator />

                    {/* Modules Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Modules</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAddingModuleToCourse(true);
                            moduleForm.reset({ title: "", description: "" });
                          }}
                          disabled={isMutating}
                          data-testid="button-add-module"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Module
                        </Button>
                      </div>

                      {/* Add Module Form */}
                      {addingModuleToCourse && (
                        <div className="border rounded-lg p-4 mb-4 bg-muted/50">
                          <h4 className="font-medium mb-3">New Module</h4>
                          <Form {...moduleForm}>
                            <form
                              onSubmit={moduleForm.handleSubmit((values) => createModuleMutation.mutate(values))}
                              className="space-y-3"
                            >
                              <FormField
                                control={moduleForm.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Module title" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={moduleForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Module description (optional)"
                                        className="min-h-16 resize-none"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAddingModuleToCourse(false)}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={createModuleMutation.isPending}>
                                  {createModuleMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                  Add Module
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </div>
                      )}

                      {/* Modules List */}
                      {modules && modules.length > 0 ? (
                        <Accordion type="multiple" className="space-y-2">
                          {modules.map((module, moduleIndex) => (
                            <AccordionItem
                              key={module.id}
                              value={module.id}
                              className="border rounded-lg"
                              data-testid={`module-item-${module.id}`}
                            >
                              <AccordionTrigger className="px-4 hover:no-underline">
                                <div className="flex items-center gap-2 flex-1 text-left">
                                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium">{module.title}</span>
                                  <span className="text-xs text-muted-foreground ml-auto mr-2">
                                    {module.lessons.length} lessons
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                {/* Module Edit Form */}
                                {editingModule === module.id ? (
                                  <div className="border rounded-lg p-3 mb-3 bg-muted/30">
                                    <Form {...moduleForm}>
                                      <form
                                        onSubmit={moduleForm.handleSubmit((values) =>
                                          updateModuleMutation.mutate({ moduleId: module.id, data: values })
                                        )}
                                        className="space-y-3"
                                      >
                                        <FormField
                                          control={moduleForm.control}
                                          name="title"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Title *</FormLabel>
                                              <FormControl>
                                                <Input placeholder="Module title" {...field} />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={moduleForm.control}
                                          name="description"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Description</FormLabel>
                                              <FormControl>
                                                <Textarea
                                                  placeholder="Module description"
                                                  className="min-h-16 resize-none"
                                                  {...field}
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditingModule(null)}
                                          >
                                            Cancel
                                          </Button>
                                          <Button type="submit" size="sm" disabled={updateModuleMutation.isPending}>
                                            {updateModuleMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                            Save
                                          </Button>
                                        </div>
                                      </form>
                                    </Form>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 mb-3">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEditModule(module)}
                                      data-testid={`button-edit-module-${module.id}`}
                                    >
                                      Edit Module
                                    </Button>
                                    <div className="flex-1" />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleMoveModule(module.id, "up")}
                                      disabled={moduleIndex === 0 || reorderModulesMutation.isPending}
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleMoveModule(module.id, "down")}
                                      disabled={moduleIndex === modules.length - 1 || reorderModulesMutation.isPending}
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => setDeleteConfirm({ type: "module", id: module.id, title: module.title })}
                                      data-testid={`button-delete-module-${module.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}

                                {/* Module description */}
                                {module.description && editingModule !== module.id && (
                                  <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                                )}

                                {/* Add Lesson Form */}
                                {addingLessonToModule === module.id && (
                                  <div className="border rounded-lg p-3 mb-3 bg-muted/30">
                                    <h5 className="font-medium mb-2 text-sm">New Lesson</h5>
                                    <Form {...lessonForm}>
                                      <form
                                        onSubmit={lessonForm.handleSubmit((values) =>
                                          createLessonMutation.mutate({ moduleId: module.id, data: values })
                                        )}
                                        className="space-y-3"
                                      >
                                        <FormField
                                          control={lessonForm.control}
                                          name="title"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Title *</FormLabel>
                                              <FormControl>
                                                <Input placeholder="Lesson title" {...field} />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={lessonForm.control}
                                          name="content"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Content</FormLabel>
                                              <FormControl>
                                                <Textarea
                                                  placeholder="Lesson content"
                                                  className="min-h-20 resize-none"
                                                  {...field}
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                          <FormField
                                            control={lessonForm.control}
                                            name="videoUrl"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Video URL</FormLabel>
                                                <FormControl>
                                                  <Input placeholder="https://..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={lessonForm.control}
                                            name="duration"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Duration (min)</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    type="number"
                                                    placeholder="0"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAddingLessonToModule(null)}
                                          >
                                            Cancel
                                          </Button>
                                          <Button type="submit" size="sm" disabled={createLessonMutation.isPending}>
                                            {createLessonMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                            Add Lesson
                                          </Button>
                                        </div>
                                      </form>
                                    </Form>
                                  </div>
                                )}

                                {/* Lessons List */}
                                <div className="space-y-2">
                                  {module.lessons.map((lesson, lessonIndex) => (
                                    <div
                                      key={lesson.id}
                                      className="border rounded-md p-3 bg-background"
                                      data-testid={`lesson-item-${lesson.id}`}
                                    >
                                      {editingLesson === lesson.id ? (
                                        <Form {...lessonForm}>
                                          <form
                                            onSubmit={lessonForm.handleSubmit((values) =>
                                              updateLessonMutation.mutate({ lessonId: lesson.id, data: values })
                                            )}
                                            className="space-y-3"
                                          >
                                            <FormField
                                              control={lessonForm.control}
                                              name="title"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel>Title *</FormLabel>
                                                  <FormControl>
                                                    <Input placeholder="Lesson title" {...field} />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <FormField
                                              control={lessonForm.control}
                                              name="content"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel>Content</FormLabel>
                                                  <FormControl>
                                                    <Textarea
                                                      placeholder="Lesson content"
                                                      className="min-h-20 resize-none"
                                                      {...field}
                                                    />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                              <FormField
                                                control={lessonForm.control}
                                                name="videoUrl"
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel>Video URL</FormLabel>
                                                    <FormControl>
                                                      <Input placeholder="https://..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                  </FormItem>
                                                )}
                                              />
                                              <FormField
                                                control={lessonForm.control}
                                                name="duration"
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel>Duration (min)</FormLabel>
                                                    <FormControl>
                                                      <Input
                                                        type="number"
                                                        placeholder="0"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                      />
                                                    </FormControl>
                                                    <FormMessage />
                                                  </FormItem>
                                                )}
                                              />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEditingLesson(null)}
                                              >
                                                Cancel
                                              </Button>
                                              <Button type="submit" size="sm" disabled={updateLessonMutation.isPending}>
                                                {updateLessonMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                                Save
                                              </Button>
                                            </div>
                                          </form>
                                        </Form>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{lesson.title}</p>
                                            {lesson.duration && (
                                              <p className="text-xs text-muted-foreground">{lesson.duration} min</p>
                                            )}
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => startEditLesson(lesson)}
                                            data-testid={`button-edit-lesson-${lesson.id}`}
                                          >
                                            Edit
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => handleMoveLesson(module.id, lesson.id, "up")}
                                            disabled={lessonIndex === 0 || reorderLessonsMutation.isPending}
                                          >
                                            <ChevronUp className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => handleMoveLesson(module.id, lesson.id, "down")}
                                            disabled={lessonIndex === module.lessons.length - 1 || reorderLessonsMutation.isPending}
                                          >
                                            <ChevronDown className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteConfirm({ type: "lesson", id: lesson.id, title: lesson.title })}
                                            data-testid={`button-delete-lesson-${lesson.id}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Add Lesson Button */}
                                {addingLessonToModule !== module.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => {
                                      setAddingLessonToModule(module.id);
                                      lessonForm.reset({ title: "", content: "", videoUrl: "", duration: 0 });
                                    }}
                                    disabled={isMutating}
                                    data-testid={`button-add-lesson-${module.id}`}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Lesson
                                  </Button>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : !addingModuleToCourse && (
                        <div className="text-center py-8 border rounded-lg bg-muted/30">
                          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">No modules yet</p>
                          <p className="text-xs text-muted-foreground">Add your first module to start building the course</p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Delete Course */}
                    <div className="pt-2">
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => setDeleteConfirm({ type: "course", id: courseId!, title: course.title })}
                        disabled={isMutating}
                        data-testid="button-delete-course"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Course
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
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteConfirm?.type === "course" ? "Course" : deleteConfirm?.type === "module" ? "Module" : "Lesson"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"? This action cannot be undone.
              {deleteConfirm?.type === "course" && " All modules and lessons within this course will also be deleted."}
              {deleteConfirm?.type === "module" && " All lessons within this module will also be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
