import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Users, 
  Monitor, 
  CreditCard, 
  FileText, 
  Activity, 
  Shield,
  BarChart3,
  Package,
  Tag,
  LayoutDashboard
} from "lucide-react";

const quickAccessItems = [
  { title: "لوحة التحكم", icon: LayoutDashboard, href: "/admin", color: "text-slate-500" },
  { title: "إدارة المستخدمين", icon: Users, href: "/admin/users", color: "text-blue-500" },
  { title: "الاشتراكات", icon: CreditCard, href: "/admin/subscriptions", color: "text-purple-500" },
  { title: "الفواتير", icon: FileText, href: "/admin/invoices", color: "text-teal-500" },
  { title: "جميع الشاشات", icon: Monitor, href: "/admin/screens", color: "text-green-500" },
  { title: "سجل النشاطات", icon: Activity, href: "/admin/activity", color: "text-orange-500" },
  { title: "إدارة المدراء", icon: Shield, href: "/admin/admins", color: "text-red-500" },
  { title: "خطط الاشتراك", icon: Package, href: "/admin/plans", color: "text-indigo-500" },
  { title: "أكواد الخصم", icon: Tag, href: "/admin/discount-codes", color: "text-pink-500" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-full">
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      
      <div className="w-72 p-4 flex-shrink-0">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              الوصول السريع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {quickAccessItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3"
                  data-testid={`link-admin-${item.href.split('/').pop() || 'dashboard'}`}
                >
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span>{item.title}</span>
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
