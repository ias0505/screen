import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Monitor, ArrowRight, Wifi, WifiOff, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Screen {
  id: number;
  name: string;
  location: string | null;
  status: string;
  groupId: number | null;
  subscriptionId: number | null;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

export default function AdminScreens() {
  const { toast } = useToast();
  const { data: screens, isLoading } = useQuery<Screen[]>({
    queryKey: ['/api/admin/screens'],
  });

  const deleteScreenMutation = useMutation({
    mutationFn: async (screenId: number) => {
      await apiRequest("DELETE", `/api/admin/screens/${screenId}`);
    },
    onSuccess: () => {
      toast({ title: "تم حذف الشاشة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/screens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  });

  const handleDelete = (screen: Screen) => {
    const userName = screen.user.firstName || screen.user.lastName 
      ? `${screen.user.firstName || ''} ${screen.user.lastName || ''}`.trim()
      : screen.user.email || 'بدون اسم';
    
    if (window.confirm(`هل أنت متأكد من حذف شاشة "${screen.name}" للمستخدم "${userName}"؟`)) {
      deleteScreenMutation.mutate(screen.id);
    }
  };

  const onlineCount = screens?.filter(s => s.status === 'online').length || 0;
  const offlineCount = screens?.filter(s => s.status === 'offline').length || 0;
  const withSubscription = screens?.filter(s => s.subscriptionId).length || 0;
  const withoutSubscription = screens?.filter(s => !s.subscriptionId).length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Monitor className="w-6 h-6" />
          جميع الشاشات
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي الشاشات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{screens?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">متصلة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">غير متصلة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-500">{offlineCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">بدون اشتراك</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{withoutSubscription}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : screens?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد شاشات
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الموقع</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الاشتراك</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screens?.map(screen => (
                  <TableRow key={screen.id} data-testid={`row-screen-${screen.id}`}>
                    <TableCell>#{screen.id}</TableCell>
                    <TableCell className="font-medium">{screen.name}</TableCell>
                    <TableCell>{screen.location || '-'}</TableCell>
                    <TableCell>
                      {screen.user.firstName || screen.user.lastName 
                        ? `${screen.user.firstName || ''} ${screen.user.lastName || ''}`.trim()
                        : screen.user.email || 'بدون اسم'}
                    </TableCell>
                    <TableCell>
                      {screen.subscriptionId ? (
                        <Badge variant="outline">#{screen.subscriptionId}</Badge>
                      ) : (
                        <Badge variant="secondary">بدون اشتراك</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {screen.status === 'online' ? (
                        <Badge className="bg-green-500">
                          <Wifi className="w-3 h-3 ml-1" />
                          متصل
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <WifiOff className="w-3 h-3 ml-1" />
                          غير متصل
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(screen.createdAt), 'dd MMM yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(screen)}
                        disabled={deleteScreenMutation.isPending}
                        className="text-destructive"
                        data-testid={`button-delete-screen-${screen.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
