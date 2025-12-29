import { useState } from "react";
import { useScreens, useCreateScreen, useDeleteScreen, useUpdateScreen } from "@/hooks/use-screens";
import { useScreenGroups } from "@/hooks/use-groups";
import { useAvailableSlots } from "@/hooks/use-subscriptions";
import { useAuth } from "@/hooks/use-auth";
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
  MonitorSmartphone
} from "lucide-react";
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
import { ar } from "date-fns/locale";

export default function Screens() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: screens = [], isLoading } = useScreens();
  const { data: groups = [] } = useScreenGroups();
  const { data: slotsData } = useAvailableSlots();
  const createScreen = useCreateScreen();
  const deleteScreen = useDeleteScreen();
  const updateScreen = useUpdateScreen();
  
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", groupId: "", orientation: "landscape" });
  const [activationDialogScreen, setActivationDialogScreen] = useState<number | null>(null);
  const [deviceDialogScreen, setDeviceDialogScreen] = useState<number | null>(null);
  const [editingScreen, setEditingScreen] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", location: "", groupId: "", orientation: "landscape" });
  const [generatedCode, setGeneratedCode] = useState<{code: string; expiresAt: Date} | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const availableSlots = slotsData?.availableSlots || 0;

  // Generate activation code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async (screenId: number) => {
      const response = await apiRequest("POST", `/api/screens/${screenId}/activation-codes`);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedCode({ code: data.code, expiresAt: new Date(data.expiresAt) });
      toast({
        title: "تم إنشاء رمز التفعيل",
        description: `الرمز: ${data.code} (ينتهي خلال ساعة)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Fetch device bindings for a screen
  const { data: deviceBindings = [] } = useQuery<any[]>({
    queryKey: ['/api/screens', deviceDialogScreen, 'devices'],
    enabled: deviceDialogScreen !== null,
  });

  // Revoke device binding mutation
  const revokeBindingMutation = useMutation({
    mutationFn: async (bindingId: number) => {
      await apiRequest("DELETE", `/api/device-bindings/${bindingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screens', deviceDialogScreen, 'devices'] });
      toast({
        title: "تم إلغاء الربط",
        description: "تم إلغاء ربط الجهاز بنجاح",
      });
    }
  });

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
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء إضافة الشاشة",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه الشاشة؟");
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
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء تحديث الشاشة",
        variant: "destructive"
      });
    }
  };

  const getGroupName = (groupId: number | null) => {
    if (!groupId) return null;
    const group = groups.find(g => g.id === groupId);
    return group?.name;
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">الشاشات</h1>
            <p className="text-muted-foreground mt-1">إدارة شاشات العرض</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1 py-1.5 px-3">
              <Monitor className="w-4 h-4" />
              متاح: {availableSlots} شاشة
            </Badge>
            
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="gap-2 bg-primary rounded-xl px-6"
                  disabled={availableSlots <= 0}
                  data-testid="button-add-screen"
                >
                  <Plus className="w-5 h-5" />
                  <span>إضافة شاشة</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة شاشة جديدة</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>اسم الشاشة</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="مثال: شاشة الاستقبال"
                      required
                      className="rounded-xl"
                      data-testid="input-screen-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الموقع</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="مثال: الفرع الرئيسي"
                      className="rounded-xl"
                      data-testid="input-screen-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>اتجاه الشاشة</Label>
                    <Select 
                      value={form.orientation} 
                      onValueChange={(v) => setForm({...form, orientation: v})}
                    >
                      <SelectTrigger className="rounded-xl" data-testid="select-screen-orientation">
                        <SelectValue placeholder="اختر الاتجاه" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landscape">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-4 border-2 border-current rounded-sm" />
                            <span>عرضي (أفقي)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="portrait">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-6 border-2 border-current rounded-sm" />
                            <span>طولي (رأسي)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المجموعة (اختياري)</Label>
                    <Select 
                      value={form.groupId || "none"} 
                      onValueChange={(v) => setForm({...form, groupId: v === "none" ? "" : v})}
                    >
                      <SelectTrigger className="rounded-xl" data-testid="select-screen-group">
                        <SelectValue placeholder="بدون مجموعة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون مجموعة</SelectItem>
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
                      إلغاء
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createScreen.isPending} 
                      className="bg-primary rounded-xl" 
                      data-testid="button-save-screen"
                    >
                      {createScreen.isPending ? "جاري الإضافة..." : "حفظ الشاشة"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {availableSlots <= 0 && screens.length === 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <p className="text-sm">
                  لا توجد شاشات متاحة. يرجى <Link href="/subscriptions" className="text-primary underline">إضافة اشتراك</Link> للحصول على شاشات.
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
            <h3 className="text-xl font-bold text-foreground">لا توجد شاشات</h3>
            <p className="text-muted-foreground mt-2 mb-6">أضف شاشات لبدء عرض المحتوى</p>
            {availableSlots > 0 && (
              <Button onClick={() => setIsOpen(true)} className="bg-primary rounded-xl" data-testid="button-create-first-screen">
                إضافة شاشة جديدة
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {screens.map((screen) => {
                const groupName = getGroupName(screen.groupId);
                return (
                  <motion.div
                    key={screen.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card data-testid={`card-screen-${screen.id}`}>
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
                                  فتح العرض
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openEditDialog(screen)}
                                data-testid={`button-edit-screen-${screen.id}`}
                              >
                                <Pencil className="w-4 h-4 ml-2" />
                                تعديل الشاشة
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setActivationDialogScreen(screen.id);
                                  setGeneratedCode(null);
                                }}
                                data-testid={`button-generate-code-${screen.id}`}
                              >
                                <Key className="w-4 h-4 ml-2" />
                                إنشاء رمز تفعيل
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeviceDialogScreen(screen.id)}
                                data-testid={`button-view-devices-${screen.id}`}
                              >
                                <Smartphone className="w-4 h-4 ml-2" />
                                الأجهزة المرتبطة
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(screen.id)}
                                className="text-destructive"
                                data-testid={`button-delete-screen-${screen.id}`}
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف الشاشة
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={screen.status === 'online' ? 'default' : 'secondary'}>
                            {screen.status === 'online' ? 'متصل' : 'غير متصل'}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <MonitorSmartphone className="w-3 h-3" />
                            {screen.orientation === 'portrait' ? 'عمودي' : 'أفقي'}
                          </Badge>
                          {groupName && (
                            <Badge variant="outline" className="gap-1">
                              <Layers className="w-3 h-3" />
                              {groupName}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Activation Code Dialog */}
        <Dialog open={activationDialogScreen !== null} onOpenChange={(open) => !open && setActivationDialogScreen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                إنشاء رمز تفعيل
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                أنشئ رمز تفعيل لربط جهاز بهذه الشاشة. الرمز صالح لمدة ساعة واحدة ويستخدم مرة واحدة فقط.
              </p>
              
              {generatedCode ? (
                <div className="space-y-4">
                  <div className="bg-muted p-6 rounded-xl text-center">
                    <p className="text-4xl font-mono font-bold tracking-widest">
                      {generatedCode.code}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      ينتهي: {format(generatedCode.expiresAt, 'HH:mm', { locale: ar })}
                    </p>
                  </div>
                  <Button 
                    onClick={copyCode} 
                    variant="outline" 
                    className="w-full gap-2"
                    data-testid="button-copy-code"
                  >
                    {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {codeCopied ? 'تم النسخ' : 'نسخ الرمز'}
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => activationDialogScreen && generateCodeMutation.mutate(activationDialogScreen)}
                  disabled={generateCodeMutation.isPending}
                  className="w-full"
                  data-testid="button-create-activation-code"
                >
                  {generateCodeMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء رمز جديد'}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Device Bindings Dialog */}
        <Dialog open={deviceDialogScreen !== null} onOpenChange={(open) => !open && setDeviceDialogScreen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                الأجهزة المرتبطة
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {deviceBindings.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">لا توجد أجهزة مرتبطة بهذه الشاشة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deviceBindings.map((binding: any) => (
                    <div key={binding.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">جهاز مرتبط</p>
                        <p className="text-xs text-muted-foreground">
                          تم التفعيل: {format(new Date(binding.activatedAt), 'yyyy/MM/dd HH:mm', { locale: ar })}
                        </p>
                        {binding.lastSeenAt && (
                          <p className="text-xs text-muted-foreground">
                            آخر ظهور: {format(new Date(binding.lastSeenAt), 'yyyy/MM/dd HH:mm', { locale: ar })}
                          </p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (window.confirm('هل أنت متأكد من إلغاء ربط هذا الجهاز؟')) {
                            revokeBindingMutation.mutate(binding.id);
                          }
                        }}
                        data-testid={`button-revoke-binding-${binding.id}`}
                      >
                        <XCircle className="w-5 h-5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Screen Dialog */}
        <Dialog open={editingScreen !== null} onOpenChange={(open) => !open && setEditingScreen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                تعديل الشاشة
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>اسم الشاشة</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="مثال: شاشة الاستقبال"
                  required
                  className="rounded-xl"
                  data-testid="input-edit-screen-name"
                />
              </div>
              <div className="space-y-2">
                <Label>الموقع</Label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="مثال: الفرع الرئيسي"
                  className="rounded-xl"
                  data-testid="input-edit-screen-location"
                />
              </div>
              <div className="space-y-2">
                <Label>اتجاه الشاشة</Label>
                <Select 
                  value={editForm.orientation} 
                  onValueChange={(v) => setEditForm({...editForm, orientation: v})}
                >
                  <SelectTrigger className="rounded-xl" data-testid="select-edit-screen-orientation">
                    <SelectValue placeholder="اختر الاتجاه" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-4 border-2 border-current rounded-sm" />
                        <span>عرضي (أفقي)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="portrait">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-6 border-2 border-current rounded-sm" />
                        <span>طولي (عمودي)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المجموعة (اختياري)</Label>
                <Select 
                  value={editForm.groupId} 
                  onValueChange={(v) => setEditForm({...editForm, groupId: v === "none" ? "" : v})}
                >
                  <SelectTrigger className="rounded-xl" data-testid="select-edit-screen-group">
                    <SelectValue placeholder="بدون مجموعة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مجموعة</SelectItem>
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
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateScreen.isPending} 
                  className="bg-primary rounded-xl" 
                  data-testid="button-save-edit-screen"
                >
                  {updateScreen.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
