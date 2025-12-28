import { useState } from "react";
import { useScreens, useScreenSchedules, useCreateSchedule, useDeleteSchedule } from "@/hooks/use-screens";
import { useMedia } from "@/hooks/use-media";
import Layout from "@/components/Layout";
import { 
  CalendarClock, 
  Monitor, 
  Play, 
  Trash2, 
  Plus,
  Clock,
  ArrowRight
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function Schedule() {
  const { data: screens = [] } = useScreens();
  const [selectedScreenId, setSelectedScreenId] = useState<string>("");
  
  // Convert string to number safely, handle empty string
  const screenIdNum = selectedScreenId ? parseInt(selectedScreenId) : 0;
  
  const { data: schedules = [], isLoading: loadingSchedules } = useScreenSchedules(screenIdNum);
  const { data: media = [] } = useMedia();
  
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string>("");

  const handleAddSchedule = async () => {
    if (!selectedScreenId || !selectedMediaId) return;
    
    await createSchedule.mutateAsync({
      screenId: parseInt(selectedScreenId),
      mediaItemId: parseInt(selectedMediaId),
      priority: 1,
      isActive: true
    });
    
    setIsAddOpen(false);
    setSelectedMediaId("");
  };

  return (
    <Layout>
      <div className="space-y-8 h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">جدولة المحتوى</h1>
            <p className="text-muted-foreground mt-2">نظم ظهور الإعلانات على شاشاتك</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedScreenId} onValueChange={setSelectedScreenId}>
              <SelectTrigger className="w-[250px] rounded-xl bg-card">
                <SelectValue placeholder="اختر الشاشة..." />
              </SelectTrigger>
              <SelectContent>
                {screens.map((screen) => (
                  <SelectItem key={screen.id} value={screen.id.toString()}>
                    {screen.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button 
                  disabled={!selectedScreenId}
                  className="gap-2 bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25"
                >
                  <Plus className="w-5 h-5" />
                  <span>إضافة للجدول</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>اختر محتوى للإضافة</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4 max-h-[400px] overflow-y-auto">
                  {media.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedMediaId(item.id.toString())}
                      className={`
                        cursor-pointer rounded-xl border-2 overflow-hidden transition-all
                        ${selectedMediaId === item.id.toString() ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}
                      `}
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
                  {media.length === 0 && (
                     <div className="col-span-2 text-center text-muted-foreground py-8">
                       لا يوجد محتوى في المكتبة.
                     </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">إلغاء</Button>
                  <Button 
                    onClick={handleAddSchedule} 
                    disabled={!selectedMediaId || createSchedule.isPending}
                    className="bg-primary rounded-xl"
                  >
                    إضافة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedScreenId ? (
          <div className="flex flex-col items-center justify-center h-[500px] bg-muted/10 rounded-3xl border-2 border-dashed border-border text-center p-8">
            <Monitor className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground">لم يتم اختيار شاشة</h3>
            <p className="text-muted-foreground mt-2">اختر شاشة من القائمة أعلاه لعرض وتعديل جدولها</p>
          </div>
        ) : (
          <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                قائمة التشغيل الحالية
              </h3>
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {schedules.length} عناصر
              </span>
            </div>
            
            {loadingSchedules ? (
               <div className="p-8 flex justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
               </div>
            ) : schedules.length > 0 ? (
              <div className="divide-y divide-border/50">
                {schedules.map((schedule, index) => (
                  <div key={schedule.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {index + 1}
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
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           {schedule.mediaItem.duration} ثانية
                        </span>
                        <span>
                           أضيف: {format(new Date(schedule.createdAt!), "d MMMM yyyy", { locale: ar })}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteSchedule.mutate({ id: schedule.id, screenId: parseInt(selectedScreenId) })}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <p>الجدول فارغ لهذه الشاشة</p>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsAddOpen(true)}
                  className="mt-2 text-primary"
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
