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
import { Activity, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface ActivityLog {
  id: number;
  adminId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const actionLabels: Record<string, string> = {
  'screen_added_to_user': 'إضافة شاشة لمستخدم',
  'subscription_created': 'إنشاء اشتراك',
  'invoice_updated': 'تحديث فاتورة',
  'admin_created': 'إضافة مدير',
  'admin_removed': 'إزالة مدير',
};

const targetTypeLabels: Record<string, string> = {
  'screen': 'شاشة',
  'subscription': 'اشتراك',
  'invoice': 'فاتورة',
  'admin': 'مدير',
  'user': 'مستخدم',
};

export default function AdminActivity() {
  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/admin/activity-logs'],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6" />
          سجل النشاطات
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>آخر النشاطات ({logs?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد نشاطات مسجلة
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">المعرف</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                  <TableHead className="text-right">التاريخ والوقت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map(log => {
                  let parsedDetails = null;
                  try {
                    if (log.details) {
                      parsedDetails = JSON.parse(log.details);
                    }
                  } catch {}

                  return (
                    <TableRow key={log.id} data-testid={`row-activity-${log.id}`}>
                      <TableCell>
                        <Badge variant="outline">
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.targetType ? (
                          <Badge variant="secondary">
                            {targetTypeLabels[log.targetType] || log.targetType}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.targetId ? `#${log.targetId.substring(0, 8)}...` : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {parsedDetails ? (
                          <span>
                            {parsedDetails.userId && `مستخدم: ${parsedDetails.userId.substring(0, 8)}...`}
                            {parsedDetails.amount && ` | المبلغ: ${parsedDetails.amount} ريال`}
                            {parsedDetails.screenCount && ` | ${parsedDetails.screenCount} شاشة`}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.createdAt), 'dd MMM yyyy - HH:mm', { locale: ar })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
