import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  Waves,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/hooks/use-studio-data";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/clients", label: "Clients & Retention", icon: Users },
  { to: "/analytics", label: "Class & Revenue", icon: BarChart3 },
  { to: "/communications", label: "Communications", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: studio } = useStudio();

  const STUDIO = studio ?? {
    name: "Tether",
    city: "Encinitas, CA",
    owner: "Maya Calderón",
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <Waves className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold text-sidebar-foreground">Tether</div>
            <div className="text-[11px] text-muted-foreground">Boutique fitness OS</div>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-3 right-3 space-y-2">
          <div className="rounded-xl border border-sidebar-border bg-card p-3">
            <div className="text-xs text-muted-foreground">Owner</div>
            <div className="text-sm font-medium">{STUDIO.owner}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{STUDIO.city}</div>
            {user?.email && (
              <div className="text-xs text-muted-foreground mt-2 truncate" title={user.email}>
                {user.email}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4 lg:px-8">
          <button
            className="lg:hidden p-2 -ml-2 text-foreground"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div>
            <div className="font-display font-semibold text-base sm:text-lg">{STUDIO.name}</div>
            <div className="text-xs text-muted-foreground">{today}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground w-72">
              <Search className="h-4 w-4" />
              <span>Search clients, classes…</span>
            </div>
            <button className="relative h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent-foreground" />
            </button>
          </div>
        </header>
        <main className="p-4 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
