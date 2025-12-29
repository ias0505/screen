import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Users, 
  Monitor, 
  CreditCard, 
  FileText, 
  Activity, 
  TrendingUp,
  Shield
} from "lucide-react";

interface SystemStats {
  totalUsers: number;
  totalScreens: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalRevenue: number;
  paidInvoices: number;
  pendingInvoices: number;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ['/api/admin/stats'],
  });

  const statCards = [
    {
      title: "المستخدمون",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-500",
      link: "/admin/users"
    },
    {
      title: "الشاشات",
      value: stats?.totalScreens || 0,
      icon: Monitor,
      color: "text-green-500",
      link: "/admin/screens"
    },
    {
      title: "الاشتراكات النشطة",
      value: stats?.activeSubscriptions || 0,
      icon: CreditCard,
      color: "text-purple-500",
      link: "/admin/subscriptions"
    },
    {
      title: "إجمالي الإيرادات",
      value: `${stats?.totalRevenue || 0} ريال`,
      icon: TrendingUp,
      color: "text-emerald-500",
      link: "/admin/invoices"
    },
    {
      title: "الفواتير المدفوعة",
      value: stats?.paidInvoices || 0,
      icon: FileText,
      color: "text-teal-500",
      link: "/admin/invoices"
    },
    {
      title: "الفواتير المعلقة",
      value: stats?.pendingInvoices || 0,
      icon: FileText,
      color: "text-orange-500",
      link: "/admin/invoices"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            لوحة تحكم المدير
          </h1>
          <p className="text-muted-foreground mt-1">نظرة عامة على النظام والإحصائيات</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Super Admin
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <Link key={index} href={stat.link}>
            <Card className="hover-elevate cursor-pointer transition-all">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold" data-testid={`stat-${stat.title}`}>
                    {stat.value}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            ملخص سريع
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">إجمالي الاشتراكات</span>
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="font-semibold">{stats?.totalSubscriptions || 0}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الاشتراكات النشطة</span>
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="font-semibold text-green-600">{stats?.activeSubscriptions || 0}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الفواتير المعلقة</span>
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="font-semibold text-orange-600">{stats?.pendingInvoices || 0}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">إجمالي الإيرادات</span>
            {isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <span className="font-semibold text-emerald-600">{stats?.totalRevenue || 0} ريال</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
