import { useState, useRef, useEffect } from "react";
import { useScreens, useCreateScreen, useDeleteScreen, useUpdateScreen } from "@/hooks/use-screens";
import { useScreenGroups } from "@/hooks/use-groups";
import { useAvailableSlots } from "@/hooks/use-subscriptions";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Monitor, 
  Plus, 
  MapPin, 
  Trash2, 
  ExternalLink,
  MoreVertical,
  Layers,
  AlertCircle,
  Key,
  Smartphone,
  Copy,
  Check,
  XCircle,
  Pencil,
  MonitorSmartphone,
  Camera,
  Search,
  Filter,
  X,
  Power
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export default function Screens() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { canAdd, canEdit, canDelete } = usePermissions();
  const { data: screens = [], isLoading } = useScreens();
  const { data: groups = [] } = useScreenGroups();
  const { data: slotsData } = useAvailableSlots();
  const createScreen = useCreateScreen();
  const deleteScreen = useDeleteScreen();
  const updateScreen = useUpdateScreen();
  
  const dateLocale = language === 'ar' ? ar : enUS;
  
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", groupId: "", orientation: "landscape" });
  const [activationDialogScreen, setActivationDialogScreen] = useState<number | null>(null);
  const [deviceDialogScreen, setDeviceDialogScreen] = useState<number | null>(null);
  const [editingScreen, setEditingScreen] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", location: "", groupId: "", orientation: "landscape" });
  const [generatedCode, setGeneratedCode] = useState<{code: string; expiresAt: Date} | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedDeviceId, setScannedDeviceId] = useState<string | null>(null);
  const [selectedScreenForDevice, setSelectedScreenForDevice] = useState<string>("");
  const [preselectedScreenId, setPreselectedScreenId] = useState<number | null>(null);
  const [preselectedScreenName, setPreselectedScreenName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOrientation, setFilterOrientation] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");

  const availableSlots = slotsData?.availableSlots || 0;

  const generateCodeMutation = useMutation({
    mutationFn: async (screenId: number) => {
      const response = await apiRequest("POST", `/api/screens/${screenId}/activation-codes`);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedCode({ code: data.code, expiresAt: new Date(data.expiresAt) });
      toast({
        title: language === 'ar' ? "تم إنشاء رمز التفعيل" : "Activation code created",
        description: language === 'ar' 
          ? `الرمز: ${data.code} (ينتهي خلال ساعة)` 
          : `Code: ${data.code} (expires in 1 hour)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const { data: deviceBindings = [] } = useQuery<any[]>({
    queryKey: ['/api/screens', deviceDialogScreen, 'devices'],
    enabled: deviceDialogScreen !== null,
  });

  const revokeBindingMutation = useMutation({
    mutationFn: async (bindingId: number) => {
      await apiRequest("DELETE", `/api/device-bindings/${bindingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screens', deviceDialogScreen, 'devices'] });
      toast({
        title: language === 'ar' ? "تم إلغاء الربط" : "Binding revoked",
        description: language === 'ar' ? "تم إلغاء ربط الجهاز بنجاح" : "Device binding revoked successfully",
      });
    }
  });

  const scanActivateMutation = useMutation({
    mutationFn: async ({ code, screenId }: { code: string; screenId: number }) => {
      const response = await apiRequest("POST", "/api/admin/screens/activate-by-scan", { code, screenId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || (language === 'ar' ? "فشل التفعيل" : "Activation failed"));
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ar' ? "تم التفعيل بنجاح" : "Activated successfully",
        description: language === 'ar' ? `تم تفعيل الشاشة: ${data.screenName}` : `Screen activated: ${data.screenName}`,
      });
      setScannerOpen(false);
      setScanning(false);
      queryClient.invalidateQueries({ queryKey: ['/api/screens'] });
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ar' ? "خطأ في التفعيل" : "Activation error",
        description: error.message,
        variant: "destructive",
      });
      setScanning(false);
    },
  });

  const bindDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, screenId }: { deviceId: string; screenId: number }) => {
      const response = await apiRequest("POST", `/api/screens/${screenId}/bind-device`, { deviceId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || (language === 'ar' ? "فشل الربط" : "Binding failed"));
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ar' ? "تم الربط بنجاح" : "Bound successfully",
        description: data.message || (language === 'ar' ? `تم ربط الجهاز بالشاشة: ${data.screenName}` : `Device bound to screen: ${data.screenName}`),
      });
      setScannerOpen(false);
      setScanning(false);
      setScannedDeviceId(null);
      setSelectedScreenForDevice("");
      queryClient.invalidateQueries({ queryKey: ['/api/screens'] });
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ar' ? "خطأ في الربط" : "Binding error",
        description: error.message,
        variant: "destructive",
      });
      setScanning(false);
    },
  });

  // Query for activation status
  const { data: activationStatus } = useQuery<{ currentActive: number; allowedActive: number; remaining: number }>({
    queryKey: ['/api/screens/activation-status'],
  });

  // Toggle screen active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ screenId, isActive }: { screenId: number; isActive: boolean }) => {
      const response = await apiRequest("POST", `/api/screens/${screenId}/toggle-active`, { isActive });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || (language === 'ar' ? "فشل تغيير حالة الشاشة" : "Failed to toggle screen status"));
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.isActive 
          ? (language === 'ar' ? "تم تفعيل الشاشة" : "Screen activated")
          : (language === 'ar' ? "تم إيقاف الشاشة" : "Screen deactivated"),
        description: data.isActive
          ? (language === 'ar' ? "الشاشة تعمل الآن وتعرض المحتوى" : "Screen is now active and displaying content")
          : (language === 'ar' ? "الشاشة متوقفة ولن تعرض المحتوى" : "Screen is inactive and won't display content"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/screens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/screens/activation-status'] });
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScanResult = (decodedText: string) => {
    if (scanning) return;
    
    const deviceMatch = decodedText.match(/DEVICE:([A-Z0-9]{8})/i);
    if (deviceMatch) {
      const scannedId = deviceMatch[1].toUpperCase();
      
      if (preselectedScreenId) {
        setScanning(true);
        bindDeviceMutation.mutate({ 
          deviceId: scannedId, 
          screenId: preselectedScreenId 
        });
      } else {
        setScannedDeviceId(scannedId);
      }
      return;
    }
    
    const screenMatch = decodedText.match(/SCREEN:(\d+):([A-Z0-9]{6})/);
    if (screenMatch) {
      setScanning(true);
      const screenId = parseInt(screenMatch[1]);
      const code = screenMatch[2];
      scanActivateMutation.mutate({ code, screenId });
      return;
    }
    
    toast({
      title: language === 'ar' ? "رمز غير صالح" : "Invalid code",
      description: language === 'ar' ? "يرجى مسح رمز QR صحيح من الجهاز" : "Please scan a valid QR code from the device",
      variant: "destructive",
    });
  };

  const handleBindDevice = () => {
    const screenId = preselectedScreenId || (selectedScreenForDevice ? parseInt(selectedScreenForDevice) : null);
    if (!scannedDeviceId || !screenId) return;
    setScanning(true);
    bindDeviceMutation.mutate({ 
      deviceId: scannedDeviceId, 
      screenId: screenId 
    });
  };

  const openScannerForScreen = (screen: { id: number; name: string }) => {
    setPreselectedScreenId(screen.id);
    setPreselectedScreenName(screen.name);
    setScannedDeviceId(null);
    setSelectedScreenForDevice("");
    setScannerOpen(true);
  };

  const closeScannerDialog = () => {
    setScannerOpen(false);
    setScanning(false);
    setScannedDeviceId(null);
    setSelectedScreenForDevice("");
    setPreselectedScreenId(null);
    setPreselectedScreenName("");
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await createScreen.mutateAsync({
        name: form.name,
        location: form.location,
        orientation: form.orientation,
        groupId: form.groupId ? parseInt(form.groupId) : undefined,
        userId: user.id,
      });
      setIsOpen(false);
      setForm({ name: "", location: "", groupId: "", orientation: "landscape" });
    } catch (err: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: err.message || (language === 'ar' ? "حدث خطأ أثناء إضافة الشاشة" : "An error occurred while adding the screen"),
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(language === 'ar' ? "هل أنت متأكد من حذف هذه الشاشة؟" : "Are you sure you want to delete this screen?");
    if (confirmed) {
      await deleteScreen.mutateAsync(id);
    }
  };

  const openEditDialog = (screen: any) => {
    setEditingScreen(screen);
    setEditForm({
      name: screen.name,
      location: screen.location || "",
      groupId: screen.groupId?.toString() || "",
      orientation: screen.orientation || "landscape"
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScreen) return;
    
    try {
      await updateScreen.mutateAsync({
        id: editingScreen.id,
        data: {
          name: editForm.name,
          location: editForm.location,
          orientation: editForm.orientation,
          groupId: editForm.groupId ? parseInt(editForm.groupId) : null,
        }
      });
      setEditingScreen(null);
    } catch (err: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: err.message || (language === 'ar' ? "حدث خطأ أثناء تحديث الشاشة" : "An error occurred while updating the screen"),
        variant: "destructive"
      });
    }
  };

  const getGroupName = (groupId: number | null) => {
    if (!groupId) return null;
    const group = groups.find(g => g.id === groupId);
    return group?.name;
  };

  const filteredScreens = screens.filter((screen: any) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        screen.name?.toLowerCase().includes(query) ||
        screen.location?.toLowerCase().includes(query) ||
        getGroupName(screen.groupId)?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }
    
    if (filterOrientation !== "all" && screen.orientation !== filterOrientation) {
      return false;
    }
    
    if (filterStatus !== "all" && screen.status !== filterStatus) {
      return false;
    }
    
    if (filterGroup !== "all") {
      if (filterGroup === "none" && screen.groupId !== null) return false;
      if (filterGroup !== "none" && screen.groupId?.toString() !== filterGroup) return false;
    }
    
    return true;
  });

  const hasActiveFilters = filterOrientation !== "all" || filterStatus !== "all" || filterGroup !== "all";
  
  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterOrientation("all");
    setFilterStatus("all");
    setFilterGroup("all");
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t.screens.title}</h1>
            <p className="text-muted-foreground mt-1">{t.screens.subtitle}</p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="gap-1 py-1.5 px-3">
              <Monitor className="w-4 h-4" />
              {language === 'ar' ? `متاح: ${availableSlots} شاشة` : `Available: ${availableSlots} screens`}
            </Badge>
            {activationStatus && (
              <Badge 
                variant={activationStatus.remaining > 0 ? 'outline' : 'destructive'} 
                className="gap-1 py-1.5 px-3"
              >
                <Power className="w-4 h-4" />
                {language === 'ar' 
                  ? `مفعّلة: ${activationStatus.currentActive}/${activationStatus.allowedActive}` 
                  : `Active: ${activationStatus.currentActive}/${activationStatus.allowedActive}`}
              </Badge>
            )}
            
            {canAdd && (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="gap-2 bg-primary rounded-xl px-6"
                    disabled={availableSlots <= 0}
                    data-testid="button-add-screen"
                  >
                    <Plus className="w-5 h-5" />
                    <span>{t.screens.addScreen}</span>
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{language === 'ar' ? "إضافة شاشة جديدة" : "Add New Screen"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>{t.screens.screenName}</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={language === 'ar' ? "مثال: شاشة الاستقبال" : "Example: Reception Screen"}
                      required
                      className="rounded-xl"
                      data-testid="input-screen-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.screens.location}</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder={language === 'ar' ? "مثال: الفرع الرئيسي" : "Example: Main Branch"}
                      className="rounded-xl"
                      data-testid="input-screen-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.screens.orientation}</Label>
                    <Select 
                      value={form.orientation} 
                      onValueChange={(v) => setForm({...form, orientation: v})}
                    >
                      <SelectTrigger className="rounded-xl" data-testid="select-screen-orientation">
                        <SelectValue placeholder={language === 'ar' ? "اختر الاتجاه" : "Select orientation"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landscape">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-4 border-2 border-current rounded-sm" />
                            <span>{language === 'ar' ? "عرضي (أفقي)" : "Landscape (Horizontal)"}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="portrait">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-6 border-2 border-current rounded-sm" />
                            <span>{language === 'ar' ? "طولي (رأسي)" : "Portrait (Vertical)"}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex justify-center pt-2">
                      <div 
                        className={`border-2 border-primary/50 rounded-lg bg-muted/50 flex items-center justify-center transition-all duration-300 ${
                          form.orientation === 'portrait' 
                            ? 'w-16 h-28' 
                            : 'w-28 h-16'
                        }`}
                      >
                        <Monitor className={`text-muted-foreground ${form.orientation === 'portrait' ? 'w-6 h-6' : 'w-8 h-8'}`} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {form.orientation === 'portrait' 
                        ? (language === 'ar' ? 'الشاشة ستعرض المحتوى بشكل عمودي' : 'Screen will display content vertically')
                        : (language === 'ar' ? 'الشاشة ستعرض المحتوى بشكل أفقي' : 'Screen will display content horizontally')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? "المجموعة (اختياري)" : "Group (optional)"}</Label>
                    <Select 
                      value={form.groupId || "none"} 
                      onValueChange={(v) => setForm({...form, groupId: v === "none" ? "" : v})}
                    >
                      <SelectTrigger className="rounded-xl" data-testid="select-screen-group">
                        <SelectValue placeholder={t.screens.noGroup} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t.screens.noGroup}</SelectItem>
                        {groups.map(g => (
                          <SelectItem key={g.id} value={g.id.toString()}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                      {t.cancel}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createScreen.isPending} 
                      className="bg-primary rounded-xl" 
                      data-testid="button-save-screen"
                    >
                      {createScreen.isPending 
                        ? (language === 'ar' ? "جاري الإضافة..." : "Adding...") 
                        : (language === 'ar' ? "حفظ الشاشة" : "Save Screen")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {screens.length > 0 && (
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
                placeholder={language === 'ar' ? "بحث بالاسم أو الموقع..." : "Search by name or location..."}
                className="pr-10 rounded-xl"
                data-testid="input-search-screens"
              />
            </div>
            
            <Select value={filterOrientation} onValueChange={setFilterOrientation}>
              <SelectTrigger className="w-36 rounded-xl" data-testid="select-filter-orientation">
                <SelectValue placeholder={t.screens.orientation} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? "كل الاتجاهات" : "All orientations"}</SelectItem>
                <SelectItem value="landscape">{t.screens.horizontal}</SelectItem>
                <SelectItem value="portrait">{t.screens.vertical}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 rounded-xl" data-testid="select-filter-status">
                <SelectValue placeholder={t.screens.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? "كل الحالات" : "All statuses"}</SelectItem>
                <SelectItem value="online">{t.online}</SelectItem>
                <SelectItem value="offline">{t.offline}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-40 rounded-xl" data-testid="select-filter-group">
                <SelectValue placeholder={t.screens.group} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? "كل المجموعات" : "All groups"}</SelectItem>
                <SelectItem value="none">{t.screens.noGroup}</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id.toString()}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(hasActiveFilters || searchQuery) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="gap-1 text-muted-foreground"
                data-testid="button-clear-filters"
              >
                <X className="w-4 h-4" />
                {language === 'ar' ? "مسح الفلاتر" : "Clear filters"}
              </Button>
            )}
            
            <Badge variant="secondary" className="mr-auto">
              {filteredScreens.length} {language === 'ar' ? "من" : "of"} {screens.length}
            </Badge>
          </div>
        )}

        {availableSlots <= 0 && screens.length === 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <p className="text-sm">
                  {language === 'ar' 
                    ? <>لا توجد شاشات متاحة. يرجى <Link href="/subscriptions" className="text-primary underline">إضافة اشتراك</Link> للحصول على شاشات.</>
                    : <>No screens available. Please <Link href="/subscriptions" className="text-primary underline">add a subscription</Link> to get screens.</>}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 bg-muted/20 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : screens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed border-border rounded-3xl">
            <div className="p-6 bg-background rounded-full shadow-sm mb-4">
              <Monitor className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{t.screens.noScreens}</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              {language === 'ar' ? "أضف شاشات لبدء عرض المحتوى" : "Add screens to start displaying content"}
            </p>
            {availableSlots > 0 && (
              <Button onClick={() => setIsOpen(true)} className="bg-primary rounded-xl" data-testid="button-create-first-screen">
                {language === 'ar' ? "إضافة شاشة جديدة" : "Add New Screen"}
              </Button>
            )}
          </div>
        ) : filteredScreens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-muted/10 border-2 border-dashed border-border rounded-3xl">
            <Filter className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">
              {language === 'ar' ? "لا توجد نتائج" : "No results"}
            </h3>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' ? "لم يتم العثور على شاشات تطابق الفلاتر المحددة" : "No screens match the selected filters"}
            </p>
            <Button 
              variant="outline" 
              className="mt-4 gap-2 rounded-xl"
              onClick={clearAllFilters}
            >
              <X className="w-4 h-4" />
              {language === 'ar' ? "مسح جميع الفلاتر" : "Clear all filters"}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredScreens.map((screen) => {
                const groupName = getGroupName(screen.groupId);
                return (
                  <motion.div
                    key={screen.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card 
                      data-testid={`card-screen-${screen.id}`}
                      className={screen.isActive === false ? "opacity-50" : ""}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                              <Monitor className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{screen.name}</CardTitle>
                              {screen.location && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {screen.location}
                                </p>
                              )}
                            </div>
                          </div>
                          {screen.isActive !== false ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-screen-menu-${screen.id}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/player/${screen.id}`} target="_blank" className="flex items-center">
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                    {language === 'ar' ? "فتح العرض" : "Open Display"}
                                  </Link>
                                </DropdownMenuItem>
                                {canEdit && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => openEditDialog(screen)}
                                      data-testid={`button-edit-screen-${screen.id}`}
                                    >
                                      <Pencil className="w-4 h-4 ml-2" />
                                      {language === 'ar' ? "تعديل الشاشة" : "Edit Screen"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setActivationDialogScreen(screen.id);
                                        setGeneratedCode(null);
                                      }}
                                      data-testid={`button-generate-code-${screen.id}`}
                                    >
                                      <Key className="w-4 h-4 ml-2" />
                                      {language === 'ar' ? "إنشاء رمز تفعيل" : "Generate Activation Code"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => openScannerForScreen(screen)}
                                      data-testid={`button-scan-qr-${screen.id}`}
                                    >
                                      <Camera className="w-4 h-4 ml-2" />
                                      {language === 'ar' ? "مسح QR جهاز" : "Scan Device QR"}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => setDeviceDialogScreen(screen.id)}
                                  data-testid={`button-view-devices-${screen.id}`}
                                >
                                  <Smartphone className="w-4 h-4 ml-2" />
                                  {language === 'ar' ? "الأجهزة المرتبطة" : "Linked Devices"}
                                </DropdownMenuItem>
                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(screen.id)}
                                      className="text-destructive"
                                      data-testid={`button-delete-screen-${screen.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 ml-2" />
                                      {language === 'ar' ? "حذف الشاشة" : "Delete Screen"}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              disabled
                              className="opacity-30"
                              data-testid={`button-screen-menu-${screen.id}`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={screen.status === 'online' ? 'default' : 'secondary'}>
                            {screen.status === 'online' ? t.online : t.offline}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <MonitorSmartphone className="w-3 h-3" />
                            {screen.orientation === 'portrait' ? t.screens.vertical : t.screens.horizontal}
                          </Badge>
                          {groupName && (
                            <Badge variant="outline" className="gap-1">
                              <Layers className="w-3 h-3" />
                              {groupName}
                            </Badge>
                          )}
                          <Badge 
                            variant={screen.isActive !== false ? 'default' : 'secondary'}
                            className={screen.isActive !== false ? 'bg-green-600 dark:bg-green-700' : 'bg-muted'}
                          >
                            <Power className="w-3 h-3 ml-1" />
                            {screen.isActive !== false 
                              ? (language === 'ar' ? 'مفعّلة' : 'Active')
                              : (language === 'ar' ? 'متوقفة' : 'Inactive')}
                          </Badge>
                        </div>
                        {canEdit && (
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <span className="text-sm text-muted-foreground">
                              {language === 'ar' ? 'تفعيل العرض' : 'Display Active'}
                            </span>
                            <Switch
                              checked={screen.isActive !== false}
                              onCheckedChange={(checked) => {
                                toggleActiveMutation.mutate({ screenId: screen.id, isActive: checked });
                              }}
                              disabled={toggleActiveMutation.isPending}
                              data-testid={`switch-screen-active-${screen.id}`}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <Dialog open={activationDialogScreen !== null} onOpenChange={(open) => !open && setActivationDialogScreen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                {language === 'ar' ? "إنشاء رمز تفعيل" : "Generate Activation Code"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                {language === 'ar' 
                  ? "أنشئ رمز تفعيل لربط جهاز بهذه الشاشة. الرمز صالح لمدة ساعة واحدة ويستخدم مرة واحدة فقط."
                  : "Generate an activation code to link a device to this screen. The code is valid for one hour and can only be used once."}
              </p>
              
              {generatedCode ? (
                <div className="space-y-4">
                  <div className="bg-muted p-6 rounded-xl text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      {language === 'ar' ? "رمز التفعيل" : "Activation Code"}
                    </p>
                    <p className="text-4xl font-mono font-bold tracking-widest">
                      {generatedCode.code}
                    </p>
                    <p className="text-sm text-muted-foreground mt-3">
                      {language === 'ar' ? "ينتهي:" : "Expires:"} {format(generatedCode.expiresAt, 'HH:mm', { locale: dateLocale })}
                    </p>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {language === 'ar' ? "أدخل هذا الرمز في صفحة التفعيل على الجهاز" : "Enter this code on the device activation page"}
                  </p>
                  <Button 
                    onClick={copyCode} 
                    variant="outline" 
                    className="w-full gap-2"
                    data-testid="button-copy-code"
                  >
                    {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {codeCopied 
                      ? (language === 'ar' ? 'تم النسخ' : 'Copied') 
                      : (language === 'ar' ? 'نسخ الرمز' : 'Copy Code')}
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => activationDialogScreen && generateCodeMutation.mutate(activationDialogScreen)}
                  disabled={generateCodeMutation.isPending}
                  className="w-full"
                  data-testid="button-create-activation-code"
                >
                  {generateCodeMutation.isPending 
                    ? (language === 'ar' ? 'جاري الإنشاء...' : 'Generating...') 
                    : (language === 'ar' ? 'إنشاء رمز جديد' : 'Generate New Code')}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deviceDialogScreen !== null} onOpenChange={(open) => !open && setDeviceDialogScreen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                {language === 'ar' ? "الأجهزة المرتبطة" : "Linked Devices"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {deviceBindings.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? "لا توجد أجهزة مرتبطة بهذه الشاشة" : "No devices linked to this screen"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deviceBindings.map((binding: any) => (
                    <div key={binding.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {language === 'ar' ? "جهاز مرتبط" : "Linked Device"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? "تم التفعيل:" : "Activated:"} {format(new Date(binding.activatedAt), 'yyyy/MM/dd HH:mm', { locale: dateLocale })}
                        </p>
                        {binding.lastSeenAt && (
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar' ? "آخر ظهور:" : "Last seen:"} {format(new Date(binding.lastSeenAt), 'yyyy/MM/dd HH:mm', { locale: dateLocale })}
                          </p>
                        )}
                      </div>
                      {canDelete && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (window.confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء ربط هذا الجهاز؟' : 'Are you sure you want to unlink this device?')) {
                              revokeBindingMutation.mutate(binding.id);
                            }
                          }}
                          data-testid={`button-revoke-binding-${binding.id}`}
                        >
                          <XCircle className="w-5 h-5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editingScreen !== null} onOpenChange={(open) => !open && setEditingScreen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                {language === 'ar' ? "تعديل الشاشة" : "Edit Screen"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t.screens.screenName}</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder={language === 'ar' ? "مثال: شاشة الاستقبال" : "Example: Reception Screen"}
                  required
                  className="rounded-xl"
                  data-testid="input-edit-screen-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.screens.location}</Label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder={language === 'ar' ? "مثال: الفرع الرئيسي" : "Example: Main Branch"}
                  className="rounded-xl"
                  data-testid="input-edit-screen-location"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.screens.orientation}</Label>
                <Select 
                  value={editForm.orientation} 
                  onValueChange={(v) => setEditForm({...editForm, orientation: v})}
                >
                  <SelectTrigger className="rounded-xl" data-testid="select-edit-screen-orientation">
                    <SelectValue placeholder={language === 'ar' ? "اختر الاتجاه" : "Select orientation"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-4 border-2 border-current rounded-sm" />
                        <span>{language === 'ar' ? "عرضي (أفقي)" : "Landscape (Horizontal)"}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="portrait">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-6 border-2 border-current rounded-sm" />
                        <span>{language === 'ar' ? "طولي (عمودي)" : "Portrait (Vertical)"}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-center pt-2">
                  <div 
                    className={`border-2 border-primary/50 rounded-lg bg-muted/50 flex items-center justify-center transition-all duration-300 ${
                      editForm.orientation === 'portrait' 
                        ? 'w-16 h-28' 
                        : 'w-28 h-16'
                    }`}
                  >
                    <Monitor className={`text-muted-foreground ${editForm.orientation === 'portrait' ? 'w-6 h-6' : 'w-8 h-8'}`} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {editForm.orientation === 'portrait' 
                    ? (language === 'ar' ? 'الشاشة ستعرض المحتوى بشكل عمودي' : 'Screen will display content vertically')
                    : (language === 'ar' ? 'الشاشة ستعرض المحتوى بشكل أفقي' : 'Screen will display content horizontally')}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? "المجموعة (اختياري)" : "Group (optional)"}</Label>
                <Select 
                  value={editForm.groupId} 
                  onValueChange={(v) => setEditForm({...editForm, groupId: v === "none" ? "" : v})}
                >
                  <SelectTrigger className="rounded-xl" data-testid="select-edit-screen-group">
                    <SelectValue placeholder={t.screens.noGroup} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.screens.noGroup}</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingScreen(null)} className="rounded-xl">
                  {t.cancel}
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateScreen.isPending} 
                  className="bg-primary rounded-xl" 
                  data-testid="button-save-edit-screen"
                >
                  {updateScreen.isPending 
                    ? (language === 'ar' ? "جاري الحفظ..." : "Saving...") 
                    : (language === 'ar' ? "حفظ التغييرات" : "Save Changes")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={scannerOpen} onOpenChange={(open) => {
          if (!open) closeScannerDialog();
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                {preselectedScreenName 
                  ? (language === 'ar' ? `مسح QR - ${preselectedScreenName}` : `Scan QR - ${preselectedScreenName}`) 
                  : (language === 'ar' ? "مسح رمز QR" : "Scan QR Code")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {preselectedScreenId && (
                <div className="bg-primary/10 p-3 rounded-xl text-center">
                  <p className="text-sm text-primary font-medium">
                    {language === 'ar' 
                      ? `سيتم ربط الجهاز بشاشة: ${preselectedScreenName}` 
                      : `Device will be linked to screen: ${preselectedScreenName}`}
                  </p>
                </div>
              )}
              
              {!scannedDeviceId && !scanning ? (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    {language === 'ar' 
                      ? "وجه الكاميرا نحو رمز QR الظاهر على جهاز العرض" 
                      : "Point the camera at the QR code displayed on the device"}
                  </p>
                  
                  {scannerOpen && (
                    <QRScanner 
                      onScan={handleScanResult}
                      onError={(error) => {
                        console.error("Scanner error:", error);
                      }}
                      language={language}
                    />
                  )}
                </>
              ) : scanning ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
                  <span className="text-muted-foreground">
                    {language === 'ar' ? "جاري الربط..." : "Binding..."}
                  </span>
                </div>
              ) : scannedDeviceId && !preselectedScreenId ? (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-xl text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      {language === 'ar' ? "رقم تعريف الجهاز" : "Device ID"}
                    </p>
                    <p className="text-2xl font-mono font-bold tracking-wider">{scannedDeviceId}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? "اختر الشاشة للربط" : "Select screen to link"}</Label>
                    <Select 
                      value={selectedScreenForDevice} 
                      onValueChange={setSelectedScreenForDevice}
                    >
                      <SelectTrigger className="rounded-xl" data-testid="select-screen-for-device">
                        <SelectValue placeholder={language === 'ar' ? "اختر شاشة..." : "Select a screen..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {screens.map((screen) => (
                          <SelectItem key={screen.id} value={screen.id.toString()}>
                            {screen.name} {screen.location && `- ${screen.location}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl"
                      onClick={() => {
                        setScannedDeviceId(null);
                        setSelectedScreenForDevice("");
                      }}
                    >
                      {language === 'ar' ? "مسح جهاز آخر" : "Scan Another Device"}
                    </Button>
                    <Button 
                      className="flex-1 rounded-xl"
                      disabled={!selectedScreenForDevice || scanning}
                      onClick={handleBindDevice}
                      data-testid="button-bind-device"
                    >
                      {language === 'ar' ? "ربط الجهاز" : "Link Device"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function QRScanner({ onScan, onError, language }: { onScan: (text: string) => void; onError?: (error: string) => void; language: string }) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  useEffect(() => {
    if (!scannerRef.current) return;

    const loadScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        console.error("Failed to start scanner:", err);
        onError?.(err.message || (language === 'ar' ? "فشل في بدء الكاميرا" : "Failed to start camera"));
      }
    };

    loadScanner();

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [onScan, onError, language]);

  return (
    <div className="relative">
      <div 
        id="qr-reader" 
        ref={scannerRef}
        className="rounded-xl overflow-hidden"
      />
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-64 h-64 border-2 border-primary/50 rounded-lg" />
      </div>
    </div>
  );
}
