import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { 
  Users, 
  ArrowRight,
  Search,
  Plus,
  Monitor,
  CreditCard,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddScreen, setShowAddScreen] = useState(false);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [screenName, setScreenName] = useState("");
  const [screenLocation, setScreenLocation] = useState("");
  const [screenCount, setScreenCount] = useState(1);
  const [durationYears, setDurationYears] = useState(1);
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: userDetails } = useQuery({
    queryKey: ['/api/admin/users', selectedUser?.id],
    enabled: !!selectedUser?.id,
  });

  const addScreenMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/admin/users/${selectedUser?.id}/screens`, {
        name: screenName,
        location: screenLocation
      });
    },
    onSuccess: () => {
      toast({ title: "تمت إضافة الشاشة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', selectedUser?.id] });
      setShowAddScreen(false);
      setScreenName("");
      setScreenLocation("");
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  });

  const addSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/admin/users/${selectedUser?.id}/subscriptions`, {
        screenCount,
        durationYears
      });
    },
    onSuccess: () => {
      toast({ title: "تم إضافة الاشتراك بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setShowAddSubscription(false);
      setScreenCount(1);
      setDurationYears(1);
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  });

  const filteredUsers = users?.filter(user => 
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" />
          إدارة المستخدمين
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن مستخدم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
            data-testid="input-search-users"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>قائمة المستخدمين ({filteredUsers?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">تاريخ التسجيل</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map(user => (
                      <TableRow 
                        key={user.id} 
                        className={`cursor-pointer ${selectedUser?.id === user.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedUser(user)}
                        data-testid={`row-user-${user.id}`}
                      >
                        <TableCell>
                          {user.firstName || user.lastName 
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : 'بدون اسم'}
                        </TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(user);
                            }}
                          >
                            <Eye className="w-4 h-4" />
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

        <div>
          {selectedUser ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تفاصيل المستخدم</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">الاسم</p>
                  <p className="font-medium">
                    {selectedUser.firstName || selectedUser.lastName 
                      ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                      : 'بدون اسم'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{selectedUser.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                  <p className="font-medium">
                    {format(new Date(selectedUser.createdAt), 'dd MMMM yyyy', { locale: ar })}
                  </p>
                </div>

                <div className="pt-4 space-y-2">
                  <p className="text-sm font-medium">الاشتراكات</p>
                  {(userDetails as any)?.subscriptions?.length > 0 ? (
                    <div className="space-y-1">
                      {(userDetails as any).subscriptions.map((sub: any) => (
                        <Badge key={sub.id} variant={sub.status === 'active' ? 'default' : 'secondary'}>
                          {sub.screenCount} شاشة - {sub.durationYears} سنة
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">لا توجد اشتراكات</p>
                  )}
                </div>

                <div className="pt-2 space-y-2">
                  <p className="text-sm font-medium">الشاشات</p>
                  {(userDetails as any)?.screens?.length > 0 ? (
                    <div className="space-y-1">
                      {(userDetails as any).screens.map((screen: any) => (
                        <Badge key={screen.id} variant="outline">
                          {screen.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">لا توجد شاشات</p>
                  )}
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <Dialog open={showAddScreen} onOpenChange={setShowAddScreen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2" data-testid="button-add-screen-to-user">
                        <Monitor className="w-4 h-4" />
                        إضافة شاشة (بدون اشتراك)
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إضافة شاشة للمستخدم</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-sm font-medium">اسم الشاشة</label>
                          <Input
                            value={screenName}
                            onChange={(e) => setScreenName(e.target.value)}
                            placeholder="شاشة المدخل"
                            data-testid="input-screen-name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">الموقع (اختياري)</label>
                          <Input
                            value={screenLocation}
                            onChange={(e) => setScreenLocation(e.target.value)}
                            placeholder="الطابق الأول"
                            data-testid="input-screen-location"
                          />
                        </div>
                        <Button 
                          onClick={() => addScreenMutation.mutate()}
                          disabled={!screenName || addScreenMutation.isPending}
                          className="w-full"
                          data-testid="button-confirm-add-screen"
                        >
                          {addScreenMutation.isPending ? "جاري الإضافة..." : "إضافة الشاشة"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showAddSubscription} onOpenChange={setShowAddSubscription}>
                    <DialogTrigger asChild>
                      <Button className="w-full gap-2" data-testid="button-add-subscription-to-user">
                        <CreditCard className="w-4 h-4" />
                        إضافة اشتراك
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إضافة اشتراك للمستخدم</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-sm font-medium">عدد الشاشات</label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={screenCount}
                            onChange={(e) => setScreenCount(Number(e.target.value))}
                            data-testid="input-screen-count"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">مدة الاشتراك (سنوات)</label>
                          <Input
                            type="number"
                            min={1}
                            max={3}
                            value={durationYears}
                            onChange={(e) => setDurationYears(Number(e.target.value))}
                            data-testid="input-duration-years"
                          />
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                          <p className="text-sm">المبلغ: <span className="font-bold">{screenCount * 50 * durationYears} ريال</span></p>
                        </div>
                        <Button 
                          onClick={() => addSubscriptionMutation.mutate()}
                          disabled={addSubscriptionMutation.isPending}
                          className="w-full"
                          data-testid="button-confirm-add-subscription"
                        >
                          {addSubscriptionMutation.isPending ? "جاري الإضافة..." : "إضافة الاشتراك"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>اختر مستخدماً لعرض التفاصيل</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
