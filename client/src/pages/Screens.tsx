import { useState } from "react";
import { useScreens, useCreateScreen, useDeleteScreen } from "@/hooks/use-screens";
import { useScreenGroups } from "@/hooks/use-groups";
import { useAvailableSlots } from "@/hooks/use-subscriptions";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Monitor, 
  Plus, 
  MapPin, 
  Trash2, 
  ExternalLink,
  MoreVertical,
  Layers,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Screens() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: screens = [], isLoading } = useScreens();
  const { data: groups = [] } = useScreenGroups();
  const { data: slotsData } = useAvailableSlots();
  const createScreen = useCreateScreen();
  const deleteScreen = useDeleteScreen();
  
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", groupId: "" });

  const availableSlots = slotsData?.availableSlots || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await createScreen.mutateAsync({
        name: form.name,
        location: form.location,
        groupId: form.groupId ? parseInt(form.groupId) : undefined,
        userId: user.id,
      });
      setIsOpen(false);
      setForm({ name: "", location: "", groupId: "" });
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
                    <Label>المجموعة (اختياري)</Label>
                    <Select 
                      value={form.groupId} 
                      onValueChange={(v) => setForm({...form, groupId: v})}
                    >
                      <SelectTrigger className="rounded-xl" data-testid="select-screen-group">
                        <SelectValue placeholder="بدون مجموعة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">بدون مجموعة</SelectItem>
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
      </div>
    </Layout>
  );
}
