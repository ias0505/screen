import { useState } from "react";
import { useScreens, useCreateScreen, useDeleteScreen } from "@/hooks/use-screens";
import { useScreenGroups, useCreateScreenGroup } from "@/hooks/use-groups";
import { useGroupsWithSubscriptions, useCreateGroupSubscription } from "@/hooks/use-group-subscriptions";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Monitor, 
  Plus, 
  MapPin, 
  Trash2, 
  ExternalLink,
  MoreVertical,
  Layers,
  Calendar,
  CreditCard,
  AlertCircle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Screens() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: screens = [], isLoading } = useScreens();
  const { data: groupsWithSubs = [] } = useGroupsWithSubscriptions();
  const createScreen = useCreateScreen();
  const deleteScreen = useDeleteScreen();
  const createGroup = useCreateScreenGroup();
  const createGroupSub = useCreateGroupSubscription();
  
  const [isScreenOpen, setIsScreenOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  const [newScreen, setNewScreen] = useState({ name: "", location: "", groupId: "" });
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [subForm, setSubForm] = useState({ maxScreens: 5, durationYears: 1 });

  const activeGroups = groupsWithSubs.filter(g => 
    g.subscription?.status === 'active' && 
    new Date(g.subscription.endDate) > new Date()
  );

  const handleCreateScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newScreen.groupId) return;
    
    try {
      await createScreen.mutateAsync({
        name: newScreen.name,
        location: newScreen.location,
        groupId: parseInt(newScreen.groupId),
        userId: user.id,
      });
      setIsScreenOpen(false);
      setNewScreen({ name: "", location: "", groupId: "" });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء إضافة الشاشة",
        variant: "destructive"
      });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const group = await createGroup.mutateAsync({
      name: newGroup.name,
      description: newGroup.description,
      userId: user.id,
    });
    setIsGroupOpen(false);
    setNewGroup({ name: "", description: "" });
    setSelectedGroupId(group.id);
    setIsSubscribeOpen(true);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    
    const confirmed = window.confirm(
      `هل تريد تفعيل اشتراك لـ ${subForm.maxScreens} شاشة لمدة ${subForm.durationYears} سنة؟\n` +
      `المبلغ الإجمالي: ${subForm.maxScreens * 50 * subForm.durationYears} ريال`
    );
    
    if (confirmed) {
      await createGroupSub.mutateAsync({
        groupId: selectedGroupId,
        maxScreens: subForm.maxScreens,
        durationYears: subForm.durationYears,
      });
      setIsSubscribeOpen(false);
      setSelectedGroupId(null);
      toast({
        title: "تم تفعيل الاشتراك",
        description: "يمكنك الآن إضافة شاشات لهذه المجموعة",
      });
    }
  };

  const openSubscribeDialog = (groupId: number) => {
    setSelectedGroupId(groupId);
    setSubForm({ maxScreens: 5, durationYears: 1 });
    setIsSubscribeOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الشاشات</h1>
            <p className="text-muted-foreground mt-2">تحكم في شاشات العرض والمجموعات الخاصة بك</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isGroupOpen} onOpenChange={setIsGroupOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl">
                  <Layers className="w-5 h-5" />
                  <span>مجموعة جديدة</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إنشاء مجموعة شاشات</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateGroup} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>اسم المجموعة</Label>
                    <Input 
                      value={newGroup.name} 
                      onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                      placeholder="مثال: شاشات الفرع الشرقي"
                      required
                      className="rounded-xl"
                      data-testid="input-group-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Input 
                      value={newGroup.description} 
                      onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                      placeholder="وصف اختياري للمجموعة"
                      className="rounded-xl"
                      data-testid="input-group-description"
                    />
                  </div>
                  <Button type="submit" disabled={createGroup.isPending} className="w-full bg-primary rounded-xl" data-testid="button-save-group">
                    {createGroup.isPending ? "جاري الحفظ..." : "حفظ المجموعة والانتقال للاشتراك"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isScreenOpen} onOpenChange={setIsScreenOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-xl px-6"
                  disabled={activeGroups.length === 0}
                  data-testid="button-add-screen"
                >
                  <Plus className="w-5 h-5" />
                  <span>{activeGroups.length > 0 ? 'إضافة شاشة' : 'أنشئ مجموعة أولاً'}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>إضافة شاشة جديدة</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateScreen} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم الشاشة</Label>
                    <Input
                      id="name"
                      value={newScreen.name}
                      onChange={(e) => setNewScreen({ ...newScreen, name: e.target.value })}
                      placeholder="مثال: شاشة الاستقبال الرئيسية"
                      required
                      className="rounded-xl"
                      data-testid="input-screen-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">الموقع</Label>
                    <Input
                      id="location"
                      value={newScreen.location}
                      onChange={(e) => setNewScreen({ ...newScreen, location: e.target.value })}
                      placeholder="مثال: الفرع الرئيسي - الطابق الأول"
                      className="rounded-xl"
                      data-testid="input-screen-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المجموعة (مطلوب)</Label>
                    <Select 
                      value={newScreen.groupId} 
                      onValueChange={(v) => setNewScreen({...newScreen, groupId: v})}
                      required
                    >
                      <SelectTrigger className="rounded-xl" data-testid="select-screen-group">
                        <SelectValue placeholder="اختر مجموعة" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeGroups.map(g => {
                          const usedScreens = screens.filter(s => s.groupId === g.id).length;
                          const maxScreens = g.subscription?.maxScreens || 0;
                          const isFull = usedScreens >= maxScreens;
                          return (
                            <SelectItem 
                              key={g.id} 
                              value={g.id.toString()} 
                              disabled={isFull}
                            >
                              {g.name} ({usedScreens}/{maxScreens})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsScreenOpen(false)} className="rounded-xl">إلغاء</Button>
                    <Button type="submit" disabled={createScreen.isPending || !newScreen.groupId} className="bg-primary hover:bg-primary/90 rounded-xl" data-testid="button-save-screen">
                      {createScreen.isPending ? "جاري الإضافة..." : "حفظ الشاشة"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Dialog open={isSubscribeOpen} onOpenChange={setIsSubscribeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تفعيل اشتراك للمجموعة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubscribe} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>عدد الشاشات</Label>
                <Input 
                  type="number"
                  min={1}
                  max={100}
                  value={subForm.maxScreens} 
                  onChange={(e) => setSubForm({...subForm, maxScreens: parseInt(e.target.value) || 1})}
                  className="rounded-xl"
                  data-testid="input-sub-screens"
                />
              </div>
              <div className="space-y-2">
                <Label>مدة الاشتراك (بالسنوات)</Label>
                <Select 
                  value={subForm.durationYears.toString()} 
                  onValueChange={(v) => setSubForm({...subForm, durationYears: parseInt(v)})}
                >
                  <SelectTrigger className="rounded-xl" data-testid="select-sub-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">سنة واحدة</SelectItem>
                    <SelectItem value="2">سنتان</SelectItem>
                    <SelectItem value="3">3 سنوات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span>السعر الإجمالي:</span>
                    <span className="text-2xl font-bold text-primary">
                      {subForm.maxScreens * 50 * subForm.durationYears} ريال
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {subForm.maxScreens} شاشة × 50 ريال × {subForm.durationYears} سنة
                  </p>
                </CardContent>
              </Card>
              <Button type="submit" disabled={createGroupSub.isPending} className="w-full bg-primary rounded-xl" data-testid="button-confirm-subscription">
                <CreditCard className="w-4 h-4 ml-2" />
                {createGroupSub.isPending ? "جاري التفعيل..." : "تأكيد الدفع وتفعيل الاشتراك"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {isLoading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[1, 2, 3].map((n) => (
               <div key={n} className="h-48 bg-muted/20 animate-pulse rounded-2xl" />
             ))}
           </div>
        ) : (
          <>
            {groupsWithSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed border-border rounded-3xl">
                <div className="p-6 bg-background rounded-full shadow-sm mb-4">
                  <Layers className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground">لا توجد مجموعات</h3>
                <p className="text-muted-foreground mt-2 mb-6">أنشئ مجموعة شاشات أولاً ثم فعّل الاشتراك لها</p>
                <Button onClick={() => setIsGroupOpen(true)} className="bg-primary text-primary-foreground rounded-xl" data-testid="button-create-first-group">
                  إنشاء مجموعة جديدة
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {groupsWithSubs.map(group => {
                  const sub = group.subscription;
                  const isActive = sub?.status === 'active' && new Date(sub.endDate) > new Date();
                  const isExpired = sub && (sub.status === 'expired' || new Date(sub.endDate) <= new Date());
                  const groupScreens = screens.filter(s => s.groupId === group.id);
                  const usedScreens = groupScreens.length;
                  const maxScreens = sub?.maxScreens || 0;
                  
                  return (
                    <Card key={group.id} className={`${isExpired ? 'opacity-60 border-destructive/50' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              <Layers className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{group.name}</CardTitle>
                              {group.description && (
                                <p className="text-sm text-muted-foreground">{group.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 flex-wrap">
                            {isActive && sub && (
                              <>
                                <Badge variant="secondary" className="gap-1">
                                  <Monitor className="w-3 h-3" />
                                  {usedScreens} / {maxScreens}
                                </Badge>
                                <Badge variant="outline" className="gap-1">
                                  <Calendar className="w-3 h-3" />
                                  ينتهي: {format(new Date(sub.endDate), 'dd MMM yyyy', { locale: ar })}
                                </Badge>
                              </>
                            )}
                            {isExpired && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="w-3 h-3" />
                                انتهى الاشتراك
                              </Badge>
                            )}
                            {!sub && (
                              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                                <AlertCircle className="w-3 h-3" />
                                بدون اشتراك
                              </Badge>
                            )}
                            
                            {(!isActive || isExpired || !sub) && (
                              <Button 
                                size="sm" 
                                onClick={() => openSubscribeDialog(group.id)}
                                className="rounded-lg"
                                data-testid={`button-subscribe-group-${group.id}`}
                              >
                                <CreditCard className="w-4 h-4 ml-1" />
                                {isExpired ? 'تجديد الاشتراك' : 'تفعيل اشتراك'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      {isActive && (
                        <CardContent>
                          {groupScreens.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <AnimatePresence>
                                {groupScreens.map((screen) => (
                                  <ScreenCard key={screen.id} screen={screen} onDelete={() => deleteScreen.mutate(screen.id)} />
                                ))}
                              </AnimatePresence>
                            </div>
                          ) : (
                            <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                              <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>لا توجد شاشات في هذه المجموعة</p>
                              <Button 
                                variant="ghost" 
                                onClick={() => {
                                  setNewScreen({ ...newScreen, groupId: group.id.toString() });
                                  setIsScreenOpen(true);
                                }}
                                className="mt-2 text-primary"
                                data-testid={`button-add-screen-to-group-${group.id}`}
                              >
                                إضافة شاشة
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      )}
                      
                      {isExpired && groupScreens.length > 0 && (
                        <CardContent>
                          <div className="p-4 bg-destructive/10 rounded-xl text-center">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
                            <p className="text-destructive font-medium">
                              انتهى اشتراك هذه المجموعة - الشاشات معطلة
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              كان لديك {groupScreens.length} شاشة في هذه المجموعة
                            </p>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function ScreenCard({ screen, onDelete }: { screen: any, onDelete: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group bg-background hover:border-primary/50 border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Monitor className="w-5 h-5" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" data-testid={`button-screen-menu-${screen.id}`}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={onDelete} data-testid={`button-delete-screen-${screen.id}`}>
              <Trash2 className="w-4 h-4 ml-2" />
              حذف الشاشة
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <h3 className="text-base font-bold mb-1 truncate">{screen.name}</h3>
      <div className="flex items-center text-xs text-muted-foreground mb-3">
        <MapPin className="w-3 h-3 ml-1" />
        <span className="truncate">{screen.location || 'غير محدد'}</span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          screen.status === 'online' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
          {screen.status === 'online' ? 'متصل' : 'غير متصل'}
        </div>
        <Link 
          href={`/player/${screen.id}`} 
          className="text-primary hover:text-primary/80 text-xs font-medium flex items-center gap-1 hover:underline"
          target="_blank"
          data-testid={`link-player-${screen.id}`}
        >
          فتح المشغل <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}
