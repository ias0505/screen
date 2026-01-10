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
import { useLanguage } from "@/hooks/use-language";
import { SARIcon } from "@/components/ui/price";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  ArrowRight,
  Search,
  Plus,
  Monitor,
  CreditCard,
  Eye,
  Filter,
  X,
  HardDrive,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'غير محدود';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface UserWithStats extends User {
  screenCount?: number;
  subscriptionCount?: number;
}

export default function AdminUsers() {
  const { language } = useLanguage();
  const [search, setSearch] = useState("");
  const [filterScreens, setFilterScreens] = useState<string>("all");
  const [filterSubscriptions, setFilterSubscriptions] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddScreen, setShowAddScreen] = useState(false);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [screenName, setScreenName] = useState("");
  const [screenLocation, setScreenLocation] = useState("");
  const [screenCount, setScreenCount] = useState(1);
  const [durationYears, setDurationYears] = useState(1);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [storageQuotaMb, setStorageQuotaMb] = useState<string>("");
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<UserWithStats[]>({
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
      toast({ title: language === 'ar' ? "تمت إضافة الشاشة بنجاح" : "Screen added successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', selectedUser?.id] });
      setShowAddScreen(false);
      setScreenName("");
      setScreenLocation("");
    },
    onError: () => {
      toast({ title: language === 'ar' ? "حدث خطأ" : "An error occurred", variant: "destructive" });
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
      toast({ title: language === 'ar' ? "تم إضافة الاشتراك بنجاح" : "Subscription added successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setShowAddSubscription(false);
      setScreenCount(1);
      setDurationYears(1);
    },
    onError: () => {
      toast({ title: language === 'ar' ? "حدث خطأ" : "An error occurred", variant: "destructive" });
    }
  });

  const updateStorageMutation = useMutation({
    mutationFn: async (quotaMb: number | null) => {
      return await apiRequest("PATCH", `/api/admin/users/${selectedUser?.id}/storage-quota`, {
        storageQuotaMb: quotaMb
      });
    },
    onSuccess: () => {
      toast({ title: language === 'ar' ? "تم تحديث حد المساحة بنجاح" : "Storage quota updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', selectedUser?.id] });
      setShowStorageDialog(false);
      setStorageQuotaMb("");
    },
    onError: () => {
      toast({ title: language === 'ar' ? "حدث خطأ" : "An error occurred", variant: "destructive" });
    }
  });

  const filteredUsers = users?.filter(user => {
    if (search.trim()) {
      const query = search.toLowerCase();
      const matchesSearch = (
        user.email?.toLowerCase().includes(query) ||
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }
    
    if (filterScreens === "with" && (!user.screenCount || user.screenCount === 0)) {
      return false;
    }
    if (filterScreens === "without" && user.screenCount && user.screenCount > 0) {
      return false;
    }
    
    if (filterSubscriptions === "with" && (!user.subscriptionCount || user.subscriptionCount === 0)) {
      return false;
    }
    if (filterSubscriptions === "without" && user.subscriptionCount && user.subscriptionCount > 0) {
      return false;
    }
    
    return true;
  }) || [];

  const hasActiveFilters = filterScreens !== "all" || filterSubscriptions !== "all" || search.trim();
  
  const clearAllFilters = () => {
    setSearch("");
    setFilterScreens("all");
    setFilterSubscriptions("all");
  };

  const usersWithScreens = users?.filter(u => u.screenCount && u.screenCount > 0).length || 0;
  const usersWithSubscriptions = users?.filter(u => u.subscriptionCount && u.subscriptionCount > 0).length || 0;

  const dateLocale = language === 'ar' ? ar : enUS;
  const noName = language === 'ar' ? 'بدون اسم' : 'No name';

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
          {language === 'ar' ? "إدارة المستخدمين" : "User Management"}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "إجمالي المستخدمين" : "Total Users"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{users?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "لديهم شاشات" : "With Screens"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{usersWithScreens}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "لديهم اشتراكات" : "With Subscriptions"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{usersWithSubscriptions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "بدون شاشات" : "Without Screens"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-500">{(users?.length || 0) - usersWithScreens}</p>
          </CardContent>
        </Card>
      </div>

      {users && users.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap bg-muted/30 p-3 rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">{language === 'ar' ? "تصفية:" : "Filter:"}</span>
          </div>
          
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'ar' ? "بحث بالاسم أو البريد..." : "Search by name or email..."}
              className="pr-10 rounded-xl"
              data-testid="input-search-users"
            />
          </div>
          
          <Select value={filterScreens} onValueChange={setFilterScreens}>
            <SelectTrigger className="w-36 rounded-xl" data-testid="select-filter-screens">
              <SelectValue placeholder={language === 'ar' ? "الشاشات" : "Screens"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? "كل المستخدمين" : "All Users"}</SelectItem>
              <SelectItem value="with">{language === 'ar' ? "لديهم شاشات" : "With Screens"}</SelectItem>
              <SelectItem value="without">{language === 'ar' ? "بدون شاشات" : "Without Screens"}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterSubscriptions} onValueChange={setFilterSubscriptions}>
            <SelectTrigger className="w-40 rounded-xl" data-testid="select-filter-subscriptions">
              <SelectValue placeholder={language === 'ar' ? "الاشتراكات" : "Subscriptions"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? "الكل" : "All"}</SelectItem>
              <SelectItem value="with">{language === 'ar' ? "لديهم اشتراك" : "With Subscription"}</SelectItem>
              <SelectItem value="without">{language === 'ar' ? "بدون اشتراك" : "Without Subscription"}</SelectItem>
            </SelectContent>
          </Select>
          
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="gap-1 text-muted-foreground"
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4" />
              {language === 'ar' ? "مسح الفلاتر" : "Clear Filters"}
            </Button>
          )}
          
          <Badge variant="secondary" className="mr-auto">
            {filteredUsers.length} {language === 'ar' ? "من" : "of"} {users.length}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? `قائمة المستخدمين (${filteredUsers?.length || 0})` : `User List (${filteredUsers?.length || 0})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {users && users.length > 0 
                    ? (language === 'ar' ? "لا توجد نتائج تطابق البحث" : "No results match your search")
                    : (language === 'ar' ? "لا يوجد مستخدمين" : "No users")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{language === 'ar' ? "المستخدم" : "User"}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? "البريد الإلكتروني" : "Email"}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? "تاريخ التسجيل" : "Registration Date"}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? "إجراءات" : "Actions"}</TableHead>
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
                            : noName}
                        </TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: dateLocale })}
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
                <CardTitle className="text-lg">
                  {language === 'ar' ? "تفاصيل المستخدم" : "User Details"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? "الاسم" : "Name"}</p>
                  <p className="font-medium">
                    {selectedUser.firstName || selectedUser.lastName 
                      ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                      : noName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? "البريد الإلكتروني" : "Email"}</p>
                  <p className="font-medium">{selectedUser.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? "تاريخ التسجيل" : "Registration Date"}</p>
                  <p className="font-medium">
                    {format(new Date(selectedUser.createdAt), 'dd MMMM yyyy', { locale: dateLocale })}
                  </p>
                </div>

                <div className="pt-4 space-y-2">
                  <p className="text-sm font-medium">{language === 'ar' ? "الاشتراكات" : "Subscriptions"}</p>
                  {(userDetails as any)?.subscriptions?.length > 0 ? (
                    <div className="space-y-1">
                      {(userDetails as any).subscriptions.map((sub: any) => (
                        <Badge key={sub.id} variant={sub.status === 'active' ? 'default' : 'secondary'}>
                          {sub.screenCount} {language === 'ar' ? "شاشة" : "screens"} - {sub.durationYears} {language === 'ar' ? "سنة" : "year(s)"}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? "لا توجد اشتراكات" : "No subscriptions"}
                    </p>
                  )}
                </div>

                <div className="pt-2 space-y-2">
                  <p className="text-sm font-medium">{language === 'ar' ? "الشاشات" : "Screens"}</p>
                  {(userDetails as any)?.screens?.length > 0 ? (
                    <div className="space-y-1">
                      {(userDetails as any).screens.map((screen: any) => (
                        <Badge key={screen.id} variant="outline">
                          {screen.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? "لا توجد شاشات" : "No screens"}
                    </p>
                  )}
                </div>

                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <HardDrive className="w-4 h-4" />
                      {language === 'ar' ? "المساحة التخزينية" : "Storage"}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => {
                        const details = userDetails as any;
                        const currentQuota = details?.user?.storageQuotaMb;
                        setStorageQuotaMb(currentQuota !== null && currentQuota !== undefined ? String(currentQuota) : "");
                        setShowStorageDialog(true);
                      }}
                      data-testid="button-edit-storage"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                  {(userDetails as any)?.storageUsage && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'ar' ? "المستخدم" : "Used"}</span>
                        <span>{formatBytes((userDetails as any).storageUsage.usedBytes)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'ar' ? "الحد الأقصى" : "Limit"}</span>
                        <span>
                          {(userDetails as any).storageUsage.limitBytes === -1 
                            ? (language === 'ar' ? "غير محدود" : "Unlimited")
                            : formatBytes((userDetails as any).storageUsage.limitBytes)}
                        </span>
                      </div>
                      {(userDetails as any).storageUsage.limitBytes !== -1 && (
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((userDetails as any).storageUsage.percentage, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <Dialog open={showAddScreen} onOpenChange={setShowAddScreen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2" data-testid="button-add-screen-to-user">
                        <Monitor className="w-4 h-4" />
                        {language === 'ar' ? "إضافة شاشة (بدون اشتراك)" : "Add Screen (No Subscription)"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {language === 'ar' ? "إضافة شاشة للمستخدم" : "Add Screen to User"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-sm font-medium">
                            {language === 'ar' ? "اسم الشاشة" : "Screen Name"}
                          </label>
                          <Input
                            value={screenName}
                            onChange={(e) => setScreenName(e.target.value)}
                            placeholder={language === 'ar' ? "شاشة المدخل" : "Entrance Screen"}
                            data-testid="input-screen-name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            {language === 'ar' ? "الموقع (اختياري)" : "Location (Optional)"}
                          </label>
                          <Input
                            value={screenLocation}
                            onChange={(e) => setScreenLocation(e.target.value)}
                            placeholder={language === 'ar' ? "الطابق الأول" : "First Floor"}
                            data-testid="input-screen-location"
                          />
                        </div>
                        <Button 
                          onClick={() => addScreenMutation.mutate()}
                          disabled={!screenName || addScreenMutation.isPending}
                          className="w-full"
                          data-testid="button-confirm-add-screen"
                        >
                          {addScreenMutation.isPending 
                            ? (language === 'ar' ? "جاري الإضافة..." : "Adding...")
                            : (language === 'ar' ? "إضافة الشاشة" : "Add Screen")}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showAddSubscription} onOpenChange={setShowAddSubscription}>
                    <DialogTrigger asChild>
                      <Button className="w-full gap-2" data-testid="button-add-subscription-to-user">
                        <CreditCard className="w-4 h-4" />
                        {language === 'ar' ? "إضافة اشتراك" : "Add Subscription"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {language === 'ar' ? "إضافة اشتراك للمستخدم" : "Add Subscription to User"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-sm font-medium">
                            {language === 'ar' ? "عدد الشاشات" : "Number of Screens"}
                          </label>
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
                          <label className="text-sm font-medium">
                            {language === 'ar' ? "مدة الاشتراك (سنوات)" : "Subscription Duration (Years)"}
                          </label>
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
                          <p className="text-sm inline-flex items-center gap-1">
                            {language === 'ar' ? "المبلغ:" : "Amount:"} <span className="font-bold inline-flex items-center gap-1">{screenCount * 50 * durationYears} <SARIcon size={12} /></span>
                          </p>
                        </div>
                        <Button 
                          onClick={() => addSubscriptionMutation.mutate()}
                          disabled={addSubscriptionMutation.isPending}
                          className="w-full"
                          data-testid="button-confirm-add-subscription"
                        >
                          {addSubscriptionMutation.isPending 
                            ? (language === 'ar' ? "جاري الإضافة..." : "Adding...")
                            : (language === 'ar' ? "إضافة الاشتراك" : "Add Subscription")}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {language === 'ar' ? "تعديل حد المساحة التخزينية" : "Edit Storage Quota"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-sm font-medium">
                            {language === 'ar' ? "الحد الأقصى (ميجابايت)" : "Quota (MB)"}
                          </label>
                          <Input
                            type="number"
                            min={-1}
                            value={storageQuotaMb}
                            onChange={(e) => setStorageQuotaMb(e.target.value)}
                            placeholder={language === 'ar' ? "اترك فارغاً للحساب التلقائي" : "Leave empty for auto-calculation"}
                            data-testid="input-storage-quota"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === 'ar' 
                              ? "-1 = غير محدود، فارغ = حساب تلقائي حسب الاشتراك" 
                              : "-1 = unlimited, empty = auto-calculate from subscription"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => {
                              if (storageQuotaMb.trim() === "") {
                                updateStorageMutation.mutate(null);
                              } else {
                                const parsed = parseInt(storageQuotaMb);
                                if (!isNaN(parsed)) {
                                  updateStorageMutation.mutate(parsed);
                                }
                              }
                            }}
                            disabled={updateStorageMutation.isPending || (storageQuotaMb.trim() !== "" && isNaN(parseInt(storageQuotaMb)))}
                            className="flex-1"
                            data-testid="button-confirm-storage"
                          >
                            {updateStorageMutation.isPending 
                              ? (language === 'ar' ? "جاري الحفظ..." : "Saving...")
                              : (language === 'ar' ? "حفظ" : "Save")}
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              updateStorageMutation.mutate(null);
                            }}
                            disabled={updateStorageMutation.isPending}
                            data-testid="button-reset-storage"
                          >
                            {language === 'ar' ? "إعادة للتلقائي" : "Reset to Auto"}
                          </Button>
                        </div>
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
                <p>{language === 'ar' ? "اختر مستخدماً لعرض التفاصيل" : "Select a user to view details"}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
