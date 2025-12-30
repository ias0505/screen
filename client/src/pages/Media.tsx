import { useState } from "react";
import { useMedia, useCreateMedia, useDeleteMedia } from "@/hooks/use-media";
import { useMediaGroups, useCreateMediaGroup } from "@/hooks/use-groups";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Film,
  Link as LinkIcon,
  Upload,
  Layers
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Media() {
  const { user } = useAuth();
  const { canAdd, canDelete } = usePermissions();
  const { data: media = [], isLoading } = useMedia();
  const { data: groups = [] } = useMediaGroups();
  const createMedia = useCreateMedia();
  const deleteMedia = useDeleteMedia();
  const createGroup = useCreateMediaGroup();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [newMedia, setNewMedia] = useState({ 
    title: "", 
    url: "", 
    type: "image" as "image" | "video",
    groupId: ""
  });
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setNewMedia({ 
        ...newMedia, 
        title: selectedFile.name.split('.')[0],
        type: selectedFile.type.startsWith('video') ? 'video' : 'image'
      });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    await createGroup.mutateAsync({
      name: newGroup.name,
      description: newGroup.description,
      userId: user.id,
    });
    setIsGroupOpen(false);
    setNewGroup({ name: "", description: "" });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsUploading(true);
    try {
      let finalUrl = newMedia.url;
      
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        finalUrl = data.url;
      }

      await createMedia.mutateAsync({
        title: newMedia.title,
        url: finalUrl,
        type: newMedia.type,
        duration: 10,
        groupId: newMedia.groupId ? parseInt(newMedia.groupId) : null,
        userId: user.id,
      });
      
      setIsOpen(false);
      setNewMedia({ title: "", url: "", type: "image", groupId: "" });
      setFile(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">مكتبة الوسائط</h1>
            <p className="text-muted-foreground mt-2">إدارة الصور والفيديوهات الإعلانية والمجموعات</p>
          </div>
          
          <div className="flex gap-2">
            {canAdd && (
              <Dialog open={isGroupOpen} onOpenChange={setIsGroupOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-xl">
                    <Layers className="w-5 h-5" />
                    <span>مجموعة جديدة</span>
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إنشاء مجموعة وسائط</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateGroup} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>اسم المجموعة</Label>
                    <Input 
                      value={newGroup.name} 
                      onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                      placeholder="مثال: إعلانات رمضان"
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Input 
                      value={newGroup.description} 
                      onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                      placeholder="وصف اختياري للمجموعة"
                      className="rounded-xl"
                    />
                  </div>
                  <Button type="submit" disabled={createGroup.isPending} className="w-full bg-primary rounded-xl">
                    {createGroup.isPending ? "جاري الحفظ..." : "حفظ المجموعة"}
                  </Button>
                </form>
              </DialogContent>
              </Dialog>
            )}

            {canAdd && (
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
                      <Label htmlFor="groupId">المجموعة</Label>
                      <Select 
                        value={newMedia.groupId} 
                        onValueChange={(v) => setNewMedia({...newMedia, groupId: v})}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="اختر مجموعة (اختياري)" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map(g => (
                            <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file">رفع ملف من الجهاز</Label>
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/50 transition-colors bg-muted/5 relative">
                        <input
                          id="file"
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {file ? file.name : "اضغط هنا أو اسحب الملف للرفع"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="url">أو رابط الملف (URL)</Label>
                      <div className="relative">
                        <LinkIcon className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="url"
                          value={newMedia.url}
                          onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                          placeholder={newMedia.type === 'image' ? "https://images.unsplash.com/..." : "https://example.com/video.mp4"}
                          className="rounded-xl pr-10"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">إلغاء</Button>
                      <Button type="submit" disabled={createMedia.isPending || isUploading} className="bg-primary hover:bg-primary/90 rounded-xl">
                        {isUploading ? "جاري الرفع..." : createMedia.isPending ? "جاري الحفظ..." : "حفظ المحتوى"}
                      </Button>
                    </div>
                  </form>
                </Tabs>
              </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {isLoading ? (
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {[1, 2, 3, 4].map((n) => (
               <div key={n} className="aspect-square bg-muted/20 animate-pulse rounded-2xl" />
             ))}
           </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl mb-6 overflow-x-auto">
              <TabsTrigger value="all" className="rounded-lg">الكل</TabsTrigger>
              {groups.map(group => (
                <TabsTrigger key={group.id} value={`group-${group.id}`} className="rounded-lg">
                  {group.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <AnimatePresence>
                  {media.map((item) => (
                    <MediaCard key={item.id} item={item} onDelete={() => deleteMedia.mutate(item.id)} canDelete={canDelete} />
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>

            {groups.map(group => (
              <TabsContent key={group.id} value={`group-${group.id}`}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {media.filter(m => m.groupId === group.id).map((item) => (
                    <MediaCard key={item.id} item={item} onDelete={() => deleteMedia.mutate(item.id)} canDelete={canDelete} />
                  ))}
                  {media.filter(m => m.groupId === group.id).length === 0 && (
                    <div className="col-span-full py-10 text-center text-muted-foreground">
                      لا يوجد محتوى في هذه المجموعة
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}

            {media.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground bg-muted/10 border-2 border-dashed border-border rounded-3xl">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لم يتم رفع أي محتوى بعد</p>
              </div>
            )}
          </Tabs>
        )}
      </div>
    </Layout>
  );
}

function MediaCard({ item, onDelete, canDelete }: { item: any, onDelete: () => void, canDelete: boolean }) {
  return (
    <motion.div
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
        {canDelete && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
            <Button 
              variant="destructive" 
              size="icon" 
              onClick={onDelete}
              className="rounded-full shadow-lg"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
      
      <div className="p-3 bg-card border-t border-border/50">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate text-sm" title={item.title}>{item.title}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
            {item.type === 'image' ? 'صورة' : 'فيديو'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
