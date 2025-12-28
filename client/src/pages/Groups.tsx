import { useState } from "react";
import { useScreenGroups, useCreateScreenGroup, useDeleteScreenGroup } from "@/hooks/use-groups";
import { useScreens, useUpdateScreen } from "@/hooks/use-screens";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Layers, 
  Plus, 
  Trash2,
  Monitor,
  MoreVertical,
  X,
  Check
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function Groups() {
  const { data: groups = [], isLoading } = useScreenGroups();
  const { data: screens = [] } = useScreens();
  const createGroup = useCreateScreenGroup();
  const deleteGroup = useDeleteScreenGroup();
  const updateScreen = useUpdateScreen();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [manageGroupId, setManageGroupId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createGroup.mutateAsync(form);
    setIsOpen(false);
    setForm({ name: "", description: "" });
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه المجموعة؟");
    if (confirmed) {
      await deleteGroup.mutateAsync(id);
    }
  };

  const handleToggleScreen = async (screenId: number, currentGroupId: number | null, targetGroupId: number) => {
    const newGroupId = currentGroupId === targetGroupId ? null : targetGroupId;
    await updateScreen.mutateAsync({ id: screenId, data: { groupId: newGroupId } });
    toast({
      title: newGroupId ? "تمت الإضافة" : "تمت الإزالة",
      description: newGroupId ? "تمت إضافة الشاشة للمجموعة" : "تمت إزالة الشاشة من المجموعة",
    });
  };

  const manageGroup = groups.find(g => g.id === manageGroupId);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">المجموعات</h1>
            <p className="text-muted-foreground mt-1">تنظيم الشاشات في مجموعات لتسهيل جدولة المحتوى</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary rounded-xl px-6" data-testid="button-add-group">
                <Plus className="w-5 h-5" />
                <span>مجموعة جديدة</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء مجموعة جديدة</DialogTitle>
                <DialogDescription>أدخل اسم ووصف المجموعة</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>اسم المجموعة</Label>
                  <Input 
                    value={form.name} 
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    placeholder="مثال: فرع الرياض"
                    required
                    className="rounded-xl"
                    data-testid="input-group-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوصف (اختياري)</Label>
                  <Input 
                    value={form.description} 
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    placeholder="وصف المجموعة"
                    className="rounded-xl"
                    data-testid="input-group-description"
                  />
                </div>
                <Button type="submit" disabled={createGroup.isPending} className="w-full bg-primary rounded-xl" data-testid="button-save-group">
                  {createGroup.isPending ? "جاري الحفظ..." : "حفظ المجموعة"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-40 bg-muted/20 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed border-border rounded-3xl">
            <div className="p-6 bg-background rounded-full shadow-sm mb-4">
              <Layers className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">لا توجد مجموعات</h3>
            <p className="text-muted-foreground mt-2 mb-6">أنشئ مجموعة لتنظيم الشاشات</p>
            <Button onClick={() => setIsOpen(true)} className="bg-primary rounded-xl" data-testid="button-create-first-group">
              إنشاء مجموعة جديدة
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {groups.map((group) => {
                const groupScreens = screens.filter(s => s.groupId === group.id);
                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card data-testid={`card-group-${group.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                              <Layers className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{group.name}</CardTitle>
                              {group.description && (
                                <p className="text-sm text-muted-foreground">{group.description}</p>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-group-menu-${group.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => setManageGroupId(group.id)}
                                data-testid={`button-manage-screens-${group.id}`}
                              >
                                <Monitor className="w-4 h-4 ml-2" />
                                إدارة الشاشات
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(group.id)}
                                className="text-destructive"
                                data-testid={`button-delete-group-${group.id}`}
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف المجموعة
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Monitor className="w-3 h-3" />
                            {groupScreens.length} شاشة
                          </Badge>
                        </div>
                        {groupScreens.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {groupScreens.map(screen => (
                              <div 
                                key={screen.id} 
                                className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded-md"
                              >
                                <Monitor className="w-3 h-3" />
                                <span>{screen.name}</span>
                                <button
                                  onClick={() => handleToggleScreen(screen.id, screen.groupId, group.id)}
                                  className="mr-1 text-muted-foreground hover:text-destructive"
                                  data-testid={`button-remove-screen-${screen.id}-from-group-${group.id}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full gap-2"
                          onClick={() => setManageGroupId(group.id)}
                          data-testid={`button-add-screens-to-group-${group.id}`}
                        >
                          <Plus className="w-4 h-4" />
                          إضافة شاشات
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Dialog open={!!manageGroupId} onOpenChange={(open) => !open && setManageGroupId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إدارة شاشات المجموعة</DialogTitle>
            <DialogDescription>
              {manageGroup?.name} - اختر الشاشات التي تريد إضافتها أو إزالتها
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto py-4">
            {screens.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد شاشات متاحة</p>
            ) : (
              screens.map(screen => {
                const isInGroup = screen.groupId === manageGroupId;
                const inOtherGroup = screen.groupId && screen.groupId !== manageGroupId;
                const otherGroupName = inOtherGroup ? groups.find(g => g.id === screen.groupId)?.name : null;
                
                return (
                  <div 
                    key={screen.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${isInGroup ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isInGroup}
                        onCheckedChange={() => manageGroupId && handleToggleScreen(screen.id, screen.groupId, manageGroupId)}
                        data-testid={`checkbox-screen-${screen.id}`}
                      />
                      <div>
                        <p className="font-medium">{screen.name}</p>
                        {screen.location && (
                          <p className="text-xs text-muted-foreground">{screen.location}</p>
                        )}
                        {otherGroupName && (
                          <p className="text-xs text-amber-600">في مجموعة: {otherGroupName}</p>
                        )}
                      </div>
                    </div>
                    {isInGroup && <Check className="w-4 h-4 text-primary" />}
                  </div>
                );
              })
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => setManageGroupId(null)}
            className="w-full"
            data-testid="button-close-manage-screens"
          >
            إغلاق
          </Button>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
