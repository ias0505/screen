import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  Home,
  MessageSquare,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

interface ContactMessage {
  id: number;
  isRead: boolean;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const { data: messages } = useQuery<ContactMessage[]>({
    queryKey: ['/api/admin/contact-messages'],
    refetchInterval: 30000,
  });

  const unreadCount = messages?.filter(m => !m.isRead).length || 0;

  const adminNavItems = [
    { title: language === 'ar' ? "لوحة التحكم" : "Dashboard", icon: LayoutDashboard, href: "/admin" },
    { title: language === 'ar' ? "المستخدمين" : "Users", icon: Users, href: "/admin/users" },
    { title: language === 'ar' ? "الاشتراكات" : "Subscriptions", icon: CreditCard, href: "/admin/subscriptions" },
    { title: language === 'ar' ? "الفواتير" : "Invoices", icon: FileText, href: "/admin/invoices" },
    { title: language === 'ar' ? "الشاشات" : "Screens", icon: Monitor, href: "/admin/screens" },
    { title: language === 'ar' ? "سجل النشاط" : "Activity Log", icon: Activity, href: "/admin/activity" },
    { title: language === 'ar' ? "المديرين" : "Admins", icon: Shield, href: "/admin/admins" },
    { title: language === 'ar' ? "الخطط" : "Plans", icon: Package, href: "/admin/plans" },
    { title: language === 'ar' ? "أكواد الخصم" : "Discount Codes", icon: Tag, href: "/admin/discount-codes" },
    { title: language === 'ar' ? "رسائل التواصل" : "Messages", icon: MessageSquare, href: "/admin/messages", badge: unreadCount },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location === "/admin";
    }
    return location.startsWith(href);
  };

  const sidebarContent = (
    <>
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-sm">{language === 'ar' ? "لوحة الإدارة" : "Admin Dashboard"}</h2>
            <p className="text-xs text-muted-foreground">{language === 'ar' ? "إدارة النظام" : "System Management"}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
                <span className="flex-1 text-start">{item.title}</span>
                {item.badge && item.badge > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-[1.25rem] text-center">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-2">
        <Link href="/dashboard">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground"
            data-testid="link-back-to-app"
          >
            <Home className="w-4 h-4" />
            <span>{language === 'ar' ? "العودة للمنصة" : "Back to Platform"}</span>
          </Button>
        </Link>
        
        {user && (
          <div className="px-3 py-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{language === 'ar' ? "مدير" : "Admin"}</p>
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
          <span>{language === 'ar' ? "تسجيل خروج" : "Logout"}</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, visible on desktop */}
      <div className={`
        fixed lg:static inset-y-0 right-0 z-50 w-64 border-l bg-background flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Close button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="button-close-sidebar"
        >
          <X className="w-5 h-5" />
        </Button>
        {sidebarContent}
      </div>
      
      <div className="flex-1 overflow-auto bg-muted/30 flex flex-col">
        {/* Mobile header with menu button */}
        <div className="sticky top-0 z-30 bg-background border-b p-3 flex items-center gap-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-open-sidebar"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">{language === 'ar' ? "لوحة الإدارة" : "Admin"}</span>
          </div>
        </div>
        
        {children}
      </div>
    </div>
  );
}
