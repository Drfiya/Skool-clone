import { Link } from "wouter";
import { Trophy, Medal, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MemberWithProfile } from "@shared/schema";

interface LeaderboardTableProps {
  members: MemberWithProfile[];
  title?: string;
  showRank?: boolean;
}

export function LeaderboardTable({ members, title = "Leaderboard", showRank = true }: LeaderboardTableProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-chart-4" />;
      case 2:
        return <Medal className="h-5 w-5 text-muted-foreground" />;
      case 3:
        return <Award className="h-5 w-5 text-chart-5" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
    }
  };

  const getInitials = (member: MemberWithProfile) => {
    const first = member.firstName?.[0] || "";
    const last = member.lastName?.[0] || "";
    return (first + last).toUpperCase() || member.email?.[0]?.toUpperCase() || "?";
  };

  const getDisplayName = (member: MemberWithProfile) => {
    if (member.firstName || member.lastName) {
      return `${member.firstName || ""} ${member.lastName || ""}`.trim();
    }
    return member.email || "Member";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-chart-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {showRank && <TableHead className="w-12">Rank</TableHead>}
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, index) => (
              <TableRow key={member.id} data-testid={`row-leaderboard-${member.id}`}>
                {showRank && (
                  <TableCell className="py-3">
                    <div className="flex items-center justify-center">
                      {getRankIcon(index + 1)}
                    </div>
                  </TableCell>
                )}
                <TableCell className="py-3">
                  <Link href={`/members/${member.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.profileImageUrl || undefined} alt={getDisplayName(member)} />
                      <AvatarFallback className="text-xs">{getInitials(member)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{getDisplayName(member)}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-right py-3">
                  <span className="font-semibold text-primary" data-testid={`text-leaderboard-points-${member.id}`}>
                    {member.profile?.points || 0}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={showRank ? 3 : 2} className="text-center py-8 text-muted-foreground">
                  No members yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function LeaderboardTableSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
              <div className="h-4 w-12 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
