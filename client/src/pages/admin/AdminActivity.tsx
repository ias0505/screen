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
import { useLanguage } from "@/hooks/use-language";
import { Activity, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

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

export default function AdminActivity() {
  const { language } = useLanguage();
  
  const actionLabels: Record<string, string> = {
    'screen_added_to_user': language === 'ar' ? 'إضافة شاشة لمستخدم' : 'Screen added to user',
    'subscription_created': language === 'ar' ? 'إنشاء اشتراك' : 'Subscription created',
    'invoice_updated': language === 'ar' ? 'تحديث فاتورة' : 'Invoice updated',
    'admin_created': language === 'ar' ? 'إضافة مدير' : 'Admin added',
    'admin_removed': language === 'ar' ? 'إزالة مدير' : 'Admin removed',
  };

  const targetTypeLabels: Record<string, string> = {
    'screen': language === 'ar' ? 'شاشة' : 'Screen',
    'subscription': language === 'ar' ? 'اشتراك' : 'Subscription',
    'invoice': language === 'ar' ? 'فاتورة' : 'Invoice',
    'admin': language === 'ar' ? 'مدير' : 'Admin',
    'user': language === 'ar' ? 'مستخدم' : 'User',
  };

  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/admin/activity-logs'],
  });

  const dateLocale = language === 'ar' ? ar : enUS;

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
          {language === 'ar' ? "سجل النشاطات" : "Activity Log"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? `آخر النشاطات (${logs?.length || 0})` : `Recent Activities (${logs?.length || 0})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === 'ar' ? "لا توجد نشاطات مسجلة" : "No recorded activities"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? "الإجراء" : "Action"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "النوع" : "Type"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "المعرف" : "ID"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "التفاصيل" : "Details"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "التاريخ والوقت" : "Date & Time"}</TableHead>
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
                            {parsedDetails.userId && `${language === 'ar' ? 'مستخدم' : 'User'}: ${parsedDetails.userId.substring(0, 8)}...`}
                            {parsedDetails.amount && ` | ${language === 'ar' ? 'المبلغ' : 'Amount'}: ${parsedDetails.amount} ${language === 'ar' ? 'ريال' : 'SAR'}`}
                            {parsedDetails.screenCount && ` | ${parsedDetails.screenCount} ${language === 'ar' ? 'شاشة' : 'screens'}`}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.createdAt), 'dd MMM yyyy - HH:mm', { locale: dateLocale })}
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
