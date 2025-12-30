import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/hooks/use-auth";

import LandingPage from "@/pages/landing";
import FeedPage from "@/pages/feed";
import ClassroomPage from "@/pages/classroom";
import CourseDetailPage from "@/pages/course-detail";
import LessonPage from "@/pages/lesson";
import MembersPage from "@/pages/members";
import CalendarPage from "@/pages/calendar";
import EventDetailPage from "@/pages/event-detail";
import LeaderboardPage from "@/pages/leaderboard";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Switch>
            <Route path="/" component={FeedPage} />
            <Route path="/classroom" component={ClassroomPage} />
            <Route path="/classroom/:courseId/lesson/:lessonId" component={LessonPage} />
            <Route path="/classroom/:id" component={CourseDetailPage} />
            <Route path="/members" component={MembersPage} />
            <Route path="/members/:id" component={ProfilePage} />
            <Route path="/calendar" component={CalendarPage} />
            <Route path="/calendar/:id" component={EventDetailPage} />
            <Route path="/leaderboard" component={LeaderboardPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="skool-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
