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
import { useLanguage } from "@/hooks/use-language";
import { Shield, ArrowRight, Plus, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

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
  const { language } = useLanguage();
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
      toast({ title: language === 'ar' ? "تمت إضافة المدير بنجاح" : "Admin added successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admins'] });
      setShowAddAdmin(false);
      setSelectedUserId("");
    },
    onError: (error: any) => {
      toast({ title: error.message || (language === 'ar' ? "حدث خطأ" : "An error occurred"), variant: "destructive" });
    }
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/admin/admins/${userId}`);
    },
    onSuccess: () => {
      toast({ title: language === 'ar' ? "تمت إزالة المدير بنجاح" : "Admin removed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admins'] });
    },
    onError: (error: any) => {
      toast({ title: error.message || (language === 'ar' ? "حدث خطأ" : "An error occurred"), variant: "destructive" });
    }
  });

  const nonAdminUsers = users?.filter(u => !admins?.some(a => a.userId === u.id));

  const dateLocale = language === 'ar' ? ar : enUS;
  const noName = language === 'ar' ? 'بدون اسم' : 'No name';

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
            {language === 'ar' ? "إدارة المدراء" : "Admin Management"}
          </h1>
        </div>

        <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-admin">
              <UserPlus className="w-4 h-4" />
              {language === 'ar' ? "إضافة مدير" : "Add Admin"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? "إضافة مدير جديد" : "Add New Admin"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">
                  {language === 'ar' ? "اختر المستخدم" : "Select User"}
                </label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-user-for-admin">
                    <SelectValue placeholder={language === 'ar' ? "اختر مستخدماً" : "Select a user"} />
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
                <label className="text-sm font-medium">
                  {language === 'ar' ? "الدور" : "Role"}
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-admin-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">{language === 'ar' ? "مدير عام" : "Super Admin"}</SelectItem>
                    <SelectItem value="admin">{language === 'ar' ? "مدير" : "Admin"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => addAdminMutation.mutate()}
                disabled={!selectedUserId || addAdminMutation.isPending}
                className="w-full"
                data-testid="button-confirm-add-admin"
              >
                {addAdminMutation.isPending 
                  ? (language === 'ar' ? "جاري الإضافة..." : "Adding...")
                  : (language === 'ar' ? "إضافة كمدير" : "Add as Admin")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? `قائمة المدراء (${admins?.length || 0})` : `Admin List (${admins?.length || 0})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : admins?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === 'ar' ? "لا يوجد مدراء" : "No admins"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? "المدير" : "Admin"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "البريد الإلكتروني" : "Email"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الدور" : "Role"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "تاريخ الإضافة" : "Added Date"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins?.map(admin => (
                  <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                    <TableCell>
                      {admin.user.firstName || admin.user.lastName 
                        ? `${admin.user.firstName || ''} ${admin.user.lastName || ''}`.trim()
                        : noName}
                    </TableCell>
                    <TableCell>{admin.user.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                        {admin.role === 'super_admin' 
                          ? (language === 'ar' ? 'مدير عام' : 'Super Admin')
                          : (language === 'ar' ? 'مدير' : 'Admin')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(admin.createdAt), 'dd MMM yyyy', { locale: dateLocale })}
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
