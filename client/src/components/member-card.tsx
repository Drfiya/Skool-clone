import { Link } from "wouter";
import { Trophy, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MemberWithProfile } from "@shared/schema";

interface MemberCardProps {
  member: MemberWithProfile;
}

export function MemberCard({ member }: MemberCardProps) {
  const getInitials = () => {
    const first = member.firstName?.[0] || "";
    const last = member.lastName?.[0] || "";
    return (first + last).toUpperCase() || member.email?.[0]?.toUpperCase() || "?";
  };

  const getDisplayName = () => {
    if (member.firstName || member.lastName) {
      return `${member.firstName || ""} ${member.lastName || ""}`.trim();
    }
    return member.email || "Member";
  };

  const getRoleBadgeVariant = () => {
    if (!member.profile?.role) return null;
    switch (member.profile.role) {
      case "admin":
        return "default";
      case "moderator":
        return "secondary";
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-visible" data-testid={`card-member-${member.id}`}>
      <CardContent className="pt-6 text-center">
        <Link href={`/members/${member.id}`}>
          <Avatar className="h-16 w-16 mx-auto mb-3 hover:ring-2 hover:ring-primary/50 transition-all">
            <AvatarImage src={member.profileImageUrl || undefined} alt={getDisplayName()} />
            <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="mb-2">
          <Link href={`/members/${member.id}`}>
            <h3 className="font-medium text-sm hover:text-primary transition-colors" data-testid={`text-member-name-${member.id}`}>
              {getDisplayName()}
            </h3>
          </Link>
          {getRoleBadgeVariant() && (
            <Badge variant={getRoleBadgeVariant() as any} className="mt-1">
              {member.profile?.role}
            </Badge>
          )}
        </div>
        {member.profile?.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {member.profile.bio}
          </p>
        )}
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-3">
          <Trophy className="h-3.5 w-3.5 text-chart-4" />
          <span className="font-medium" data-testid={`text-member-points-${member.id}`}>
            {member.profile?.points || 0} points
          </span>
        </div>
        <Button variant="outline" size="sm" className="w-full" data-testid={`button-message-${member.id}`}>
          <Mail className="h-3.5 w-3.5 mr-1.5" />
          Message
        </Button>
      </CardContent>
    </Card>
  );
}

export function MemberCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-24 mx-auto mb-2 bg-muted animate-pulse rounded" />
        <div className="h-3 w-32 mx-auto mb-3 bg-muted animate-pulse rounded" />
        <div className="h-3 w-16 mx-auto mb-3 bg-muted animate-pulse rounded" />
        <div className="h-8 w-full bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}
