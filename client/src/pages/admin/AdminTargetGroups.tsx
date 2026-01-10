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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Users, ArrowRight, Plus, Pencil, Trash2, UserPlus, UserMinus } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TargetGroup {
  id: number;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  membersCount?: number;
}

interface GroupMember {
  id: string;
  email: string;
  name: string | null;
}

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export default function AdminTargetGroups() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TargetGroup | null>(null);
  const [managingGroup, setManagingGroup] = useState<TargetGroup | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: groups, isLoading } = useQuery<TargetGroup[]>({
    queryKey: ['/api/admin/target-groups'],
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: !!managingGroup,
  });

  const { data: groupMembers, refetch: refetchMembers } = useQuery<GroupMember[]>({
    queryKey: ['/api/admin/target-groups', managingGroup?.id, 'members'],
    enabled: !!managingGroup,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/target-groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/target-groups'] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: language === 'ar' ? "تم إنشاء المجموعة بنجاح" : "Group created successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await apiRequest('PATCH', `/api/admin/target-groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/target-groups'] });
      setEditingGroup(null);
      resetForm();
      toast({ title: language === 'ar' ? "تم تحديث المجموعة بنجاح" : "Group updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/target-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/target-groups'] });
      toast({ title: language === 'ar' ? "تم حذف المجموعة بنجاح" : "Group deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number, userId: string }) => {
      return await apiRequest('POST', `/api/admin/target-groups/${groupId}/members`, { userId });
    },
    onSuccess: () => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/target-groups'] });
      setSelectedUserId("");
      toast({ title: language === 'ar' ? "تم إضافة المستخدم بنجاح" : "User added successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number, userId: string }) => {
      return await apiRequest('DELETE', `/api/admin/target-groups/${groupId}/members/${userId}`);
    },
    onSuccess: () => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/target-groups'] });
      toast({ title: language === 'ar' ? "تم إزالة المستخدم بنجاح" : "User removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    });
  };

  const handleEdit = (group: TargetGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
    });
  };

  const handleSubmit = () => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const availableUsers = allUsers?.filter(
    user => !groupMembers?.some(member => member.id === user.id)
  ) || [];

  return (
    <div className="p-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="sm" data-testid="link-back-admin">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {language === 'ar' ? 'مجموعات الاستهداف' : 'Target Groups'}
          </h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-group">
          <Plus className="h-4 w-4 me-2" />
          {language === 'ar' ? 'إنشاء مجموعة' : 'Create Group'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === 'ar' ? 'قائمة المجموعات' : 'Groups List'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : groups && groups.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'اسم المجموعة' : 'Group Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                  <TableHead>{language === 'ar' ? 'عدد الأعضاء' : 'Members Count'}</TableHead>
                  <TableHead>{language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(group => (
                  <TableRow key={group.id} data-testid={`row-group-${group.id}`}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {group.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {group.membersCount || 0} {language === 'ar' ? 'عضو' : 'members'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(group.createdAt), 'PPP', { 
                        locale: language === 'ar' ? ar : enUS 
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setManagingGroup(group)}
                          data-testid={`button-manage-members-${group.id}`}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(group)}
                          data-testid={`button-edit-group-${group.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(group.id)}
                          data-testid={`button-delete-group-${group.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'لا توجد مجموعات بعد' : 'No groups yet'}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen || !!editingGroup} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingGroup(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup 
                ? (language === 'ar' ? 'تعديل المجموعة' : 'Edit Group')
                : (language === 'ar' ? 'إنشاء مجموعة جديدة' : 'Create New Group')
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم المجموعة' : 'Group Name'}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={language === 'ar' ? 'أدخل اسم المجموعة' : 'Enter group name'}
                data-testid="input-group-name"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'ar' ? 'وصف اختياري للمجموعة' : 'Optional description'}
                data-testid="input-group-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingGroup(null);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit"
            >
              {editingGroup 
                ? (language === 'ar' ? 'تحديث' : 'Update')
                : (language === 'ar' ? 'إنشاء' : 'Create')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingGroup} onOpenChange={(open) => {
        if (!open) {
          setManagingGroup(null);
          setSelectedUserId("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' 
                ? `إدارة أعضاء: ${managingGroup?.name}` 
                : `Manage Members: ${managingGroup?.name}`
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1" data-testid="select-user">
                  <SelectValue placeholder={language === 'ar' ? 'اختر مستخدم لإضافته' : 'Select user to add'} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email || `${user.firstName} ${user.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  if (managingGroup && selectedUserId) {
                    addMemberMutation.mutate({ groupId: managingGroup.id, userId: selectedUserId });
                  }
                }}
                disabled={!selectedUserId || addMemberMutation.isPending}
                data-testid="button-add-member"
              >
                <UserPlus className="h-4 w-4 me-2" />
                {language === 'ar' ? 'إضافة' : 'Add'}
              </Button>
            </div>

            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {groupMembers && groupMembers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead>{language === 'ar' ? 'إزالة' : 'Remove'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupMembers.map(member => (
                      <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.name || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (managingGroup) {
                                removeMemberMutation.mutate({ groupId: managingGroup.id, userId: member.id });
                              }
                            }}
                            data-testid={`button-remove-member-${member.id}`}
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا يوجد أعضاء في هذه المجموعة' : 'No members in this group'}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setManagingGroup(null);
                setSelectedUserId("");
              }}
              data-testid="button-close-members"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
