import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import { CreditCard, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Subscription {
  id: number;
  userId: string;
  screenCount: number;
  durationYears: number;
  startDate: string;
  endDate: string;
  status: string;
  pricePerScreen: number;
  totalPrice: number;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

export default function AdminSubscriptions() {
  const { data: subscriptions, isLoading } = useQuery<Subscription[]>({
    queryKey: ['/api/admin/subscriptions'],
  });

  const activeCount = subscriptions?.filter(s => s.status === 'active').length || 0;
  const expiredCount = subscriptions?.filter(s => s.status === 'expired').length || 0;
  const totalRevenue = subscriptions?.reduce((sum, s) => sum + (s.totalPrice || 0), 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          الاشتراكات
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي الاشتراكات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{subscriptions?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">الاشتراكات النشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">المنتهية</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي الإيرادات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{totalRevenue} ريال</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : subscriptions?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد اشتراكات
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">عدد الشاشات</TableHead>
                  <TableHead className="text-right">المدة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map(sub => (
                  <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                    <TableCell>#{sub.id}</TableCell>
                    <TableCell>
                      {sub.user.firstName || sub.user.lastName 
                        ? `${sub.user.firstName || ''} ${sub.user.lastName || ''}`.trim()
                        : sub.user.email || 'بدون اسم'}
                    </TableCell>
                    <TableCell>{sub.screenCount} شاشة</TableCell>
                    <TableCell>{sub.durationYears} سنة</TableCell>
                    <TableCell className="font-semibold">{sub.totalPrice || 0} ريال</TableCell>
                    <TableCell>
                      {format(new Date(sub.endDate), 'dd MMM yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {sub.status === 'active' ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 ml-1" />
                          منتهي
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
