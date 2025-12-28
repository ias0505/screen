import { useState } from "react";
import { useMedia, useCreateMedia, useDeleteMedia } from "@/hooks/use-media";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Film,
  Link as LinkIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Media() {
  const { user } = useAuth();
  const { data: media = [], isLoading } = useMedia();
  const createMedia = useCreateMedia();
  const deleteMedia = useDeleteMedia();
  
  const [isOpen, setIsOpen] = useState(false);
  const [newMedia, setNewMedia] = useState({ 
    title: "", 
    url: "", 
    type: "image" as "image" | "video",
    duration: 10
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    await createMedia.mutateAsync({
      title: newMedia.title,
      url: newMedia.url,
      type: newMedia.type,
      duration: newMedia.type === 'video' ? 30 : newMedia.duration,
      userId: parseInt(user.id),
    });
    setIsOpen(false);
    setNewMedia({ title: "", url: "", type: "image", duration: 10 });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">مكتبة الوسائط</h1>
            <p className="text-muted-foreground mt-2">إدارة الصور والفيديوهات الإعلانية</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-xl px-6">
                <Plus className="w-5 h-5" />
                <span>رفع محتوى</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>إضافة محتوى جديد</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="image" className="w-full pt-4" onValueChange={(v) => setNewMedia({...newMedia, type: v as any})}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="image">صورة</TabsTrigger>
                  <TabsTrigger value="video">فيديو</TabsTrigger>
                </TabsList>
                
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">عنوان المحتوى</Label>
                    <Input
                      id="title"
                      value={newMedia.title}
                      onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                      placeholder="مثال: إعلان الصيف"
                      required
                      className="rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="url">رابط الملف (URL)</Label>
                    <div className="relative">
                      <LinkIcon className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="url"
                        value={newMedia.url}
                        onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                        placeholder={newMedia.type === 'image' ? "https://images.unsplash.com/..." : "https://example.com/video.mp4"}
                        required
                        className="rounded-xl pr-10"
                        dir="ltr"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">للتجربة، استخدم روابط Unsplash للصور.</p>
                  </div>

                  {newMedia.type === 'image' && (
                    <div className="space-y-2">
                      <Label htmlFor="duration">مدة العرض (ثواني)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min={1}
                        value={newMedia.duration}
                        onChange={(e) => setNewMedia({ ...newMedia, duration: parseInt(e.target.value) })}
                        className="rounded-xl"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">إلغاء</Button>
                    <Button type="submit" disabled={createMedia.isPending} className="bg-primary hover:bg-primary/90 rounded-xl">
                      {createMedia.isPending ? "جاري الحفظ..." : "حفظ المحتوى"}
                    </Button>
                  </div>
                </form>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {[1, 2, 3, 4].map((n) => (
               <div key={n} className="aspect-square bg-muted/20 animate-pulse rounded-2xl" />
             ))}
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {media.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 aspect-square flex flex-col"
                >
                  <div className="flex-1 relative overflow-hidden bg-black/5">
                    {item.type === 'image' ? (
                      <img 
                        src={item.url} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60"; // Fallback abstract image
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <Film className="w-12 h-12 text-slate-500 group-hover:text-primary transition-colors" />
                      </div>
                    )}
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => deleteMedia.mutate(item.id)}
                        className="rounded-full shadow-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-card border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate text-sm" title={item.title}>{item.title}</h3>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {item.type === 'image' ? `${item.duration}s` : 'فيديو'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {media.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground bg-muted/10 border-2 border-dashed border-border rounded-3xl">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لم يتم رفع أي محتوى بعد</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
