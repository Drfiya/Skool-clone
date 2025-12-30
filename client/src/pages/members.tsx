import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MemberCard, MemberCardSkeleton } from "@/components/member-card";
import { TopBar } from "@/components/top-bar";
import type { MemberWithProfile } from "@shared/schema";

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: members, isLoading } = useQuery<MemberWithProfile[]>({
    queryKey: ["/api/members"],
  });

  const filteredMembers = members?.filter((member) => {
    if (!searchQuery) return true;
    const name = `${member.firstName || ""} ${member.lastName || ""}`.toLowerCase();
    const email = member.email?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      
      <div className="flex-1 overflow-auto">
        <div className="container max-w-6xl py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Members</h1>
              <p className="text-muted-foreground">
                {members?.length || 0} members in this community
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-members"
              />
            </div>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="button-grid-view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                data-testid="button-list-view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className={viewMode === "grid" 
              ? "grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
              : "grid gap-4 sm:grid-cols-2"
            }>
              {[...Array(8)].map((_, i) => (
                <MemberCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredMembers && filteredMembers.length > 0 ? (
            <div className={viewMode === "grid" 
              ? "grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
              : "grid gap-4 sm:grid-cols-2"
            }>
              {filteredMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg mb-2">No members found</p>
              <p className="text-sm">
                {searchQuery ? "Try a different search term" : "Be the first to join!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
