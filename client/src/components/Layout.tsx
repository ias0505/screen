import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { 
  LayoutDashboard, 
  Monitor, 
  Image as ImageIcon, 
  CalendarClock, 
  LogOut,
  UserCircle,
  CreditCard,
  Layers,
  Shield,
  Users,
  Settings
} from "lucide-react";
import logoImage from "@assets/Meror_logo_v.1_1767180225600.png";
import { cn } from "@/lib/utils";
import Onboarding from "./Onboarding";
import { WorkContextSwitcher } from "./WorkContextSwitcher";
import { usePermissions } from "@/hooks/use-permissions";
import type { User } from "@shared/schema";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { visibleMenus, permission } = usePermissions();
  const { t, dir, language } = useLanguage();
  
  const { data: profile, isLoading: profileLoading } = useQuery<User>({
    queryKey: ['/api/user/profile'],
    enabled: !!user,
  });
  
  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ['/api/admin/check'],
    enabled: !!user,
  });

  const allNavItems = [
    { href: "/", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/screens", label: t.nav.screens, icon: Monitor },
    { href: "/groups", label: t.nav.groups, icon: Layers },
    { href: "/media", label: t.nav.media, icon: ImageIcon },
    { href: "/schedule", label: t.nav.schedule, icon: CalendarClock },
    { href: "/subscriptions", label: t.nav.subscriptions, icon: CreditCard },
    { href: "/team", label: t.nav.team, icon: Users },
    { href: "/settings", label: t.nav.settings, icon: Settings },
    ...(adminCheck?.isAdmin ? [{ href: "/admin", label: t.nav.admin, icon: Shield }] : []),
  ];

  const navItems = allNavItems.filter(item => visibleMenus.includes(item.href));

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={dir}>
        <div className="text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  if (profile && !profile.companyName) {
    return <Onboarding />;
  }

  return (
    <div className={cn(
      "min-h-screen bg-background flex flex-col md:flex-row font-sans",
      language === 'en' && "md:flex-row-reverse"
    )} dir={dir}>
      {/* Sidebar */}
      <aside className={cn(
        "w-full md:w-64 bg-card shadow-xl z-20 flex-shrink-0",
        language === 'ar' ? "border-l border-border/50" : "border-r border-border/50"
      )}>
        <div className="p-6 border-b border-border/50">
          <div className="flex flex-col items-center text-center mb-3">
            <img src={logoImage} alt="Meror" className="h-12 w-auto mb-3" />
            <h1 className="font-bold text-lg text-foreground tracking-tight truncate max-w-full" data-testid="text-company-name">
              {profile?.companyName || 'Meror'}
            </h1>
            <p className="text-xs text-muted-foreground">{t.nav.controlPanel}</p>
          </div>
          <WorkContextSwitcher />
        </div>

        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item: any) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <item.icon className={cn("w-5 h-5", isActive ? "animate-pulse" : "")} />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex justify-center mb-4">
            <LanguageSwitcher />
          </div>
          <div className="bg-muted/50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <UserCircle className="w-8 h-8 text-primary/80" />
              <div className="overflow-hidden">
                <p className="font-semibold text-sm truncate">{user?.firstName || t.auth.user}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.auth.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background relative">
        <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-800 pointer-events-none -z-10" />
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
