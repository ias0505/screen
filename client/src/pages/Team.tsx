import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, UserPlus, Trash2, Mail, Clock, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import type { TeamMember, User } from "@shared/schema";

const inviteSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function Team() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const { toast } = useToast();

  const { data: members = [], isLoading } = useQuery<(TeamMember & { member?: User })[]>({
    queryKey: ['/api/team'],
  });

  const { data: invitations = [] } = useQuery<(TeamMember & { owner: User })[]>({
    queryKey: ['/api/team/invitations'],
  });

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
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
                      <p className="text-sm text-muted-foreground">يدعوك للانضمام كموظف</p>
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
                          {member.member?.firstName || member.invitedEmail || 'موظف'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.member?.email || member.invitedEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {getStatusBadge(member.status)}
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
