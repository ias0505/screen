import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Mail, ArrowRight, Plus, Pencil, Trash2, Send, Clock, CheckCircle, XCircle, AlertCircle, ImagePlus, Copy, X, CopyPlus } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmailCampaign {
  id: number;
  subject: string;
  content: string;
  targetUsers: string;
  status: string;
  sentCount: number | null;
  sentAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export default function AdminEmailCampaigns() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [formData, setFormData] = useState({
    subject: "",
    content: "",
    targetUsers: "all",
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: campaigns, isLoading } = useQuery<EmailCampaign[]>({
    queryKey: ['/api/admin/email-campaigns'],
  });

  interface TargetGroup {
    id: number;
    name: string;
  }

  const { data: targetGroups } = useQuery<TargetGroup[]>({
    queryKey: ['/api/admin/target-groups'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/email-campaigns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-campaigns'] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: language === 'ar' ? "تم إنشاء الحملة بنجاح" : "Campaign created successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await apiRequest('PATCH', `/api/admin/email-campaigns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-campaigns'] });
      setEditingCampaign(null);
      resetForm();
      toast({ title: language === 'ar' ? "تم تحديث الحملة بنجاح" : "Campaign updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/email-campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-campaigns'] });
      toast({ title: language === 'ar' ? "تم حذف الحملة بنجاح" : "Campaign deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/admin/email-campaigns/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-campaigns'] });
      toast({ title: language === 'ar' ? "تم إرسال الحملة بنجاح" : "Campaign sent successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      subject: "",
      content: "",
      targetUsers: "all",
    });
    setUploadedImages([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', files[0]);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname.includes('replit')
        ? window.location.origin
        : 'https://meror.net';
      const imageUrl = result.url.startsWith('http') ? result.url : `${baseUrl}${result.url}`;
      setUploadedImages(prev => [...prev, imageUrl]);
      toast({ title: language === 'ar' ? "تم رفع الصورة بنجاح" : "Image uploaded successfully" });
    } catch (error) {
      toast({ title: language === 'ar' ? "فشل رفع الصورة" : "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const insertImageInContent = (imageUrl: string) => {
    const imgTag = `<img src="${imageUrl}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;" alt="صورة" />`;
    setFormData({ ...formData, content: formData.content + '\n' + imgTag });
    toast({ title: language === 'ar' ? "تم إضافة الصورة للمحتوى" : "Image added to content" });
  };

  const copyImageCode = (imageUrl: string) => {
    const imgTag = `<img src="${imageUrl}" style="max-width: 100%; height: auto;" alt="صورة" />`;
    navigator.clipboard.writeText(imgTag);
    toast({ title: language === 'ar' ? "تم نسخ كود الصورة" : "Image code copied" });
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const openEdit = (campaign: EmailCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      subject: campaign.subject,
      content: campaign.content,
      targetUsers: campaign.targetUsers || "all",
    });
  };

  const duplicateCampaign = (campaign: EmailCampaign) => {
    setFormData({
      subject: campaign.subject,
      content: campaign.content,
      targetUsers: campaign.targetUsers || "all",
    });
    setIsCreateOpen(true);
    toast({ title: language === 'ar' ? "تم نسخ الحملة - يمكنك التعديل والإرسال" : "Campaign duplicated - you can edit and send" });
  };

  const handleSubmit = () => {
    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 ml-1" />
            {language === 'ar' ? "مسودة" : "Draft"}
          </Badge>
        );
      case 'sending':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Send className="w-3 h-3 ml-1" />
            {language === 'ar' ? "جاري الإرسال" : "Sending"}
          </Badge>
        );
      case 'sent':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="w-3 h-3 ml-1" />
            {language === 'ar' ? "تم الإرسال" : "Sent"}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 ml-1" />
            {language === 'ar' ? "فشل" : "Failed"}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTargetUsersLabel = (target: string) => {
    switch (target) {
      case 'all':
        return language === 'ar' ? "جميع المستخدمين" : "All Users";
      case 'active':
        return language === 'ar' ? "الاشتراكات النشطة" : "Active Subscriptions";
      case 'expired':
        return language === 'ar' ? "الاشتراكات المنتهية" : "Expired Subscriptions";
      default:
        return target;
    }
  };

  const draftCount = campaigns?.filter(c => c.status === 'draft').length || 0;
  const sentCount = campaigns?.filter(c => c.status === 'sent').length || 0;
  const totalSentEmails = campaigns?.reduce((sum, c) => sum + (c.sentCount || 0), 0) || 0;

  const dateLocale = language === 'ar' ? ar : enUS;

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
            <Mail className="w-6 h-6" />
            {language === 'ar' ? "حملات البريد الإلكتروني" : "Email Campaigns"}
          </h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-campaign">
          <Plus className="w-4 h-4 ml-2" />
          {language === 'ar' ? "إنشاء حملة" : "Create Campaign"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "إجمالي الحملات" : "Total Campaigns"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campaigns?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "المسودات" : "Drafts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{draftCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "المرسلة" : "Sent"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{sentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "إجمالي الرسائل المرسلة" : "Total Emails Sent"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{totalSentEmails}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : campaigns?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {language === 'ar' ? "لا توجد حملات بريد إلكتروني" : "No email campaigns"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? "الموضوع" : "Subject"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "المستهدفون" : "Target"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "عدد المرسل" : "Sent Count"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "التاريخ" : "Date"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns?.map(campaign => (
                  <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{campaign.subject}</span>
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {campaign.content.substring(0, 50)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTargetUsersLabel(campaign.targetUsers)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(campaign.status)}
                    </TableCell>
                    <TableCell>
                      {campaign.sentCount || 0}
                    </TableCell>
                    <TableCell className="text-sm">
                      {campaign.sentAt ? (
                        <span>
                          {format(new Date(campaign.sentAt), "d MMM yyyy HH:mm", { locale: dateLocale })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {format(new Date(campaign.createdAt), "d MMM yyyy", { locale: dateLocale })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {campaign.status === 'draft' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => sendMutation.mutate(campaign.id)}
                              disabled={sendMutation.isPending}
                              data-testid={`button-send-campaign-${campaign.id}`}
                              title={language === 'ar' ? "إرسال" : "Send"}
                            >
                              <Send className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(campaign)}
                              data-testid={`button-edit-campaign-${campaign.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {campaign.status !== 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateCampaign(campaign)}
                            data-testid={`button-duplicate-campaign-${campaign.id}`}
                            title={language === 'ar' ? "نسخ وإعادة الإرسال" : "Duplicate & Resend"}
                          >
                            <CopyPlus className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(campaign.id)}
                          disabled={campaign.status === 'sending'}
                          data-testid={`button-delete-campaign-${campaign.id}`}
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

      <Dialog open={isCreateOpen || !!editingCampaign} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingCampaign(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign 
                ? (language === 'ar' ? "تعديل الحملة" : "Edit Campaign")
                : (language === 'ar' ? "إنشاء حملة جديدة" : "Create New Campaign")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{language === 'ar' ? "عنوان الرسالة" : "Email Subject"} *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={language === 'ar' ? "أدخل عنوان البريد الإلكتروني..." : "Enter email subject..."}
                data-testid="input-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">{language === 'ar' ? "محتوى الرسالة" : "Email Content"} *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={language === 'ar' ? "أدخل محتوى البريد الإلكتروني..." : "Enter email content..."}
                rows={6}
                data-testid="input-content"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? "إضافة صور" : "Add Images"}</Label>
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                    data-testid="input-upload-image"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isUploading}
                    onClick={(e) => {
                      const input = (e.currentTarget.parentElement as HTMLLabelElement).querySelector('input');
                      input?.click();
                    }}
                  >
                    <ImagePlus className="w-4 h-4 ml-2" />
                    {isUploading 
                      ? (language === 'ar' ? "جاري الرفع..." : "Uploading...") 
                      : (language === 'ar' ? "رفع صورة" : "Upload Image")}
                  </Button>
                </label>
              </div>
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {uploadedImages.map((url, index) => (
                    <div key={index} className="relative group border rounded-md overflow-hidden">
                      <img src={url} alt="" className="w-full h-20 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-7 w-7"
                          onClick={() => insertImageInContent(url)}
                          title={language === 'ar' ? "إدراج في المحتوى" : "Insert in content"}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-7 w-7"
                          onClick={() => copyImageCode(url)}
                          title={language === 'ar' ? "نسخ الكود" : "Copy code"}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-7 w-7"
                          onClick={() => removeImage(index)}
                          title={language === 'ar' ? "حذف" : "Remove"}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {language === 'ar' 
                  ? "ارفع صورة ثم اضغط + لإدراجها في المحتوى أو انسخ كودها" 
                  : "Upload an image then click + to insert it in content or copy its code"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetUsers">{language === 'ar' ? "المستهدفون" : "Target Users"}</Label>
              <Select
                value={formData.targetUsers}
                onValueChange={(value) => setFormData({ ...formData, targetUsers: value })}
              >
                <SelectTrigger data-testid="select-target-users">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? "جميع المستخدمين" : "All Users"}</SelectItem>
                  <SelectItem value="active">{language === 'ar' ? "الاشتراكات النشطة" : "Active Subscriptions"}</SelectItem>
                  <SelectItem value="expired">{language === 'ar' ? "الاشتراكات المنتهية" : "Expired Subscriptions"}</SelectItem>
                  {targetGroups && targetGroups.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                        {language === 'ar' ? 'المجموعات المخصصة' : 'Custom Groups'}
                      </div>
                      {targetGroups.map((group) => (
                        <SelectItem key={group.id} value={`group:${group.id}`}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? "سيتم حفظ الحملة كمسودة. يمكنك إرسالها لاحقاً من خلال زر الإرسال."
                    : "The campaign will be saved as a draft. You can send it later using the send button."}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!formData.subject.trim() || !formData.content.trim() || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-campaign"
            >
              {createMutation.isPending || updateMutation.isPending 
                ? (language === 'ar' ? "جاري الحفظ..." : "Saving...")
                : editingCampaign 
                  ? (language === 'ar' ? "حفظ التغييرات" : "Save Changes")
                  : (language === 'ar' ? "إنشاء الحملة" : "Create Campaign")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
