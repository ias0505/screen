import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Shield, ArrowRight, Plus, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Admin {
  id: number;
  userId: string;
  role: string;
  permissions: string[] | null;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export default function AdminAdmins() {
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("admin");
  const { toast } = useToast();

  const { data: admins, isLoading } = useQuery<Admin[]>({
    queryKey: ['/api/admin/admins'],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const addAdminMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/admins", {
        userId: selectedUserId,
        role: selectedRole
      });
    },
    onSuccess: () => {
      toast({ title: "تمت إضافة المدير بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admins'] });
      setShowAddAdmin(false);
      setSelectedUserId("");
    },
    onError: (error: any) => {
      toast({ title: error.message || "حدث خطأ", variant: "destructive" });
    }
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/admin/admins/${userId}`);
    },
    onSuccess: () => {
      toast({ title: "تمت إزالة المدير بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admins'] });
    },
    onError: (error: any) => {
      toast({ title: error.message || "حدث خطأ", variant: "destructive" });
    }
  });

  const nonAdminUsers = users?.filter(u => !admins?.some(a => a.userId === u.id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            إدارة المدراء
          </h1>
        </div>

        <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-admin">
              <UserPlus className="w-4 h-4" />
              إضافة مدير
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مدير جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">اختر المستخدم</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-user-for-admin">
                    <SelectValue placeholder="اختر مستخدماً" />
                  </SelectTrigger>
                  <SelectContent>
                    {nonAdminUsers?.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName || user.lastName 
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : user.email || user.id.substring(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">الدور</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-admin-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">مدير عام</SelectItem>
                    <SelectItem value="admin">مدير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => addAdminMutation.mutate()}
                disabled={!selectedUserId || addAdminMutation.isPending}
                className="w-full"
                data-testid="button-confirm-add-admin"
              >
                {addAdminMutation.isPending ? "جاري الإضافة..." : "إضافة كمدير"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المدراء ({admins?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : admins?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا يوجد مدراء
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المدير</TableHead>
                  <TableHead className="text-right">البريد الإلكتروني</TableHead>
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-right">تاريخ الإضافة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins?.map(admin => (
                  <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                    <TableCell>
                      {admin.user.firstName || admin.user.lastName 
                        ? `${admin.user.firstName || ''} ${admin.user.lastName || ''}`.trim()
                        : 'بدون اسم'}
                    </TableCell>
                    <TableCell>{admin.user.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                        {admin.role === 'super_admin' ? 'مدير عام' : 'مدير'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(admin.createdAt), 'dd MMM yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeAdminMutation.mutate(admin.userId)}
                        disabled={removeAdminMutation.isPending}
                        data-testid={`button-remove-admin-${admin.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
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
