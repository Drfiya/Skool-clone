import { Users, BookOpen, Calendar, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "Community Feed",
    description: "Connect with like-minded members through posts, discussions, and announcements.",
  },
  {
    icon: BookOpen,
    title: "Online Courses",
    description: "Access exclusive courses and track your learning progress step by step.",
  },
  {
    icon: Calendar,
    title: "Events & Calendar",
    description: "Stay updated with community events, webinars, and live sessions.",
  },
  {
    icon: Trophy,
    title: "Gamification",
    description: "Earn points, climb the leaderboard, and unlock achievements.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              S
            </div>
            <span className="text-lg font-bold">Skool Clone</span>
          </div>
          <a href="/api/login">
            <Button data-testid="button-login-header">
              Sign In
            </Button>
          </a>
        </div>
      </header>

      <main>
        <section className="container py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
            Build Your
            <span className="text-primary"> Learning Community</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-8">
            Create an engaging community platform with courses, discussions, events, and gamification. 
            Everything you need to grow and educate your audience.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="/api/login">
              <Button size="lg" className="gap-2" data-testid="button-get-started">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Button variant="outline" size="lg" data-testid="button-learn-more">
              Learn More
            </Button>
          </div>
        </section>

        <section className="container py-16">
          <h2 className="text-2xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container py-16">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Build Your Community?</h2>
              <p className="mb-6 opacity-90">
                Join thousands of creators building engaged learning communities.
              </p>
              <a href="/api/login">
                <Button variant="secondary" size="lg" data-testid="button-join-now">
                  Join Now - It's Free
                </Button>
              </a>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Built with Replit. Inspired by Skool.</p>
        </div>
      </footer>
    </div>
  );
}
