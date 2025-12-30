import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaderboardTable, LeaderboardTableSkeleton } from "@/components/leaderboard-table";
import { TopBar } from "@/components/top-bar";
import type { MemberWithProfile } from "@shared/schema";

export default function LeaderboardPage() {
  const { data: members, isLoading } = useQuery<MemberWithProfile[]>({
    queryKey: ["/api/leaderboard"],
  });

  const totalPoints = members?.reduce((sum, m) => sum + (m.profile?.points || 0), 0) || 0;
  const topMember = members?.[0];

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      
      <div className="flex-1 overflow-auto">
        <div className="container max-w-4xl py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Leaderboard</h1>
            <p className="text-muted-foreground">See who's leading the community</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-points">
                  {totalPoints.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Earned by all members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                <Trophy className="h-4 w-4 text-chart-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate" data-testid="text-top-performer">
                  {topMember 
                    ? `${topMember.firstName || ""} ${topMember.lastName || ""}`.trim() || "Anonymous"
                    : "N/A"
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {topMember?.profile?.points || 0} points
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Members</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-members">
                  {members?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active participants
                </p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <LeaderboardTableSkeleton />
          ) : (
            <LeaderboardTable members={members || []} />
          )}
        </div>
      </div>
    </div>
  );
}
