import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSubscriptions, useCreateSubscription, useAvailableSlots, useSubscriptionScreensCount } from "@/hooks/use-subscriptions";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  CreditCard, 
  Plus, 
  Calendar,
  Monitor,
  CheckCircle,
  AlertCircle,
  Tag,
  Check,
  Package
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Subscription, SubscriptionPlan } from "@shared/schema";

interface DiscountValidation {
  valid: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  minScreens?: number;
  message: string;
}

function SubscriptionCard({ sub }: { sub: Subscription }) {
  const { data: screensData } = useSubscriptionScreensCount(sub.id);
  const usedScreens = screensData?.count || 0;

  return (
    <Card data-testid={`card-subscription-${sub.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            {sub.screenCount} شاشة
          </CardTitle>
          <Badge variant="default" className="bg-green-500">فعّال</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الشاشات المستخدمة</span>
            <Badge variant="outline">{usedScreens} / {sub.screenCount}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>ينتهي: {format(new Date(sub.endDate), 'dd MMMM yyyy', { locale: ar })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span>{sub.totalPrice} ريال ({sub.durationYears} سنة)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function parseFeatures(features: string | null): string[] {
  if (!features) return [];
  try {
    return JSON.parse(features);
  } catch {
    return features.split(',').map(f => f.trim()).filter(f => f);
  }
}

export default function Subscriptions() {
  const { toast } = useToast();
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { data: slotsData } = useAvailableSlots();
  const createSubscription = useCreateSubscription();
  
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription/plans'],
  });

  const { data: priceSettings } = useQuery<{ pricePerScreen: number }>({
    queryKey: ['/api/settings/price'],
  });
  const defaultPrice = priceSettings?.pricePerScreen || 50;
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState({ screenCount: 1, durationYears: 1 });
  const [discountCode, setDiscountCode] = useState("");
  const [discountResult, setDiscountResult] = useState<DiscountValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const activeSubscriptions = subscriptions.filter(s => 
    s.status === 'active' && new Date(s.endDate) > new Date()
  );
  const expiredSubscriptions = subscriptions.filter(s => 
    s.status === 'expired' || new Date(s.endDate) <= new Date()
  );

  const getPricePerScreen = () => {
    if (selectedPlan) {
      return selectedPlan.pricePerScreen;
    }
    return defaultPrice;
  };

  const calculateBasePrice = () => {
    const pricePerScreen = getPricePerScreen();
    let basePrice = form.screenCount * pricePerScreen * form.durationYears;
    
    if (selectedPlan?.discountPercentage && selectedPlan.discountPercentage > 0) {
      basePrice = basePrice * (1 - selectedPlan.discountPercentage / 100);
    }
    
    return basePrice;
  };

  const calculateFinalPrice = () => {
    let price = calculateBasePrice();
    
    if (discountResult?.valid) {
      if (discountResult.discountType === 'percentage') {
        price = price * (1 - (discountResult.discountValue || 0) / 100);
      } else if (discountResult.discountType === 'fixed') {
        price = price - (discountResult.discountValue || 0);
      }
    }
    
    return Math.max(0, Math.round(price));
  };

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setDiscountResult(null);
      return;
    }
    
    setIsValidating(true);
    try {
      const response = await apiRequest('POST', '/api/discount-codes/validate', {
        code: discountCode.trim(),
        screenCount: form.screenCount
      });
      const result = await response.json();
      setDiscountResult(result);
      if (result.valid) {
        toast({ title: result.message });
      }
    } catch (error: any) {
      const errorData = await error.json?.() || { message: "خطأ في التحقق من الكود" };
      setDiscountResult({ valid: false, message: errorData.message });
      toast({ title: errorData.message, variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalPrice = calculateFinalPrice();
    const confirmed = window.confirm(
      `هل تريد إنشاء اشتراك جديد؟\n` +
      `عدد الشاشات: ${form.screenCount}\n` +
      `المدة: ${form.durationYears} سنة\n` +
      `المبلغ: ${finalPrice} ريال` +
      (discountResult?.valid ? `\n(بعد الخصم)` : '')
    );
    
    if (confirmed) {
      await createSubscription.mutateAsync({
        ...form,
        discountCode: discountResult?.valid ? discountCode : undefined,
        pricePerScreen: getPricePerScreen()
      });
      setIsOpen(false);
      setForm({ screenCount: 1, durationYears: 1 });
      setSelectedPlan(null);
      setDiscountCode("");
      setDiscountResult(null);
    }
  };

  const selectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    const minScreens = plan.minScreens || 1;
    setForm({ ...form, screenCount: minScreens });
    setDiscountResult(null);
  };

  const findBestPlanForScreenCount = (count: number): SubscriptionPlan | null => {
    const sortedPlans = [...plans].sort((a, b) => (a.maxScreens || 999) - (b.maxScreens || 999));
    return sortedPlans.find(p => 
      (p.minScreens || 1) <= count && (p.maxScreens || 999) >= count
    ) || null;
  };

  const handleScreenCountChange = (newCount: number) => {
    setForm({ ...form, screenCount: newCount });
    
    // Check if current plan still fits the new screen count
    if (selectedPlan) {
      const minOk = !selectedPlan.minScreens || newCount >= selectedPlan.minScreens;
      const maxOk = !selectedPlan.maxScreens || newCount <= selectedPlan.maxScreens;
      
      // If still within current plan range, keep it
      if (minOk && maxOk) {
        return;
      }
    }
    
    // Find a matching plan for the new screen count
    const bestPlan = findBestPlanForScreenCount(newCount);
    if (bestPlan) {
      setSelectedPlan(bestPlan);
    }
    // If no plan matches, keep current plan (user went beyond max range)
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">الاشتراكات</h1>
            <p className="text-muted-foreground mt-1">إدارة اشتراكات الشاشات</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (open && plans.length > 0 && !selectedPlan) {
              setSelectedPlan(plans[0]);
            }
            if (!open) {
              setSelectedPlan(null);
              setDiscountCode("");
              setDiscountResult(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => { if (plans.length > 0) setSelectedPlan(plans[0]); }}
                className="gap-2 bg-primary rounded-xl px-6" 
                data-testid="button-add-subscription"
              >
                <Plus className="w-5 h-5" />
                <span>اشتراك جديد</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إنشاء اشتراك جديد</DialogTitle>
              </DialogHeader>
              
              {plans.length > 0 && (
                <div className="space-y-3 pt-4">
                  <Label className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    اختر خطة الاشتراك
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {plans.map((plan) => {
                      const features = parseFeatures(plan.features);
                      return (
                        <Card 
                          key={plan.id}
                          className={`cursor-pointer hover-elevate transition-all ${selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => selectPlan(plan)}
                          data-testid={`card-plan-${plan.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-base">{plan.name}</CardTitle>
                              {plan.isDefault && (
                                <Badge variant="secondary" className="text-xs">موصى به</Badge>
                              )}
                              {selectedPlan?.id === plan.id && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold">{plan.pricePerScreen}</span>
                              <span className="text-muted-foreground text-sm">ريال/شاشة/سنة</span>
                            </div>
                            {plan.discountPercentage && plan.discountPercentage > 0 && (
                              <Badge variant="outline" className="text-green-600">
                                خصم {plan.discountPercentage}%
                              </Badge>
                            )}
                            {plan.description && (
                              <p className="text-sm text-muted-foreground">{plan.description}</p>
                            )}
                            {features.length > 0 && (
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {features.slice(0, 3).map((feature, idx) => (
                                  <li key={idx} className="flex items-center gap-1">
                                    <Check className="w-3 h-3 text-green-500" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>عدد الشاشات</Label>
                    <Input 
                      type="number"
                      min={1}
                      value={form.screenCount} 
                      onChange={(e) => handleScreenCountChange(parseInt(e.target.value) || 1)}
                      className="rounded-xl"
                      data-testid="input-screen-count"
                    />
                    {selectedPlan?.minScreens && (
                      <p className="text-xs text-muted-foreground">الحد الأدنى: {selectedPlan.minScreens} شاشة</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>مدة الاشتراك</Label>
                    <Select 
                      value={form.durationYears.toString()} 
                      onValueChange={(v) => setForm({...form, durationYears: parseInt(v)})}
                    >
                      <SelectTrigger className="rounded-xl" data-testid="select-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">سنة واحدة</SelectItem>
                        <SelectItem value="2">سنتان</SelectItem>
                        <SelectItem value="3">3 سنوات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    كود الخصم (اختياري)
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      type="text"
                      placeholder="أدخل كود الخصم"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value.toUpperCase());
                        setDiscountResult(null);
                      }}
                      className="rounded-xl"
                      data-testid="input-discount-code"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={validateDiscountCode}
                      disabled={isValidating || !discountCode.trim()}
                      data-testid="button-validate-code"
                    >
                      {isValidating ? "..." : "تحقق"}
                    </Button>
                  </div>
                  {discountResult && (
                    <p className={`text-sm ${discountResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                      {discountResult.message}
                    </p>
                  )}
                </div>
                
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>السعر الأساسي:</span>
                      <span>{form.screenCount * getPricePerScreen() * form.durationYears} ريال</span>
                    </div>
                    {selectedPlan?.discountPercentage && selectedPlan.discountPercentage > 0 && (
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span>خصم الخطة ({selectedPlan.discountPercentage}%):</span>
                        <span>-{Math.round(form.screenCount * getPricePerScreen() * form.durationYears * selectedPlan.discountPercentage / 100)} ريال</span>
                      </div>
                    )}
                    {discountResult?.valid && (
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span>كود الخصم:</span>
                        <span>
                          {discountResult.discountType === 'percentage' 
                            ? `-${discountResult.discountValue}%` 
                            : `-${discountResult.discountValue} ريال`}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between items-center">
                      <span className="font-medium">السعر الإجمالي:</span>
                      <span className="text-2xl font-bold text-primary">
                        {calculateFinalPrice()} ريال
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {form.screenCount} شاشة × {getPricePerScreen()} ريال × {form.durationYears} سنة
                    </p>
                  </CardContent>
                </Card>
                <Button type="submit" disabled={createSubscription.isPending} className="w-full bg-primary rounded-xl" data-testid="button-confirm-subscription">
                  <CreditCard className="w-4 h-4 ml-2" />
                  {createSubscription.isPending ? "جاري الإنشاء..." : "تأكيد الاشتراك"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-gradient-to-l from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Monitor className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الشاشات المتاحة للإضافة</p>
                <p className="text-3xl font-bold text-foreground">{slotsData?.availableSlots || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 bg-muted/20 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed border-border rounded-3xl">
            <div className="p-6 bg-background rounded-full shadow-sm mb-4">
              <CreditCard className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">لا توجد اشتراكات</h3>
            <p className="text-muted-foreground mt-2 mb-6">أنشئ اشتراكًا جديدًا لتتمكن من إضافة شاشات</p>
            <Button onClick={() => {
              setIsOpen(true);
              if (plans.length > 0) setSelectedPlan(plans[0]);
            }} className="bg-primary rounded-xl" data-testid="button-create-first-subscription">
              إنشاء اشتراك جديد
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {activeSubscriptions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  الاشتراكات الفعّالة
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {activeSubscriptions.map((sub) => (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <SubscriptionCard sub={sub} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {expiredSubscriptions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="w-5 h-5" />
                  الاشتراكات المنتهية
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expiredSubscriptions.map((sub) => (
                    <Card key={sub.id} className="opacity-60" data-testid={`card-subscription-expired-${sub.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Monitor className="w-5 h-5" />
                            {sub.screenCount} شاشة
                          </CardTitle>
                          <Badge variant="destructive">منتهي</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>انتهى: {format(new Date(sub.endDate), 'dd MMMM yyyy', { locale: ar })}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
