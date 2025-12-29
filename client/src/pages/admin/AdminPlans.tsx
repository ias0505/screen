import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Package, ArrowRight, Plus, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string | null;
  pricePerScreen: number;
  minScreens: number | null;
  maxScreens: number | null;
  discountPercentage: number | null;
  features: string | null;
  isActive: boolean | null;
  isDefault: boolean | null;
  createdAt: string;
}

export default function AdminPlans() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pricePerScreen: 50,
    minScreens: 1,
    maxScreens: "",
    discountPercentage: 0,
    features: "",
    isActive: true,
    isDefault: false
  });

  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/admin/plans'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/plans', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: "تم إنشاء الخطة بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await apiRequest('PATCH', `/api/admin/plans/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      setEditingPlan(null);
      resetForm();
      toast({ title: "تم تحديث الخطة بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      toast({ title: "تم حذف الخطة بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      pricePerScreen: 50,
      minScreens: 1,
      maxScreens: "",
      discountPercentage: 0,
      features: "",
      isActive: true,
      isDefault: false
    });
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    let featuresText = "";
    if (plan.features) {
      try {
        const parsed = JSON.parse(plan.features);
        if (Array.isArray(parsed)) {
          featuresText = parsed.join('\n');
        } else {
          featuresText = plan.features;
        }
      } catch {
        featuresText = plan.features;
      }
    }
    setFormData({
      name: plan.name,
      description: plan.description || "",
      pricePerScreen: plan.pricePerScreen,
      minScreens: plan.minScreens || 1,
      maxScreens: plan.maxScreens?.toString() || "",
      discountPercentage: plan.discountPercentage || 0,
      features: featuresText,
      isActive: plan.isActive !== false,
      isDefault: plan.isDefault || false
    });
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      maxScreens: formData.maxScreens ? Number(formData.maxScreens) : null,
      features: formData.features ? formData.features.split('\n').filter(f => f.trim()) : null
    };

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const parseFeatures = (features: string | null): string[] => {
    if (!features) return [];
    try {
      return JSON.parse(features);
    } catch {
      return features.split(',').map(f => f.trim()).filter(f => f);
    }
  };

  const activeCount = plans?.filter(p => p.isActive).length || 0;

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
            <Package className="w-6 h-6" />
            خطط الاشتراك
          </h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-plan">
          <Plus className="w-4 h-4 ml-2" />
          إضافة خطة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي الخطط</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{plans?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">الخطط النشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">الخطط غير النشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{(plans?.length || 0) - activeCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : plans?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد خطط اشتراك
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم الخطة</TableHead>
                  <TableHead className="text-right">سعر الشاشة</TableHead>
                  <TableHead className="text-right">حدود الشاشات</TableHead>
                  <TableHead className="text-right">الخصم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map(plan => (
                  <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{plan.name}</span>
                        {plan.isDefault && (
                          <Badge variant="secondary" className="w-fit mt-1">افتراضي</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{plan.pricePerScreen} ريال</TableCell>
                    <TableCell>
                      {plan.minScreens || 1} - {plan.maxScreens || "∞"}
                    </TableCell>
                    <TableCell>
                      {plan.discountPercentage ? (
                        <Badge variant="outline">{plan.discountPercentage}%</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {plan.isActive ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 ml-1" />
                          غير نشط
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(plan)}
                          data-testid={`button-edit-plan-${plan.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(plan.id)}
                          data-testid={`button-delete-plan-${plan.id}`}
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

      <Dialog open={isCreateOpen || !!editingPlan} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingPlan(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "تعديل الخطة" : "إضافة خطة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الخطة</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: الخطة الأساسية"
                data-testid="input-plan-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف الخطة..."
                data-testid="input-plan-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerScreen">سعر الشاشة (ريال)</Label>
                <Input
                  id="pricePerScreen"
                  type="number"
                  value={formData.pricePerScreen}
                  onChange={(e) => setFormData({ ...formData, pricePerScreen: Number(e.target.value) })}
                  data-testid="input-plan-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercentage">نسبة الخصم %</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.discountPercentage}
                  onChange={(e) => setFormData({ ...formData, discountPercentage: Number(e.target.value) })}
                  data-testid="input-plan-discount"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minScreens">الحد الأدنى</Label>
                <Input
                  id="minScreens"
                  type="number"
                  min={1}
                  value={formData.minScreens}
                  onChange={(e) => setFormData({ ...formData, minScreens: Number(e.target.value) })}
                  data-testid="input-plan-min"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxScreens">الحد الأقصى</Label>
                <Input
                  id="maxScreens"
                  type="number"
                  min={1}
                  value={formData.maxScreens}
                  onChange={(e) => setFormData({ ...formData, maxScreens: e.target.value })}
                  placeholder="غير محدود"
                  data-testid="input-plan-max"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">المميزات (سطر لكل ميزة)</Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="دعم فني 24/7&#10;تحديثات مجانية&#10;..."
                rows={3}
                data-testid="input-plan-features"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-plan-active"
                />
                <Label htmlFor="isActive">نشط</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  data-testid="switch-plan-default"
                />
                <Label htmlFor="isDefault">افتراضي</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-plan"
            >
              {createMutation.isPending || updateMutation.isPending ? "جاري الحفظ..." : editingPlan ? "حفظ التغييرات" : "إنشاء الخطة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
