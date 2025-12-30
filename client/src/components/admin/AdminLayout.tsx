import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { 
  Users, 
  Monitor, 
  CreditCard, 
  FileText, 
  Activity, 
  Shield,
  Package,
  Tag,
  LayoutDashboard,
  LogOut,
  Home
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const adminNavItems = [
  { title: "لوحة التحكم", icon: LayoutDashboard, href: "/admin" },
  { title: "المستخدمين", icon: Users, href: "/admin/users" },
  { title: "الاشتراكات", icon: CreditCard, href: "/admin/subscriptions" },
  { title: "الفواتير", icon: FileText, href: "/admin/invoices" },
  { title: "الشاشات", icon: Monitor, href: "/admin/screens" },
  { title: "سجل النشاطات", icon: Activity, href: "/admin/activity" },
  { title: "المدراء", icon: Shield, href: "/admin/admins" },
  { title: "خطط الاشتراك", icon: Package, href: "/admin/plans" },
  { title: "أكواد الخصم", icon: Tag, href: "/admin/discount-codes" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location === "/admin";
    }
    return location.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 overflow-auto bg-muted/30">
        {children}
      </div>
      
      <div className="w-64 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">لوحة المدير</h2>
              <p className="text-xs text-muted-foreground">إدارة النظام</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {adminNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant={active ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 ${active ? "" : "text-muted-foreground"}`}
                  data-testid={`link-admin-${item.href.split('/').pop() || 'dashboard'}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t space-y-2">
          <Link href="/">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground"
              data-testid="link-back-to-app"
            >
              <Home className="w-4 h-4" />
              <span>العودة للتطبيق</span>
            </Button>
          </Link>
          
          {user && (
            <div className="px-3 py-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">مدير</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email || user.firstName}</p>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-destructive"
            onClick={() => logout()}
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل خروج</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
