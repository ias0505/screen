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
import { useLanguage } from "@/hooks/use-language";
import { Package, ArrowRight, Plus, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
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
  const { language } = useLanguage();
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
      toast({ title: language === 'ar' ? "تم إنشاء الخطة بنجاح" : "Plan created successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
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
      toast({ title: language === 'ar' ? "تم تحديث الخطة بنجاح" : "Plan updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      toast({ title: language === 'ar' ? "تم حذف الخطة بنجاح" : "Plan deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
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
            {language === 'ar' ? "خطط الاشتراك" : "Subscription Plans"}
          </h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-plan">
          <Plus className="w-4 h-4 ml-2" />
          {language === 'ar' ? "إضافة خطة" : "Add Plan"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "إجمالي الخطط" : "Total Plans"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{plans?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "الخطط النشطة" : "Active Plans"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "الخطط غير النشطة" : "Inactive Plans"}
            </CardTitle>
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
              {language === 'ar' ? "لا توجد خطط اشتراك" : "No subscription plans"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? "اسم الخطة" : "Plan Name"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "سعر الشاشة" : "Price per Screen"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "حدود الشاشات" : "Screen Limits"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الخصم" : "Discount"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map(plan => (
                  <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{plan.name}</span>
                        {plan.isDefault && (
                          <Badge variant="secondary" className="w-fit mt-1">
                            {language === 'ar' ? "افتراضي" : "Default"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{plan.pricePerScreen} {language === 'ar' ? "ريال" : "SAR"}</TableCell>
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
                          {language === 'ar' ? "نشط" : "Active"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 ml-1" />
                          {language === 'ar' ? "غير نشط" : "Inactive"}
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
            <DialogTitle>
              {editingPlan 
                ? (language === 'ar' ? "تعديل الخطة" : "Edit Plan")
                : (language === 'ar' ? "إضافة خطة جديدة" : "Add New Plan")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{language === 'ar' ? "اسم الخطة" : "Plan Name"}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={language === 'ar' ? "مثال: الخطة الأساسية" : "e.g., Basic Plan"}
                data-testid="input-plan-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{language === 'ar' ? "الوصف" : "Description"}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'ar' ? "وصف الخطة..." : "Plan description..."}
                data-testid="input-plan-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerScreen">
                  {language === 'ar' ? "سعر الشاشة (ريال)" : "Price per Screen (SAR)"}
                </Label>
                <Input
                  id="pricePerScreen"
                  type="number"
                  value={formData.pricePerScreen}
                  onChange={(e) => setFormData({ ...formData, pricePerScreen: Number(e.target.value) })}
                  data-testid="input-plan-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercentage">
                  {language === 'ar' ? "نسبة الخصم %" : "Discount %"}
                </Label>
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
                <Label htmlFor="minScreens">{language === 'ar' ? "الحد الأدنى" : "Minimum"}</Label>
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
                <Label htmlFor="maxScreens">{language === 'ar' ? "الحد الأقصى" : "Maximum"}</Label>
                <Input
                  id="maxScreens"
                  type="number"
                  min={1}
                  value={formData.maxScreens}
                  onChange={(e) => setFormData({ ...formData, maxScreens: e.target.value })}
                  placeholder={language === 'ar' ? "غير محدود" : "Unlimited"}
                  data-testid="input-plan-max"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">
                {language === 'ar' ? "المميزات (سطر لكل ميزة)" : "Features (one per line)"}
              </Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder={language === 'ar' ? "دعم فني 24/7\nتحديثات مجانية\n..." : "24/7 support\nFree updates\n..."}
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
                <Label htmlFor="isActive">{language === 'ar' ? "نشط" : "Active"}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  data-testid="switch-plan-default"
                />
                <Label htmlFor="isDefault">{language === 'ar' ? "افتراضي" : "Default"}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-plan"
            >
              {createMutation.isPending || updateMutation.isPending 
                ? (language === 'ar' ? "جاري الحفظ..." : "Saving...")
                : editingPlan 
                  ? (language === 'ar' ? "حفظ التغييرات" : "Save Changes")
                  : (language === 'ar' ? "إنشاء الخطة" : "Create Plan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
