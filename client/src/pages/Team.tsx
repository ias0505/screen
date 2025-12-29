import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, UserPlus, Trash2, Mail, Clock, CheckCircle, XCircle, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import type { TeamMember, User } from "@shared/schema";

const inviteSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب (حرفين على الأقل)"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  permission: z.enum(["viewer", "editor", "manager"]),
});

type InviteForm = z.infer<typeof inviteSchema>;

const permissionLabels: Record<string, string> = {
  viewer: "مشاهد",
  editor: "محرر",
  manager: "مدير",
};

const permissionDescriptions: Record<string, string> = {
  viewer: "عرض المحتوى والشاشات فقط",
  editor: "تعديل المحتوى والجداول",
  manager: "إدارة كاملة بما في ذلك الفريق",
};

export default function Team() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const { toast } = useToast();

  const { data: members = [], isLoading } = useQuery<(TeamMember & { member?: User })[]>({
    queryKey: ['/api/team'],
  });

  const { data: invitations = [] } = useQuery<(TeamMember & { owner: User })[]>({
    queryKey: ['/api/team/invitations'],
  });

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", permission: "viewer" },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: InviteForm) => apiRequest('POST', '/api/team/invite', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
      setIsInviteOpen(false);
      form.reset();
      toast({ title: "تم إرسال الدعوة بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل إرسال الدعوة", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (invitationId: number) => apiRequest('DELETE', `/api/team/${invitationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
      toast({ title: "تم إزالة العضو" });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ invitationId, permission }: { invitationId: number; permission: string }) => 
      apiRequest('PATCH', `/api/team/${invitationId}/permission`, { permission }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
      setEditingMember(null);
      toast({ title: "تم تحديث الصلاحية" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (ownerId: string) => apiRequest('POST', `/api/team/invitations/${ownerId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/team/context'] });
      toast({ title: "تم قبول الدعوة بنجاح" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (ownerId: string) => apiRequest('POST', `/api/team/invitations/${ownerId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/invitations'] });
      toast({ title: "تم رفض الدعوة" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 ml-1" />نشط</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 ml-1" />في انتظار القبول</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPermissionBadge = (permission: string) => {
    const colors: Record<string, string> = {
      viewer: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      editor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      manager: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    };
    return (
      <Badge variant="outline" className={colors[permission] || ""}>
        {permissionLabels[permission] || permission}
      </Badge>
    );
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">إدارة الفريق</h1>
            <p className="text-muted-foreground">أضف موظفين للوصول إلى نفس الشاشات والمحتوى</p>
          </div>
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-invite-member">
                <UserPlus className="w-4 h-4 ml-2" />
                دعوة موظف
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>دعوة موظف جديد</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => inviteMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الموظف</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="أدخل اسم الموظف"
                            data-testid="input-invite-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>البريد الإلكتروني</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email" 
                            placeholder="employee@example.com"
                            data-testid="input-invite-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="permission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الصلاحية</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-permission">
                              <SelectValue placeholder="اختر الصلاحية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="viewer">
                              <div className="flex flex-col">
                                <span>مشاهد</span>
                                <span className="text-xs text-muted-foreground">عرض المحتوى والشاشات فقط</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="editor">
                              <div className="flex flex-col">
                                <span>محرر</span>
                                <span className="text-xs text-muted-foreground">تعديل المحتوى والجداول</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="manager">
                              <div className="flex flex-col">
                                <span>مدير</span>
                                <span className="text-xs text-muted-foreground">إدارة كاملة بما في ذلك الفريق</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={inviteMutation.isPending} data-testid="button-send-invite">
                    {inviteMutation.isPending ? "جاري الإرسال..." : "إرسال الدعوة"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                دعوات معلقة لك
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50 flex-wrap">
                    <div>
                      <p className="font-medium">{inv.owner.firstName || inv.owner.email || 'شركة'}</p>
                      <p className="text-sm text-muted-foreground">يدعوك للانضمام كـ {permissionLabels[inv.permission] || inv.permission}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => acceptMutation.mutate(inv.ownerId)}
                        disabled={acceptMutation.isPending}
                        data-testid={`button-accept-invitation-${inv.id}`}
                      >
                        <CheckCircle className="w-4 h-4 ml-1" />
                        قبول
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => rejectMutation.mutate(inv.ownerId)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-invitation-${inv.id}`}
                      >
                        <XCircle className="w-4 h-4 ml-1" />
                        رفض
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              أعضاء الفريق ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا يوجد أعضاء في الفريق</p>
                <p className="text-sm">أضف موظفين ليتمكنوا من إدارة الشاشات والمحتوى</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between gap-4 p-4 rounded-lg border flex-wrap"
                    data-testid={`team-member-${member.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.invitedName || member.member?.firstName || member.invitedEmail || 'موظف'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.member?.email || member.invitedEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {getStatusBadge(member.status)}
                      {getPermissionBadge(member.permission)}
                      
                      <Dialog open={editingMember?.id === member.id} onOpenChange={(open) => !open && setEditingMember(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingMember(member)}
                            data-testid={`button-edit-permission-${member.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>تعديل صلاحية {member.invitedName || member.invitedEmail}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              {['viewer', 'editor', 'manager'].map((perm) => (
                                <div
                                  key={perm}
                                  className={`p-4 rounded-lg border cursor-pointer hover-elevate ${
                                    member.permission === perm ? 'border-primary bg-primary/5' : ''
                                  }`}
                                  onClick={() => updatePermissionMutation.mutate({ 
                                    invitationId: member.id, 
                                    permission: perm 
                                  })}
                                  data-testid={`permission-option-${perm}`}
                                >
                                  <p className="font-medium">{permissionLabels[perm]}</p>
                                  <p className="text-sm text-muted-foreground">{permissionDescriptions[perm]}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeMutation.mutate(member.id)}
                        disabled={removeMutation.isPending}
                        data-testid={`button-remove-member-${member.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
}
