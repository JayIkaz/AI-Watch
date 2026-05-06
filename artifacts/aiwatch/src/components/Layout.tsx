import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "wouter";
import {
  Activity,
  Settings,
  Layers,
  Cpu,
  Search,
  RefreshCw,
  Newspaper,
  Heart,
  X,
  BookOpen,
  DollarSign,
  Code2,
  Bell,
  Menu,
} from "lucide-react";
import { useGetMe, getGetMeQueryKey, useGetIngestionStatus, getGetIngestionStatusQueryKey, useTriggerIngestion } from "@workspace/api-client-react";
import { NotificationBell } from "./NotificationPanel";
import { OfflineBanner } from "./OfflineBanner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: ReactNode;
}

const BOTTOM_TABS = [
  { href: "/",            label: "Feed",  icon: Activity },
  { href: "/news",        label: "News",  icon: Newspaper },
  { href: "/daily-brief", label: "Daily Brief", icon: BookOpen },
  { href: "/liked",       label: "Saved", icon: Heart },
  { href: "/alerts",      label: "Alerts",icon: Bell },
];

interface SidebarContentProps {
  onLinkClick?: () => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onSearchClear: () => void;
  location: string;
  navGroups: {
    label: string;
    items: { href: string; label: string; icon: React.FC<{ className?: string }> }[];
  }[];
  ingestionStatus: { isRunning: boolean } | undefined;
  onTriggerIngestion: () => void;
  isTriggerPending: boolean;
  user: { profileImageUrl?: string | null; username?: string | null; displayName?: string | null } | undefined;
}

function SidebarContent({
  onLinkClick,
  inputValue,
  onInputChange,
  onSearchSubmit,
  onSearchClear,
  location,
  navGroups,
  ingestionStatus,
  onTriggerIngestion,
  isTriggerPending,
  user,
}: SidebarContentProps) {
  return (
    <>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 shrink-0">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="Aukizan"
            className="w-6 h-6 object-contain"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-display font-bold text-xl tracking-tight text-glow text-foreground leading-tight">
            Aukizan
          </span>
          <span className="text-[10px] text-muted-foreground/70 leading-tight truncate">
            AI signal, ranked by credibility
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-4 shrink-0">
        <form onSubmit={onSearchSubmit}>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={inputValue}
              onChange={e => onInputChange(e.target.value)}
              placeholder="Search intelligence..."
              className="w-full bg-background/50 border border-border rounded-xl py-2 pl-9 pr-8 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
            />
            {inputValue && (
              <button
                type="button"
                onClick={onSearchClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-4">
        {navGroups.map(group => (
          <div key={group.label}>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-3 mt-3">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 border border-primary/20 rounded-xl bg-primary/5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                    <item.icon className={cn("w-4 h-4 z-10 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    <span className="z-10 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border mt-auto shrink-0">
        {ingestionStatus && (
          <div className="mb-4 p-3 rounded-xl bg-background/50 border border-border/50 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground font-medium">Pipeline Status</span>
              <button
                onClick={onTriggerIngestion}
                disabled={isTriggerPending || ingestionStatus.isRunning}
                className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                title="Trigger ingestion"
              >
                <RefreshCw className={cn("w-3 h-3", ingestionStatus.isRunning && "animate-spin text-primary")} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <div className={cn(
                "w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]",
                ingestionStatus.isRunning ? "bg-primary text-primary animate-pulse" : "bg-muted-foreground text-muted-foreground"
              )} />
              {ingestionStatus.isRunning ? "Ingesting updates..." : "Idle"}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background border border-border">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border shrink-0">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt={user.username || "User"} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">
                {(user?.displayName || user?.username || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{user?.displayName || user?.username}</div>
            <div className="text-xs text-muted-foreground truncate">Replit Account</div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(currentQ);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setInputValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (inputValue.trim()) {
        next.set("q", inputValue.trim());
      } else {
        next.delete("q");
      }
      return next;
    });
  };

  const handleSearchClear = () => {
    setInputValue("");
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("q");
      return next;
    });
  };

  const { data: user, isLoading: isLoadingUser } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false },
  });
  const { data: ingestionStatus } = useGetIngestionStatus({
    query: { queryKey: getGetIngestionStatusQueryKey(), refetchInterval: 10000 },
  });
  const triggerIngestion = useTriggerIngestion();

  const navGroups = [
    {
      label: "Intelligence",
      items: [
        { href: "/",            label: "Intelligence Feed", icon: Activity },
        { href: "/daily-brief", label: "Daily Brief",       icon: BookOpen },
        { href: "/news",        label: "News & Gossip",     icon: Newspaper },
      ],
    },
    {
      label: "By Signal Type",
      items: [
        { href: "/pricing",        label: "Pricing Watch",  icon: DollarSign },
        { href: "/model-releases", label: "Model Releases", icon: Cpu },
        { href: "/api-changes",    label: "API Changes",    icon: Code2 },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/vendors",    label: "Vendors",    icon: Cpu },
        { href: "/categories", label: "Categories", icon: Layers },
        { href: "/liked",      label: "Saved",      icon: Heart },
        { href: "/alerts",     label: "Alerts",     icon: Bell },
        { href: "/settings",   label: "Settings",   icon: Settings },
      ],
    },
  ];

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const sidebarProps = {
    inputValue,
    onInputChange: setInputValue,
    onSearchSubmit: handleSearchSubmit,
    onSearchClear: handleSearchClear,
    location,
    navGroups,
    ingestionStatus,
    onTriggerIngestion: () => triggerIngestion.mutate({ data: {} }),
    isTriggerPending: triggerIngestion.isPending,
    user,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground overflow-hidden">

      {/* ── Desktop sidebar (hidden on mobile) ─────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-border bg-card/30 backdrop-blur-md flex-col z-20 h-screen sticky top-0">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Mobile drawer overlay ───────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer panel */}
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col bg-card border-r border-border shadow-2xl md:hidden"
            >
              {/* Close button */}
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent
                {...sidebarProps}
                onLinkClick={() => setDrawerOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 relative overflow-y-auto h-screen bg-gradient-to-br from-background via-background to-secondary/20">

        {/* Top header bar */}
        <div className="sticky top-0 z-10 h-14 md:h-16 w-full bg-background/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 md:px-6">

          {/* Mobile: logo + name on the left */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <img
                src={`${import.meta.env.BASE_URL}images/logo.png`}
                alt="Aukizan"
                className="w-4 h-4 object-contain"
              />
            </div>
            <span className="font-display font-bold text-base tracking-tight text-foreground">Aukizan</span>
          </div>

          {/* Desktop: spacer so bell stays on right */}
          <div className="hidden md:block" />

          {/* Right side: notification bell + hamburger (mobile only) */}
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden h-10 w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Offline / API-unreachable banner */}
        <OfflineBanner />

        {/* Page content — pb-24 on mobile for bottom tab bar */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom tab bar ───────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-card/90 backdrop-blur-xl border-t border-border">
        <div className="flex items-stretch h-16">
          {BOTTOM_TABS.map(tab => {
            const isActive = location === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 px-1 transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <tab.icon className={cn("w-5 h-5 shrink-0", isActive && "drop-shadow-[0_0_6px_rgba(0,240,255,0.8)]")} />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
