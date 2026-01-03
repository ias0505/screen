import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import { useLanguage } from "@/hooks/use-language";
import { Monitor, ArrowRight, Wifi, WifiOff, Trash2, Search, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
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
  const { language } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSubscription, setFilterSubscription] = useState<string>("all");
  
  const { data: screens, isLoading } = useQuery<Screen[]>({
    queryKey: ['/api/admin/screens'],
  });

  const deleteScreenMutation = useMutation({
    mutationFn: async (screenId: number) => {
      await apiRequest("DELETE", `/api/admin/screens/${screenId}`);
    },
    onSuccess: () => {
      toast({ title: language === 'ar' ? "تم حذف الشاشة بنجاح" : "Screen deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/screens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: Error) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const noName = language === 'ar' ? 'بدون اسم' : 'No name';
  const dateLocale = language === 'ar' ? ar : enUS;

  const handleDelete = (screen: Screen) => {
    const userName = screen.user.firstName || screen.user.lastName 
      ? `${screen.user.firstName || ''} ${screen.user.lastName || ''}`.trim()
      : screen.user.email || noName;
    
    const confirmMessage = language === 'ar' 
      ? `هل أنت متأكد من حذف شاشة "${screen.name}" للمستخدم "${userName}"؟`
      : `Are you sure you want to delete screen "${screen.name}" for user "${userName}"?`;
    
    if (window.confirm(confirmMessage)) {
      deleteScreenMutation.mutate(screen.id);
    }
  };

  const onlineCount = screens?.filter(s => s.status === 'online').length || 0;
  const offlineCount = screens?.filter(s => s.status === 'offline').length || 0;
  const withSubscription = screens?.filter(s => s.subscriptionId).length || 0;
  const withoutSubscription = screens?.filter(s => !s.subscriptionId).length || 0;

  const getUserName = (screen: Screen) => {
    return screen.user.firstName || screen.user.lastName 
      ? `${screen.user.firstName || ''} ${screen.user.lastName || ''}`.trim()
      : screen.user.email || noName;
  };

  const filteredScreens = screens?.filter(screen => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        screen.name?.toLowerCase().includes(query) ||
        screen.location?.toLowerCase().includes(query) ||
        getUserName(screen).toLowerCase().includes(query) ||
        screen.user.email?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }
    
    if (filterStatus !== "all" && screen.status !== filterStatus) {
      return false;
    }
    
    if (filterSubscription === "with" && !screen.subscriptionId) {
      return false;
    }
    if (filterSubscription === "without" && screen.subscriptionId) {
      return false;
    }
    
    return true;
  }) || [];

  const hasActiveFilters = filterStatus !== "all" || filterSubscription !== "all" || searchQuery.trim();
  
  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterSubscription("all");
  };

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
          {language === 'ar' ? "جميع الشاشات" : "All Screens"}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "إجمالي الشاشات" : "Total Screens"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{screens?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "متصلة" : "Online"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "غير متصلة" : "Offline"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-500">{offlineCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "بدون اشتراك" : "Without Subscription"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{withoutSubscription}</p>
          </CardContent>
        </Card>
      </div>

      {screens && screens.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap bg-muted/30 p-3 rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">{language === 'ar' ? "تصفية:" : "Filter:"}</span>
          </div>
          
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? "بحث بالاسم أو المستخدم..." : "Search by name or user..."}
              className="pr-10 rounded-xl"
              data-testid="input-search-screens"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 rounded-xl" data-testid="select-filter-status">
              <SelectValue placeholder={language === 'ar' ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? "كل الحالات" : "All Statuses"}</SelectItem>
              <SelectItem value="online">{language === 'ar' ? "متصل" : "Online"}</SelectItem>
              <SelectItem value="offline">{language === 'ar' ? "غير متصل" : "Offline"}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterSubscription} onValueChange={setFilterSubscription}>
            <SelectTrigger className="w-40 rounded-xl" data-testid="select-filter-subscription">
              <SelectValue placeholder={language === 'ar' ? "الاشتراك" : "Subscription"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? "الكل" : "All"}</SelectItem>
              <SelectItem value="with">{language === 'ar' ? "مع اشتراك" : "With Subscription"}</SelectItem>
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
            {filteredScreens.length} {language === 'ar' ? "من" : "of"} {screens.length}
          </Badge>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : screens?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === 'ar' ? "لا توجد شاشات" : "No screens"}
            </div>
          ) : filteredScreens.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === 'ar' ? "لا توجد نتائج تطابق البحث" : "No results match your search"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? "رقم" : "#"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الاسم" : "Name"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الموقع" : "Location"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "المستخدم" : "User"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الاشتراك" : "Subscription"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "تاريخ الإنشاء" : "Created Date"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScreens.map(screen => (
                  <TableRow key={screen.id} data-testid={`row-screen-${screen.id}`}>
                    <TableCell>#{screen.id}</TableCell>
                    <TableCell className="font-medium">{screen.name}</TableCell>
                    <TableCell>{screen.location || '-'}</TableCell>
                    <TableCell>{getUserName(screen)}</TableCell>
                    <TableCell>
                      {screen.subscriptionId ? (
                        <Badge variant="outline">#{screen.subscriptionId}</Badge>
                      ) : (
                        <Badge variant="secondary">{language === 'ar' ? "بدون اشتراك" : "No subscription"}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {screen.status === 'online' ? (
                        <Badge className="bg-green-500">
                          <Wifi className="w-3 h-3 ml-1" />
                          {language === 'ar' ? "متصل" : "Online"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <WifiOff className="w-3 h-3 ml-1" />
                          {language === 'ar' ? "غير متصل" : "Offline"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(screen.createdAt), 'dd MMM yyyy', { locale: dateLocale })}
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
