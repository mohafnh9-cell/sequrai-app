"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  FolderGit2,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Sparkles,
  Clock,
  Puzzle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

// ─── Navigation config ────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/integrations", label: "Integrations", icon: Puzzle },
  { href: "/ai-fixes", label: "Fixes", icon: Sparkles },
  { href: "/timeline", label: "Timeline", icon: Clock },
] as const;

const SETTINGS_NAV = [
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
};

interface DashboardSidebarProps {
  user: User;
  orgName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardSidebar({ user, orgName }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      {/* Logo + Org Switcher */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-1 items-center justify-between min-w-0">
          <span className="truncate text-sm font-semibold">{orgName ?? "SequrAI"}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      </div>

      {/* Quick action */}
      <div className="px-3 py-3">
        <Button className="w-full h-8 text-xs justify-start gap-2" size="sm" asChild>
          <Link href="/projects/new">
            <Plus className="h-3.5 w-3.5" />
            New project
          </Link>
        </Button>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5">
        <div className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
            />
          ))}
        </div>

        <div>
          <p className="mb-1.5 px-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
            Account
          </p>
          <div className="space-y-0.5">
            {SETTINGS_NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* User menu */}
      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-secondary/50 transition-colors">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                {initials}
              </div>
              <div className="flex flex-1 flex-col items-start min-w-0">
                <span className="truncate text-xs font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="text-sm">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing" className="text-sm">Billing</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-sm text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

// ─── NavLink helper ───────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  comingSoon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  comingSoon?: boolean;
}) {
  return (
    <Link
      href={comingSoon ? "#" : href}
      className={cn(
        "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-secondary text-foreground font-medium"
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
        comingSoon && "cursor-default opacity-60"
      )}
      onClick={(e) => comingSoon && e.preventDefault()}
    >
      <span className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
      {comingSoon && (
        <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-sm">
          Soon
        </span>
      )}
    </Link>
  );
}
