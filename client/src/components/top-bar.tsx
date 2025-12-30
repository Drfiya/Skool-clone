import { Bell, Search, Plus } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/hooks/use-auth";

interface TopBarProps {
  onCreatePost?: () => void;
}

export function TopBar({ onCreatePost }: TopBarProps) {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
      </div>
      
      <div className="flex flex-1 items-center justify-center max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            type="search"
            placeholder="Search..." 
            className="w-full pl-9"
            data-testid="input-search"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isAuthenticated && onCreatePost && (
          <Button onClick={onCreatePost} size="sm" data-testid="button-create-post">
            <Plus className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Create Post</span>
          </Button>
        )}
        <Button variant="ghost" size="icon" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
