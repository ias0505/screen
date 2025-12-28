import { useState } from "react";
import { useScreens, useCreateScreen, useDeleteScreen } from "@/hooks/use-screens";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Monitor, 
  Plus, 
  MapPin, 
  Trash2, 
  ExternalLink,
  MoreVertical
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

export default function Screens() {
  const { user } = useAuth();
  const { data: screens = [], isLoading } = useScreens();
  const createScreen = useCreateScreen();
  const deleteScreen = useDeleteScreen();
  
  const [isOpen, setIsOpen] = useState(false);
  const [newScreen, setNewScreen] = useState({ name: "", location: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    await createScreen.mutateAsync({
      name: newScreen.name,
      location: newScreen.location,
      userId: parseInt(user.id), // Ensure correct type
    });
    setIsOpen(false);
    setNewScreen({ name: "", location: "" });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الشاشات</h1>
            <p className="text-muted-foreground mt-2">تحكم في شاشات العرض الخاصة بك</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-xl px-6">
                <Plus className="w-5 h-5" />
                <span>إضافة شاشة</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>إضافة شاشة جديدة</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم الشاشة</Label>
                  <Input
                    id="name"
                    value={newScreen.name}
                    onChange={(e) => setNewScreen({ ...newScreen, name: e.target.value })}
                    placeholder="مثال: شاشة الاستقبال الرئيسية"
                    required
                    className="rounded-xl"
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
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">إلغاء</Button>
                  <Button type="submit" disabled={createScreen.isPending} className="bg-primary hover:bg-primary/90 rounded-xl">
                    {createScreen.isPending ? "جاري الإضافة..." : "حفظ الشاشة"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[1, 2, 3].map((n) => (
               <div key={n} className="h-48 bg-muted/20 animate-pulse rounded-2xl" />
             ))}
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {screens.map((screen) => (
                <motion.div
                  key={screen.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group bg-card hover:border-primary/50 border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => deleteScreen.mutate(screen.id)}>
                          <Trash2 className="w-4 h-4 ml-2" />
                          حذف الشاشة
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-1 truncate">{screen.name}</h3>
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4 ml-1" />
                    <span className="truncate">{screen.location || 'غير محدد'}</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                      screen.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                      {screen.status === 'online' ? 'متصل' : 'غير متصل'}
                    </div>
                    <Link 
                      href={`/player/${screen.id}`} 
                      className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 hover:underline"
                      target="_blank"
                    >
                      فتح المشغل <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {screens.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed border-border rounded-3xl">
                <div className="p-6 bg-background rounded-full shadow-sm mb-4">
                  <Monitor className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground">لا توجد شاشات</h3>
                <p className="text-muted-foreground mt-2 mb-6">قم بإضافة شاشتك الأولى للبدء في عرض المحتوى</p>
                <Button onClick={() => setIsOpen(true)} className="bg-primary text-primary-foreground rounded-xl">
                  إضافة شاشة جديدة
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
