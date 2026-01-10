import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Bell, ArrowRight, Plus, Pencil, Trash2, CheckCircle, XCircle, Image, Users, Upload, Link as LinkIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PopupNotification {
  id: number;
  title: string;
  message: string | null;
  imageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  targetUsers: string;
  isActive: boolean | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export default function AdminPopups() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<PopupNotification | null>(null);
  const [imageUploadType, setImageUploadType] = useState<"url" | "file">("file");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    imageUrl: "",
    buttonText: "",
    buttonUrl: "",
    targetUsers: "all" as "all" | "active" | "expired",
    isActive: true,
    startDate: "",
    endDate: ""
  });

  const { data: popups, isLoading } = useQuery<PopupNotification[]>({
    queryKey: ['/api/admin/popups'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/popups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/popups'] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: language === 'ar' ? "تم إنشاء الإشعار المنبثق بنجاح" : "Popup notification created successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await apiRequest('PATCH', `/api/admin/popups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/popups'] });
      setEditingPopup(null);
      resetForm();
      toast({ title: language === 'ar' ? "تم تحديث الإشعار المنبثق بنجاح" : "Popup notification updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/popups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/popups'] });
      toast({ title: language === 'ar' ? "تم حذف الإشعار المنبثق بنجاح" : "Popup notification deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      imageUrl: "",
      buttonText: "",
      buttonUrl: "",
      targetUsers: "all",
      isActive: true,
      startDate: "",
      endDate: ""
    });
    setImageUploadType("file");
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('title', file.name);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('فشل رفع الصورة');
      }
      
      const data = await response.json();
      setFormData({ ...formData, imageUrl: data.url });
      toast({ title: language === 'ar' ? "تم رفع الصورة بنجاح" : "Image uploaded successfully" });
    } catch (error) {
      toast({ 
        title: language === 'ar' ? "خطأ في رفع الصورة" : "Error uploading image", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openEdit = (popup: PopupNotification) => {
    setEditingPopup(popup);
    setFormData({
      title: popup.title,
      message: popup.message || "",
      imageUrl: popup.imageUrl || "",
      buttonText: popup.buttonText || "",
      buttonUrl: popup.buttonUrl || "",
      targetUsers: popup.targetUsers as "all" | "active" | "expired",
      isActive: popup.isActive !== false,
      startDate: popup.startDate ? popup.startDate.split('T')[0] : "",
      endDate: popup.endDate ? popup.endDate.split('T')[0] : ""
    });
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      message: formData.message || null,
      imageUrl: formData.imageUrl || null,
      buttonText: formData.buttonText || null,
      buttonUrl: formData.buttonUrl || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null
    };

    if (editingPopup) {
      updateMutation.mutate({ id: editingPopup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPopupExpired = (popup: PopupNotification) => {
    if (!popup.endDate) return false;
    return new Date(popup.endDate) < new Date();
  };

  const isPopupScheduled = (popup: PopupNotification) => {
    if (!popup.startDate) return false;
    return new Date(popup.startDate) > new Date();
  };

  const activeCount = popups?.filter(p => p.isActive && !isPopupExpired(p) && !isPopupScheduled(p)).length || 0;
  const scheduledCount = popups?.filter(p => p.isActive && isPopupScheduled(p)).length || 0;
  const expiredCount = popups?.filter(p => isPopupExpired(p)).length || 0;

  const dateLocale = language === 'ar' ? ar : enUS;

  const getTargetUsersLabel = (target: string) => {
    switch (target) {
      case 'all':
        return language === 'ar' ? 'جميع المستخدمين' : 'All Users';
      case 'active':
        return language === 'ar' ? 'المشتركين النشطين' : 'Active Subscribers';
      case 'expired':
        return language === 'ar' ? 'المشتركين المنتهين' : 'Expired Subscribers';
      default:
        return target;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            {language === 'ar' ? "الإشعارات المنبثقة" : "Popup Notifications"}
          </h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-popup">
          <Plus className="w-4 h-4 ml-2" />
          {language === 'ar' ? "إضافة إشعار" : "Add Popup"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "إجمالي الإشعارات" : "Total Popups"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{popups?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "الإشعارات النشطة" : "Active Popups"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "المجدولة" : "Scheduled"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "المنتهية" : "Expired"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{expiredCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : popups?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === 'ar' ? "لا توجد إشعارات منبثقة" : "No popup notifications"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? "العنوان" : "Title"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الفئة المستهدفة" : "Target Users"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "النوع" : "Type"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الفترة" : "Period"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popups?.map(popup => (
                  <TableRow key={popup.id} data-testid={`row-popup-${popup.id}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{popup.title}</span>
                        {popup.message && (
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {popup.message}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Users className="w-3 h-3" />
                        {getTargetUsersLabel(popup.targetUsers)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {popup.imageUrl ? (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Image className="w-3 h-3" />
                          {language === 'ar' ? "صورة" : "Image"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit">
                          {language === 'ar' ? "نص" : "Text"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        {popup.startDate && (
                          <span>
                            {language === 'ar' ? 'من' : 'From'}: {format(new Date(popup.startDate), "d MMM yyyy", { locale: dateLocale })}
                          </span>
                        )}
                        {popup.endDate ? (
                          <span className={isPopupExpired(popup) ? "text-red-500" : ""}>
                            {language === 'ar' ? 'إلى' : 'To'}: {format(new Date(popup.endDate), "d MMM yyyy", { locale: dateLocale })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {language === 'ar' ? "دائم" : "No End Date"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {!popup.isActive ? (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 ml-1" />
                          {language === 'ar' ? "غير نشط" : "Inactive"}
                        </Badge>
                      ) : isPopupExpired(popup) ? (
                        <Badge variant="destructive">{language === 'ar' ? "منتهي" : "Expired"}</Badge>
                      ) : isPopupScheduled(popup) ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {language === 'ar' ? "مجدول" : "Scheduled"}
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          {language === 'ar' ? "نشط" : "Active"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(popup)}
                          data-testid={`button-edit-popup-${popup.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(popup.id)}
                          data-testid={`button-delete-popup-${popup.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen || !!editingPopup} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingPopup(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPopup 
                ? (language === 'ar' ? "تعديل الإشعار المنبثق" : "Edit Popup Notification")
                : (language === 'ar' ? "إضافة إشعار منبثق جديد" : "Add New Popup Notification")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{language === 'ar' ? "العنوان" : "Title"} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={language === 'ar' ? "عنوان الإشعار..." : "Popup title..."}
                data-testid="input-popup-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{language === 'ar' ? "الرسالة" : "Message"}</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={language === 'ar' ? "نص الرسالة..." : "Message text..."}
                rows={3}
                data-testid="input-popup-message"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? "الصورة" : "Image"}</Label>
              <Tabs value={imageUploadType} onValueChange={(v) => setImageUploadType(v as "url" | "file")}>
                <TabsList className="w-full">
                  <TabsTrigger value="file" className="flex-1 gap-1">
                    <Upload className="w-4 h-4" />
                    {language === 'ar' ? "رفع صورة" : "Upload"}
                  </TabsTrigger>
                  <TabsTrigger value="url" className="flex-1 gap-1">
                    <LinkIcon className="w-4 h-4" />
                    {language === 'ar' ? "رابط" : "URL"}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="file" className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  <div 
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{language === 'ar' ? "جاري الرفع..." : "Uploading..."}</span>
                      </div>
                    ) : formData.imageUrl && !formData.imageUrl.startsWith("http") ? (
                      <div className="space-y-2">
                        <img src={formData.imageUrl} alt="Preview" className="max-h-32 mx-auto rounded" />
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? "اضغط لتغيير الصورة" : "Click to change image"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? "اضغط لاختيار صورة من جهازك" : "Click to select an image"}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="url" className="mt-2">
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    data-testid="input-popup-image-url"
                  />
                </TabsContent>
              </Tabs>
              {formData.imageUrl && formData.imageUrl.startsWith("http") && (
                <div className="mt-2">
                  <img src={formData.imageUrl} alt="Preview" className="max-h-32 rounded" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buttonText">{language === 'ar' ? "نص الزر" : "Button Text"}</Label>
                <Input
                  id="buttonText"
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                  placeholder={language === 'ar' ? "اضغط هنا" : "Click here"}
                  data-testid="input-popup-button-text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buttonUrl">{language === 'ar' ? "رابط الزر" : "Button URL"}</Label>
                <Input
                  id="buttonUrl"
                  value={formData.buttonUrl}
                  onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                  placeholder="https://..."
                  data-testid="input-popup-button-url"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetUsers">{language === 'ar' ? "الفئة المستهدفة" : "Target Users"}</Label>
              <Select
                value={formData.targetUsers}
                onValueChange={(value) => setFormData({ ...formData, targetUsers: value as "all" | "active" | "expired" })}
              >
                <SelectTrigger data-testid="select-target-users">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? "جميع المستخدمين" : "All Users"}</SelectItem>
                  <SelectItem value="active">{language === 'ar' ? "المشتركين النشطين" : "Active Subscribers"}</SelectItem>
                  <SelectItem value="expired">{language === 'ar' ? "المشتركين المنتهين" : "Expired Subscribers"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">{language === 'ar' ? "تاريخ البداية" : "Start Date"}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  data-testid="input-popup-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{language === 'ar' ? "تاريخ الانتهاء" : "End Date"}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  data-testid="input-popup-end-date"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-popup-active"
              />
              <Label htmlFor="isActive">{language === 'ar' ? "نشط" : "Active"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-popup"
            >
              {createMutation.isPending || updateMutation.isPending 
                ? (language === 'ar' ? "جاري الحفظ..." : "Saving...")
                : editingPopup 
                  ? (language === 'ar' ? "حفظ التغييرات" : "Save Changes")
                  : (language === 'ar' ? "إنشاء الإشعار" : "Create Popup")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
