import { useState, useCallback } from "react";
import { useScreens, useScreenSchedules, useCreateSchedule, useDeleteSchedule, useUpdateSchedule, useReorderSchedules } from "@/hooks/use-screens";
import { useScreenGroups, useGroupSchedules, useCreateGroupSchedule, useDeleteGroupSchedule, useMediaGroups } from "@/hooks/use-groups";
import { useMedia } from "@/hooks/use-media";
import Layout from "@/components/Layout";
import { 
  CalendarClock, 
  Monitor, 
  Play, 
  Trash2, 
  Plus,
  Clock,
  ArrowRight,
  Layers,
  GripVertical,
  Check,
  Pencil
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface ScheduleItem {
  id: number;
  duration: number | null;
  displayOrder: number | null;
  createdAt: string | null;
  mediaItem: {
    id: number;
    title: string;
    type: string;
    url: string;
    duration: number | null;
  };
}

export default function Schedule() {
  const { data: screens = [] } = useScreens();
  const { data: groups = [] } = useScreenGroups();
  const { data: media = [] } = useMedia();
  const { data: mediaGroups = [] } = useMediaGroups();
  const { toast } = useToast();
  
  const [scheduleType, setScheduleType] = useState<"screen" | "group">("screen");
  const [selectedScreenId, setSelectedScreenId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  
  const screenIdNum = selectedScreenId ? parseInt(selectedScreenId) : 0;
  const groupIdNum = selectedGroupId ? parseInt(selectedGroupId) : 0;
  
  const { data: screenSchedules = [], isLoading: loadingScreenSchedules } = useScreenSchedules(screenIdNum);
  const { data: groupSchedules = [], isLoading: loadingGroupSchedules } = useGroupSchedules(groupIdNum);
  
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const createGroupSchedule = useCreateGroupSchedule();
  const deleteGroupSchedule = useDeleteGroupSchedule();
  const updateSchedule = useUpdateSchedule();
  const reorderSchedules = useReorderSchedules();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string>("");
  const [newItemDuration, setNewItemDuration] = useState<string>("10");
  const [editingDuration, setEditingDuration] = useState<{ id: number; value: string } | null>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [localSchedules, setLocalSchedules] = useState<ScheduleItem[]>([]);
  const [mediaGroupFilter, setMediaGroupFilter] = useState<string>("all");

  const ungroupedScreens = screens.filter(s => !s.groupId);
  
  const rawSchedules = scheduleType === "screen" ? screenSchedules : groupSchedules;
  const schedules: ScheduleItem[] = localSchedules.length > 0 ? localSchedules : (rawSchedules as ScheduleItem[]);
  const isLoading = scheduleType === "screen" ? loadingScreenSchedules : loadingGroupSchedules;
  const hasSelection = scheduleType === "screen" ? !!selectedScreenId : !!selectedGroupId;

  const handleAddSchedule = async () => {
    if (!selectedMediaId) return;
    
    const duration = parseInt(newItemDuration) || 10;
    
    if (scheduleType === "screen" && selectedScreenId) {
      await createSchedule.mutateAsync({
        screenId: parseInt(selectedScreenId),
        mediaItemId: parseInt(selectedMediaId),
        priority: 1,
        isActive: true,
        duration
      });
    } else if (scheduleType === "group" && selectedGroupId) {
      await createGroupSchedule.mutateAsync({
        screenGroupId: parseInt(selectedGroupId),
        mediaItemId: parseInt(selectedMediaId),
        priority: 1,
        isActive: true,
        duration
      });
    }
    
    setIsAddOpen(false);
    setSelectedMediaId("");
    setNewItemDuration("10");
    setLocalSchedules([]);
  };

  const handleDeleteSchedule = (scheduleId: number) => {
    if (scheduleType === "screen") {
      deleteSchedule.mutate({ id: scheduleId, screenId: parseInt(selectedScreenId) });
    } else {
      deleteGroupSchedule.mutate({ id: scheduleId, groupId: parseInt(selectedGroupId) });
    }
    setLocalSchedules([]);
  };

  const handleTypeChange = (value: string) => {
    setScheduleType(value as "screen" | "group");
    setSelectedScreenId("");
    setSelectedGroupId("");
    setLocalSchedules([]);
  };

  const handleDurationEdit = (scheduleId: number, currentDuration: number) => {
    setEditingDuration({ id: scheduleId, value: currentDuration.toString() });
  };

  const handleDurationSave = async () => {
    if (!editingDuration) return;
    const newDuration = parseInt(editingDuration.value);
    if (isNaN(newDuration) || newDuration < 1) {
      toast({ title: "خطأ", description: "المدة يجب أن تكون رقم أكبر من صفر", variant: "destructive" });
      return;
    }
    
    await updateSchedule.mutateAsync({ 
      id: editingDuration.id, 
      duration: newDuration,
      screenId: scheduleType === "screen" ? parseInt(selectedScreenId) : undefined,
      groupId: scheduleType === "group" ? parseInt(selectedGroupId) : undefined
    });
    setEditingDuration(null);
    setLocalSchedules([]);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    
    const newSchedules = [...schedules];
    const draggedSchedule = newSchedules[draggedItem];
    newSchedules.splice(draggedItem, 1);
    newSchedules.splice(index, 0, draggedSchedule);
    
    setLocalSchedules(newSchedules);
    setDraggedItem(index);
  };

  const handleDragEnd = async () => {
    if (localSchedules.length > 0) {
      const updates = localSchedules.map((schedule, index) => ({
        id: schedule.id,
        displayOrder: index
      }));
      
      await reorderSchedules.mutateAsync({
        updates,
        screenId: scheduleType === "screen" ? parseInt(selectedScreenId) : undefined,
        groupId: scheduleType === "group" ? parseInt(selectedGroupId) : undefined,
      });
      
      toast({ title: "تم الحفظ", description: "تم إعادة ترتيب العناصر" });
    }
    setDraggedItem(null);
  };

  const getScheduleDuration = (schedule: ScheduleItem) => {
    return schedule.duration || schedule.mediaItem.duration || 10;
  };

  return (
    <Layout>
      <div className="space-y-8 h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">جدولة المحتوى</h1>
            <p className="text-muted-foreground mt-2">نظم ظهور الإعلانات على شاشاتك ومجموعاتك</p>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <Tabs value={scheduleType} onValueChange={handleTypeChange}>
              <TabsList className="rounded-xl">
                <TabsTrigger value="screen" className="gap-2 rounded-lg" data-testid="tab-screens">
                  <Monitor className="w-4 h-4" />
                  شاشات
                </TabsTrigger>
                <TabsTrigger value="group" className="gap-2 rounded-lg" data-testid="tab-groups">
                  <Layers className="w-4 h-4" />
                  مجموعات
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {scheduleType === "screen" ? (
              <Select value={selectedScreenId} onValueChange={(v) => { setSelectedScreenId(v); setLocalSchedules([]); }}>
                <SelectTrigger className="w-[250px] rounded-xl bg-card" data-testid="select-screen">
                  <SelectValue placeholder="اختر الشاشة..." />
                </SelectTrigger>
                <SelectContent>
                  {ungroupedScreens.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      لا توجد شاشات غير مرتبطة بمجموعات
                    </div>
                  ) : (
                    ungroupedScreens.map((screen) => (
                      <SelectItem key={screen.id} value={screen.id.toString()}>
                        {screen.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Select value={selectedGroupId} onValueChange={(v) => { setSelectedGroupId(v); setLocalSchedules([]); }}>
                <SelectTrigger className="w-[250px] rounded-xl bg-card" data-testid="select-group">
                  <SelectValue placeholder="اختر المجموعة..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      لا توجد مجموعات
                    </div>
                  ) : (
                    groups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button 
                  disabled={!hasSelection}
                  className="gap-2 bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25"
                  data-testid="button-add-schedule"
                >
                  <Plus className="w-5 h-5" />
                  <span>إضافة للجدول</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>اختر محتوى للإضافة</DialogTitle>
                  <DialogDescription>
                    اختر المحتوى الذي تريد إضافته إلى {scheduleType === "screen" ? "الشاشة" : "المجموعة"}
                  </DialogDescription>
                </DialogHeader>
                
                {/* فلترة حسب مجموعة المحتوى */}
                <div className="flex items-center gap-2 py-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <Select value={mediaGroupFilter} onValueChange={setMediaGroupFilter}>
                    <SelectTrigger className="flex-1 rounded-xl" data-testid="select-media-group-filter">
                      <SelectValue placeholder="جميع المجموعات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المجموعات</SelectItem>
                      <SelectItem value="ungrouped">بدون مجموعة</SelectItem>
                      {mediaGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-4 max-h-[400px] overflow-y-auto">
                  {media
                    .filter((item) => {
                      if (mediaGroupFilter === "all") return true;
                      if (mediaGroupFilter === "ungrouped") return !item.groupId;
                      return item.groupId?.toString() === mediaGroupFilter;
                    })
                    .map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedMediaId(item.id.toString())}
                      className={`
                        cursor-pointer rounded-xl border-2 overflow-hidden transition-all
                        ${selectedMediaId === item.id.toString() ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}
                      `}
                      data-testid={`media-item-${item.id}`}
                    >
                      <div className="aspect-video bg-muted relative">
                        {item.type === 'image' ? (
                          <img src={item.url} className="w-full h-full object-cover" alt={item.title} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900">
                             <Play className="w-8 h-8 text-white" />
                          </div>
                        )}
                        {selectedMediaId === item.id.toString() && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-white rounded-full p-1">
                              <Plus className="w-6 h-6" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-sm font-medium text-center truncate">{item.title}</div>
                    </div>
                  ))}
                  {media.filter((item) => {
                      if (mediaGroupFilter === "all") return true;
                      if (mediaGroupFilter === "ungrouped") return !item.groupId;
                      return item.groupId?.toString() === mediaGroupFilter;
                    }).length === 0 && (
                     <div className="col-span-2 text-center text-muted-foreground py-8">
                       {media.length === 0 ? "لا يوجد محتوى في المكتبة." : "لا يوجد محتوى في هذه المجموعة."}
                     </div>
                  )}
                </div>
                {selectedMediaId && (
                  <div className="flex items-center gap-3 py-2 px-3 bg-muted/50 rounded-xl">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">مدة العرض:</span>
                    <Input
                      type="number"
                      min="1"
                      value={newItemDuration}
                      onChange={(e) => setNewItemDuration(e.target.value)}
                      className="w-20 h-8"
                      data-testid="input-new-duration"
                    />
                    <span className="text-sm text-muted-foreground">ثانية</span>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">إلغاء</Button>
                  <Button 
                    onClick={handleAddSchedule} 
                    disabled={!selectedMediaId || createSchedule.isPending || createGroupSchedule.isPending}
                    className="bg-primary rounded-xl"
                    data-testid="button-confirm-add"
                  >
                    إضافة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!hasSelection ? (
          <div className="flex flex-col items-center justify-center h-[500px] bg-muted/10 rounded-3xl border-2 border-dashed border-border text-center p-8">
            {scheduleType === "screen" ? (
              <>
                <Monitor className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold text-muted-foreground">لم يتم اختيار شاشة</h3>
                <p className="text-muted-foreground mt-2">اختر شاشة من القائمة أعلاه لعرض وتعديل جدولها</p>
                <p className="text-sm text-muted-foreground mt-1">الشاشات المرتبطة بمجموعات تُجدول من خلال مجموعتها</p>
              </>
            ) : (
              <>
                <Layers className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold text-muted-foreground">لم يتم اختيار مجموعة</h3>
                <p className="text-muted-foreground mt-2">اختر مجموعة من القائمة أعلاه لعرض وتعديل جدولها</p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border/50 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                قائمة التشغيل الحالية
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">اسحب العناصر لإعادة الترتيب</span>
                <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {schedules.length} عناصر
                </span>
              </div>
            </div>
            
            {isLoading ? (
               <div className="p-8 flex justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
               </div>
            ) : schedules.length > 0 ? (
              <div className="divide-y divide-border/50">
                {schedules.map((schedule, index) => (
                  <div 
                    key={schedule.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors group cursor-grab active:cursor-grabbing ${
                      draggedItem === index ? 'bg-primary/10' : ''
                    }`}
                    data-testid={`schedule-item-${schedule.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-5 h-5 text-muted-foreground/50" />
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                    </div>
                    <div className="w-24 h-16 rounded-lg bg-muted overflow-hidden border border-border flex-shrink-0">
                      {schedule.mediaItem.type === 'image' ? (
                        <img src={schedule.mediaItem.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{schedule.mediaItem.title}</h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        {editingDuration?.id === schedule.id ? (
                          <div className="flex items-center gap-2 bg-primary/10 px-2 py-1 rounded-lg">
                            <Input
                              type="number"
                              min="1"
                              value={editingDuration.value}
                              onChange={(e) => setEditingDuration({ ...editingDuration, value: e.target.value })}
                              className="w-20 h-7 text-xs"
                              data-testid={`input-duration-${schedule.id}`}
                            />
                            <span>ثانية</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={handleDurationSave}
                              data-testid={`button-save-duration-${schedule.id}`}
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">{getScheduleDuration(schedule)} ثانية</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6"
                              onClick={() => handleDurationEdit(schedule.id, getScheduleDuration(schedule))}
                              data-testid={`button-edit-duration-${schedule.id}`}
                            >
                              <Pencil className="w-3 h-3 text-primary" />
                            </Button>
                          </div>
                        )}
                        <span>
                           أضيف: {schedule.createdAt ? format(new Date(schedule.createdAt), "d MMMM yyyy", { locale: ar }) : '-'}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                      data-testid={`button-delete-schedule-${schedule.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <p>الجدول فارغ {scheduleType === "screen" ? "لهذه الشاشة" : "لهذه المجموعة"}</p>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsAddOpen(true)}
                  className="mt-2 text-primary"
                  data-testid="button-add-first-content"
                >
                  إضافة محتوى الآن <ArrowRight className="w-4 h-4 mr-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
