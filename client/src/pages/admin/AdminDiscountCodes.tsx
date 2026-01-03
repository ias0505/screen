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
import { Tag, ArrowRight, Plus, Pencil, Trash2, CheckCircle, XCircle, Copy } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DiscountCode {
  id: number;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minScreens: number | null;
  maxUses: number | null;
  usedCount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean | null;
  createdBy: string | null;
  createdAt: string;
}

export default function AdminDiscountCodes() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 10,
    minScreens: 1,
    maxUses: "",
    validFrom: "",
    validUntil: "",
    isActive: true
  });

  const { data: codes, isLoading } = useQuery<DiscountCode[]>({
    queryKey: ['/api/admin/discount-codes'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/discount-codes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discount-codes'] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: language === 'ar' ? "تم إنشاء كود الخصم بنجاح" : "Discount code created successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await apiRequest('PATCH', `/api/admin/discount-codes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discount-codes'] });
      setEditingCode(null);
      resetForm();
      toast({ title: language === 'ar' ? "تم تحديث كود الخصم بنجاح" : "Discount code updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/discount-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discount-codes'] });
      toast({ title: language === 'ar' ? "تم حذف كود الخصم بنجاح" : "Discount code deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 10,
      minScreens: 1,
      maxUses: "",
      validFrom: "",
      validUntil: "",
      isActive: true
    });
  };

  const openEdit = (code: DiscountCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || "",
      discountType: code.discountType as "percentage" | "fixed",
      discountValue: code.discountValue,
      minScreens: code.minScreens || 1,
      maxUses: code.maxUses?.toString() || "",
      validFrom: code.validFrom ? code.validFrom.split('T')[0] : "",
      validUntil: code.validUntil ? code.validUntil.split('T')[0] : "",
      isActive: code.isActive !== false
    });
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      maxUses: formData.maxUses ? Number(formData.maxUses) : null,
      validFrom: formData.validFrom || null,
      validUntil: formData.validUntil || null
    };

    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: language === 'ar' ? "تم نسخ الكود" : "Code copied" });
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code: result });
  };

  const isCodeExpired = (code: DiscountCode) => {
    if (!code.validUntil) return false;
    return new Date(code.validUntil) < new Date();
  };

  const isCodeUsedUp = (code: DiscountCode) => {
    if (!code.maxUses) return false;
    return (code.usedCount || 0) >= code.maxUses;
  };

  const activeCount = codes?.filter(c => c.isActive && !isCodeExpired(c) && !isCodeUsedUp(c)).length || 0;
  const totalUsage = codes?.reduce((sum, c) => sum + (c.usedCount || 0), 0) || 0;

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
            <Tag className="w-6 h-6" />
            {language === 'ar' ? "أكواد الخصم" : "Discount Codes"}
          </h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-code">
          <Plus className="w-4 h-4 ml-2" />
          {language === 'ar' ? "إضافة كود" : "Add Code"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "إجمالي الأكواد" : "Total Codes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{codes?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "الأكواد النشطة" : "Active Codes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "المنتهية/المستنفذة" : "Expired/Used Up"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{(codes?.length || 0) - activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "إجمالي الاستخدام" : "Total Usage"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{totalUsage}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : codes?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === 'ar' ? "لا توجد أكواد خصم" : "No discount codes"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? "الكود" : "Code"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الخصم" : "Discount"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الاستخدام" : "Usage"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الصلاحية" : "Validity"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes?.map(code => (
                  <TableRow key={code.id} data-testid={`row-code-${code.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono text-sm">{code.code}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyCode(code.code)}
                          data-testid={`button-copy-code-${code.id}`}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {code.discountType === 'percentage' 
                          ? `${code.discountValue}%`
                          : `${code.discountValue} ${language === 'ar' ? 'ريال' : 'SAR'}`
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {code.usedCount || 0} / {code.maxUses || "∞"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {code.validUntil ? (
                        <span className={isCodeExpired(code) ? "text-red-500" : ""}>
                          {language === 'ar' ? 'حتى' : 'Until'} {format(new Date(code.validUntil), "d MMM yyyy", { locale: dateLocale })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {language === 'ar' ? "دائم" : "Permanent"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!code.isActive ? (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 ml-1" />
                          {language === 'ar' ? "غير نشط" : "Inactive"}
                        </Badge>
                      ) : isCodeExpired(code) ? (
                        <Badge variant="destructive">{language === 'ar' ? "منتهي" : "Expired"}</Badge>
                      ) : isCodeUsedUp(code) ? (
                        <Badge variant="secondary">{language === 'ar' ? "مستنفذ" : "Used Up"}</Badge>
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
                          onClick={() => openEdit(code)}
                          data-testid={`button-edit-code-${code.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(code.id)}
                          data-testid={`button-delete-code-${code.id}`}
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

      <Dialog open={isCreateOpen || !!editingCode} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingCode(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCode 
                ? (language === 'ar' ? "تعديل كود الخصم" : "Edit Discount Code")
                : (language === 'ar' ? "إضافة كود خصم جديد" : "Add New Discount Code")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">{language === 'ar' ? "كود الخصم" : "Discount Code"}</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  className="font-mono"
                  data-testid="input-code"
                />
                <Button type="button" variant="outline" onClick={generateRandomCode} data-testid="button-generate-code">
                  {language === 'ar' ? "توليد" : "Generate"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{language === 'ar' ? "الوصف" : "Description"}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'ar' ? "وصف الخصم..." : "Discount description..."}
                data-testid="input-code-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountType">{language === 'ar' ? "نوع الخصم" : "Discount Type"}</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value) => setFormData({ ...formData, discountType: value as "percentage" | "fixed" })}
                >
                  <SelectTrigger data-testid="select-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{language === 'ar' ? "نسبة مئوية" : "Percentage"}</SelectItem>
                    <SelectItem value="fixed">{language === 'ar' ? "مبلغ ثابت" : "Fixed Amount"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {formData.discountType === 'percentage' 
                    ? (language === 'ar' ? 'النسبة %' : 'Percentage %')
                    : (language === 'ar' ? 'المبلغ (ريال)' : 'Amount (SAR)')}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min={1}
                  max={formData.discountType === 'percentage' ? 100 : undefined}
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                  data-testid="input-discount-value"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minScreens">{language === 'ar' ? "الحد الأدنى للشاشات" : "Min Screens"}</Label>
                <Input
                  id="minScreens"
                  type="number"
                  min={1}
                  value={formData.minScreens}
                  onChange={(e) => setFormData({ ...formData, minScreens: Number(e.target.value) })}
                  data-testid="input-min-screens"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">{language === 'ar' ? "الحد الأقصى للاستخدام" : "Max Uses"}</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min={1}
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder={language === 'ar' ? "غير محدود" : "Unlimited"}
                  data-testid="input-max-uses"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">{language === 'ar' ? "تاريخ البداية" : "Start Date"}</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  data-testid="input-valid-from"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">{language === 'ar' ? "تاريخ الانتهاء" : "End Date"}</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  data-testid="input-valid-until"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-code-active"
              />
              <Label htmlFor="isActive">{language === 'ar' ? "نشط" : "Active"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!formData.code || !formData.discountValue || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-code"
            >
              {createMutation.isPending || updateMutation.isPending 
                ? (language === 'ar' ? "جاري الحفظ..." : "Saving...")
                : editingCode 
                  ? (language === 'ar' ? "حفظ التغييرات" : "Save Changes")
                  : (language === 'ar' ? "إنشاء الكود" : "Create Code")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
