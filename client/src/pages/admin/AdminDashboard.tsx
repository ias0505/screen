import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { SARIcon } from "@/components/ui/price";
import { 
  Users, 
  Monitor, 
  CreditCard, 
  FileText, 
  Activity, 
  TrendingUp,
  Shield,
  HardDrive
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

interface StorageInfo {
  total: number;
  used: number;
  available: number;
  usedPercent: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminDashboard() {
  const { language } = useLanguage();
  
  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ['/api/admin/stats'],
  });

  const { data: storageInfo, isLoading: storageLoading } = useQuery<StorageInfo>({
    queryKey: ['/api/admin/storage'],
  });

  const statCards = [
    {
      title: language === 'ar' ? "المستخدمون" : "Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-500",
      link: "/admin/users"
    },
    {
      title: language === 'ar' ? "الشاشات" : "Screens",
      value: stats?.totalScreens || 0,
      icon: Monitor,
      color: "text-green-500",
      link: "/admin/screens"
    },
    {
      title: language === 'ar' ? "الاشتراكات النشطة" : "Active Subscriptions",
      value: stats?.activeSubscriptions || 0,
      icon: CreditCard,
      color: "text-purple-500",
      link: "/admin/subscriptions"
    },
    {
      title: language === 'ar' ? "إجمالي الإيرادات" : "Total Revenue",
      value: <span className="inline-flex items-center gap-1">{stats?.totalRevenue || 0} <SARIcon size={16} /></span>,
      icon: TrendingUp,
      color: "text-emerald-500",
      link: "/admin/invoices"
    },
    {
      title: language === 'ar' ? "الفواتير المدفوعة" : "Paid Invoices",
      value: stats?.paidInvoices || 0,
      icon: FileText,
      color: "text-teal-500",
      link: "/admin/invoices"
    },
    {
      title: language === 'ar' ? "الفواتير المعلقة" : "Pending Invoices",
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
            {language === 'ar' ? "لوحة تحكم المدير" : "Admin Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? "نظرة عامة على النظام والإحصائيات" : "System overview and statistics"}
          </p>
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
            {language === 'ar' ? "ملخص سريع" : "Quick Summary"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {language === 'ar' ? "إجمالي الاشتراكات" : "Total Subscriptions"}
            </span>
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="font-semibold">{stats?.totalSubscriptions || 0}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {language === 'ar' ? "الاشتراكات النشطة" : "Active Subscriptions"}
            </span>
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="font-semibold text-green-600">{stats?.activeSubscriptions || 0}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {language === 'ar' ? "الفواتير المعلقة" : "Pending Invoices"}
            </span>
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="font-semibold text-orange-600">{stats?.pendingInvoices || 0}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {language === 'ar' ? "إجمالي الإيرادات" : "Total Revenue"}
            </span>
            {isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <span className="font-semibold text-emerald-600 inline-flex items-center gap-1">
                {stats?.totalRevenue || 0} <SARIcon size={14} />
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            {language === 'ar' ? "مساحة التخزين" : "Storage Space"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {storageLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : storageInfo ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? "المستخدم" : "Used"}
                  </span>
                  <span className="font-semibold">{formatBytes(storageInfo.used)}</span>
                </div>
                <Progress 
                  value={storageInfo.usedPercent} 
                  className={`h-3 ${storageInfo.usedPercent > 80 ? '[&>div]:bg-red-500' : storageInfo.usedPercent > 60 ? '[&>div]:bg-yellow-500' : ''}`}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {language === 'ar' ? `${storageInfo.usedPercent}% مستخدم` : `${storageInfo.usedPercent}% used`}
                  </span>
                  <span>
                    {language === 'ar' ? `المتاح: ${formatBytes(storageInfo.available)}` : `Available: ${formatBytes(storageInfo.available)}`}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                <div className="text-center">
                  <p className="text-lg font-bold">{formatBytes(storageInfo.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? "الإجمالي" : "Total"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{formatBytes(storageInfo.used)}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? "المستخدم" : "Used"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{formatBytes(storageInfo.available)}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? "المتاح" : "Available"}
                  </p>
                </div>
              </div>
              {storageInfo.usedPercent > 80 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                  {language === 'ar' 
                    ? "تحذير: المساحة المتبقية منخفضة. يرجى تفريغ بعض الملفات لتجنب مشاكل في النظام."
                    : "Warning: Storage space is running low. Please free up some files to avoid system issues."}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              {language === 'ar' ? "لا توجد بيانات متاحة" : "No data available"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
