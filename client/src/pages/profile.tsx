import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Trophy, BookOpen, MessageSquare, MapPin, Globe, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TopBar } from "@/components/top-bar";
import { PostCard, PostCardSkeleton } from "@/components/post-card";
import { useAuth } from "@/hooks/use-auth";
import type { MemberWithProfile, PostWithAuthor } from "@shared/schema";
import { format } from "date-fns";

export default function ProfilePage() {
  const [match, params] = useRoute("/members/:id");
  const { user } = useAuth();
  
  const memberId = match ? params?.id : user?.id;
  const isOwnProfile = !match || memberId === user?.id;

  const { data: member, isLoading: memberLoading } = useQuery<MemberWithProfile>({
    queryKey: ["/api/members", memberId],
    enabled: !!memberId,
  });

  const { data: posts, isLoading: postsLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/posts", { authorId: memberId }],
    enabled: !!memberId,
  });

  const getInitials = () => {
    const first = member?.firstName?.[0] || "";
    const last = member?.lastName?.[0] || "";
    return (first + last).toUpperCase() || member?.email?.[0]?.toUpperCase() || "?";
  };

  const getDisplayName = () => {
    if (member?.firstName || member?.lastName) {
      return `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
    }
    return member?.email || "Member";
  };

  if (memberLoading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <div className="container max-w-4xl py-6">
            <Card className="mb-6">
              <div className="h-32 bg-muted animate-pulse" />
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row gap-4 -mt-12">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="flex-1 pt-14 sm:pt-0 sm:mt-14">
                    <Skeleton className="h-7 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col h-full">
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Member not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      
      <div className="flex-1 overflow-auto">
        <div className="container max-w-4xl py-6">
          <Card className="mb-6 overflow-hidden">
            <div 
              className="h-32 bg-gradient-to-r from-primary/20 to-primary/5"
              style={member.profile?.coverImageUrl ? { 
                backgroundImage: `url(${member.profile.coverImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              } : undefined}
            />
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row gap-4 -mt-12">
                <Avatar className="h-24 w-24 border-4 border-background">
                  <AvatarImage src={member.profileImageUrl || undefined} alt={getDisplayName()} />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 pt-2 sm:pt-0 sm:mt-14">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold" data-testid="text-profile-name">{getDisplayName()}</h1>
                    {member.profile?.role && member.profile.role !== "member" && (
                      <Badge variant="secondary">{member.profile.role}</Badge>
                    )}
                  </div>
                  {member.profile?.bio && (
                    <p className="text-muted-foreground mb-3">{member.profile.bio}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {member.profile?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {member.profile.location}
                      </span>
                    )}
                    {member.profile?.website && (
                      <a 
                        href={member.profile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points</CardTitle>
                <Trophy className="h-4 w-4 text-chart-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-profile-points">
                  {member.profile?.points || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Posts</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-profile-posts">
                  {posts?.length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-profile-courses">
                  0
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="activity">
            <TabsList className="mb-4">
              <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
              <TabsTrigger value="about" data-testid="tab-about">About</TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="space-y-4">
              {postsLoading ? (
                <>
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                </>
              ) : posts && posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No posts yet
                </p>
              )}
            </TabsContent>
            <TabsContent value="about">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-1">Bio</h3>
                      <p className="text-muted-foreground">
                        {member.profile?.bio || "No bio provided"}
                      </p>
                    </div>
                    {member.profile?.location && (
                      <div>
                        <h3 className="font-medium mb-1">Location</h3>
                        <p className="text-muted-foreground">{member.profile.location}</p>
                      </div>
                    )}
                    {member.profile?.website && (
                      <div>
                        <h3 className="font-medium mb-1">Website</h3>
                        <a 
                          href={member.profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {member.profile.website}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
