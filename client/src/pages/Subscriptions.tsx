import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSubscriptions, useCreateSubscription, useAvailableSlots, useSubscriptionScreensCount } from "@/hooks/use-subscriptions";
import Layout from "@/components/Layout";
import { useLanguage } from "@/hooks/use-language";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  CreditCard, 
  Plus, 
  Calendar,
  Monitor,
  CheckCircle,
  AlertCircle,
  Tag,
  Check,
  Package,
  FileText
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
import { Link } from "wouter";
import type { Subscription, SubscriptionPlan, Invoice } from "@shared/schema";
import { SARIcon } from "@/components/ui/price";

interface DiscountValidation {
  valid: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  minScreens?: number;
  message: string;
}

function SubscriptionCard({ sub }: { sub: Subscription }) {
  const { t, language } = useLanguage();
  const { data: screensData } = useSubscriptionScreensCount(sub.id);
  const usedScreens = screensData?.count || 0;
  const dateLocale = language === 'ar' ? ar : enUS;
  
  const { data: invoicesList = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/subscriptions', sub.id, 'invoices'],
  });
  
  const latestInvoice = invoicesList[0];

  return (
    <Card data-testid={`card-subscription-${sub.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            {sub.screenCount} {t.subscriptions.screens}
          </CardTitle>
          <Badge variant="default" className="bg-green-500">{t.subscriptions.statusActive}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.subscriptions.usedScreens}</span>
            <Badge variant="outline">{usedScreens} / {sub.screenCount}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{t.subscriptions.expires}: {format(new Date(sub.endDate), 'dd MMMM yyyy', { locale: dateLocale })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span className="inline-flex items-center gap-1">{sub.totalPrice} <SARIcon size={12} /> ({sub.durationYears} {t.subscriptions.year})</span>
          </div>
          {latestInvoice && (
            <Link href={`/invoice/${latestInvoice.id}`}>
              <Button variant="outline" size="sm" className="w-full mt-2" data-testid={`button-view-invoice-${sub.id}`}>
                <FileText className="w-4 h-4 ml-2" />
                {t.subscriptions.viewInvoice}
              </Button>
            </Link>
          )}
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
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { data: slotsData } = useAvailableSlots();
  const createSubscription = useCreateSubscription();
  const dateLocale = language === 'ar' ? ar : enUS;
  
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription/plans'],
  });

  const { data: priceSettings } = useQuery<{ pricePerScreen: number }>({
    queryKey: ['/api/settings/price'],
  });
  const defaultPrice = priceSettings?.pricePerScreen || 50;
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
  const [form, setForm] = useState({ screenCount: 1, durationYears: 1, durationMonths: 1 });
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
    let basePrice: number;
    
    if (billingPeriod === 'monthly') {
      // السعر الشهري محدد مباشرة من المسؤول - لا يوجد قسمة
      basePrice = form.screenCount * pricePerScreen * form.durationMonths;
    } else {
      basePrice = form.screenCount * pricePerScreen * form.durationYears;
    }
    
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
      const errorData = await error.json?.() || { message: t.subscriptions.codeValidationError };
      setDiscountResult({ valid: false, message: errorData.message });
      toast({ title: errorData.message, variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalPrice = calculateFinalPrice();
    const durationText = billingPeriod === 'monthly' 
      ? `${form.durationMonths} ${t.subscriptions.month}`
      : `${form.durationYears} ${t.subscriptions.year}`;
    
    const confirmed = window.confirm(
      `${t.subscriptions.confirmCreateTitle}\n` +
      `${t.subscriptions.confirmScreenCount}: ${form.screenCount}\n` +
      `${t.subscriptions.confirmDuration}: ${durationText}\n` +
      `${t.subscriptions.confirmAmount}: ${finalPrice} ﷼` +
      (discountResult?.valid ? `\n${t.subscriptions.afterDiscount}` : '')
    );
    
    if (confirmed) {
      await createSubscription.mutateAsync({
        screenCount: form.screenCount,
        durationYears: billingPeriod === 'annual' ? form.durationYears : 0,
        durationMonths: billingPeriod === 'monthly' ? form.durationMonths : 0,
        billingPeriod,
        discountCode: discountResult?.valid ? discountCode : undefined,
        pricePerScreen: getPricePerScreen(),
        storagePerScreenMb: (selectedPlan as any)?.storagePerScreenMb || 1024
      });
      setIsOpen(false);
      setForm({ screenCount: 1, durationYears: 1, durationMonths: 1 });
      setBillingPeriod('annual');
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

  const getFilteredPlans = () => {
    return plans.filter(plan => 
      (plan as any).billingPeriod === billingPeriod || 
      (!(plan as any).billingPeriod && billingPeriod === 'annual')
    );
  };

  const findBestPlanForScreenCount = (count: number): SubscriptionPlan | null => {
    const filteredPlans = getFilteredPlans();
    const sortedPlans = [...filteredPlans].sort((a, b) => (a.minScreens || 1) - (b.minScreens || 1));
    
    const exactMatch = sortedPlans.find(p => {
      const min = p.minScreens || 1;
      const max = p.maxScreens;
      if (max !== null && max !== undefined) {
        return count >= min && count <= max;
      }
      return count >= min;
    });
    
    if (exactMatch) return exactMatch;
    
    const plansWithMax = sortedPlans.filter(p => p.maxScreens !== null && p.maxScreens !== undefined);
    if (plansWithMax.length > 0) {
      return plansWithMax.reduce((highest, current) => 
        (current.maxScreens || 0) > (highest.maxScreens || 0) ? current : highest
      );
    }
    
    return sortedPlans[sortedPlans.length - 1] || null;
  };

  const handleScreenCountChange = (newCount: number) => {
    setForm({ ...form, screenCount: newCount });
    
    const bestPlan = findBestPlanForScreenCount(newCount);
    if (bestPlan) {
      setSelectedPlan(bestPlan);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t.subscriptions.title}</h1>
            <p className="text-muted-foreground mt-1">{t.subscriptions.manageScreenSubscriptions}</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (open && plans.length > 0 && !selectedPlan) {
              const filtered = getFilteredPlans();
              if (filtered.length > 0) setSelectedPlan(filtered[0]);
            }
            if (!open) {
              setSelectedPlan(null);
              setDiscountCode("");
              setDiscountResult(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => { 
                  const filtered = getFilteredPlans();
                  if (filtered.length > 0) setSelectedPlan(filtered[0]); 
                }}
                className="gap-2 bg-primary rounded-xl px-6" 
                data-testid="button-add-subscription"
              >
                <Plus className="w-5 h-5" />
                <span>{t.subscriptions.newSubscription}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t.subscriptions.createNewSubscription}</DialogTitle>
              </DialogHeader>
              
              {plans.length > 0 && (
                <div className="space-y-4 pt-4">
                  <Label className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    {t.subscriptions.selectPlan}
                  </Label>
                  
                  <div className="flex gap-2 p-1 bg-muted rounded-xl">
                    <Button
                      type="button"
                      variant={billingPeriod === 'annual' ? 'default' : 'ghost'}
                      className={`flex-1 rounded-lg ${billingPeriod === 'annual' ? '' : 'hover:bg-transparent'}`}
                      onClick={() => {
                        setBillingPeriod('annual');
                        const annualPlans = plans.filter(p => (p as any).billingPeriod === 'annual' || !(p as any).billingPeriod);
                        if (annualPlans.length > 0) setSelectedPlan(annualPlans[0]);
                        else setSelectedPlan(null);
                      }}
                      data-testid="button-billing-annual-top"
                    >
                      {t.subscriptions.annual}
                    </Button>
                    <Button
                      type="button"
                      variant={billingPeriod === 'monthly' ? 'default' : 'ghost'}
                      className={`flex-1 rounded-lg ${billingPeriod === 'monthly' ? '' : 'hover:bg-transparent'}`}
                      onClick={() => {
                        setBillingPeriod('monthly');
                        const monthlyPlans = plans.filter(p => (p as any).billingPeriod === 'monthly');
                        if (monthlyPlans.length > 0) setSelectedPlan(monthlyPlans[0]);
                        else setSelectedPlan(null);
                      }}
                      data-testid="button-billing-monthly-top"
                    >
                      {t.subscriptions.monthly}
                    </Button>
                  </div>
                  {billingPeriod === 'annual' && (
                    <p className="text-xs text-green-600 text-center">{t.subscriptions.annualSaving}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getFilteredPlans()
                      .sort((a, b) => (a.minScreens || 1) - (b.minScreens || 1)).map((plan) => {
                      const features = parseFeatures(plan.features);
                      return (
                        <Card 
                          key={plan.id}
                          className={`cursor-pointer hover-elevate transition-all relative overflow-hidden ${selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => selectPlan(plan)}
                          data-testid={`card-plan-${plan.id}`}
                        >
                          {plan.discountPercentage !== null && plan.discountPercentage > 0 && (
                            <div className={`absolute bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold py-1.5 shadow-lg whitespace-nowrap text-center ${
                              language === 'ar' 
                                ? 'top-5 -left-12 transform -rotate-45 w-40' 
                                : 'top-5 -right-12 transform rotate-45 w-40'
                            }`}>
                              {t.subscriptions.discount} {plan.discountPercentage}%
                            </div>
                          )}
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-base">{language === 'en' && plan.nameEn ? plan.nameEn : plan.name}</CardTitle>
                              {plan.isDefault && (
                                <Badge variant="secondary" className="text-xs">{t.subscriptions.recommended}</Badge>
                              )}
                              {selectedPlan?.id === plan.id && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold inline-flex items-center gap-1">
                                {plan.pricePerScreen} <SARIcon size={18} />
                              </span>
                              <span className="text-muted-foreground text-sm">
                                {billingPeriod === 'monthly' 
                                  ? t.subscriptions.pricePerScreenPerMonth
                                  : t.subscriptions.pricePerScreenPerYear}
                              </span>
                            </div>
                            {(plan.description || plan.descriptionEn) && (
                              <p className="text-sm text-muted-foreground">{language === 'en' && plan.descriptionEn ? plan.descriptionEn : plan.description}</p>
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
                    <Label>{t.subscriptions.screenCount}</Label>
                    <Input 
                      type="number"
                      min={1}
                      value={form.screenCount} 
                      onChange={(e) => handleScreenCountChange(parseInt(e.target.value) || 1)}
                      className="rounded-xl"
                      data-testid="input-screen-count"
                    />
                    {selectedPlan?.minScreens && (
                      <p className="text-xs text-muted-foreground">{t.subscriptions.minimumScreens}: {selectedPlan.minScreens} {t.subscriptions.screens}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t.subscriptions.subscriptionDuration}</Label>
                    {billingPeriod === 'annual' ? (
                      <Select 
                        value={form.durationYears.toString()} 
                        onValueChange={(v) => setForm({...form, durationYears: parseInt(v)})}
                      >
                        <SelectTrigger className="rounded-xl" data-testid="select-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{t.subscriptions.oneYear}</SelectItem>
                          <SelectItem value="2">{t.subscriptions.twoYears}</SelectItem>
                          <SelectItem value="3">{t.subscriptions.threeYears}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select 
                        value={form.durationMonths.toString()} 
                        onValueChange={(v) => setForm({...form, durationMonths: parseInt(v)})}
                      >
                        <SelectTrigger className="rounded-xl" data-testid="select-duration-months">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{t.subscriptions.oneMonth}</SelectItem>
                          <SelectItem value="3">{t.subscriptions.threeMonths}</SelectItem>
                          <SelectItem value="6">{t.subscriptions.sixMonths}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {t.subscriptions.discountCodeOptional}
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      type="text"
                      placeholder={t.subscriptions.enterDiscountCode}
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
                      {isValidating ? "..." : t.subscriptions.verify}
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
                      <span>{t.subscriptions.basePrice}:</span>
                      <span className="inline-flex items-center gap-1">
                        {billingPeriod === 'monthly' 
                          ? form.screenCount * getPricePerScreen() * form.durationMonths
                          : form.screenCount * getPricePerScreen() * form.durationYears
                        } <SARIcon size={12} />
                      </span>
                    </div>
                    {selectedPlan?.discountPercentage && selectedPlan.discountPercentage > 0 && (
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span>{t.subscriptions.planDiscount} ({selectedPlan.discountPercentage}%):</span>
                        <span className="inline-flex items-center gap-1">
                          -{billingPeriod === 'monthly'
                            ? Math.round(form.screenCount * getPricePerScreen() * form.durationMonths * selectedPlan.discountPercentage / 100)
                            : Math.round(form.screenCount * getPricePerScreen() * form.durationYears * selectedPlan.discountPercentage / 100)
                          } <SARIcon size={12} />
                        </span>
                      </div>
                    )}
                    {discountResult?.valid && (
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span>{t.subscriptions.discountCodeLabel}:</span>
                        <span className="inline-flex items-center gap-1">
                          {discountResult.discountType === 'percentage' 
                            ? `-${discountResult.discountValue}%` 
                            : <><span>-{discountResult.discountValue}</span> <SARIcon size={12} /></>}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between items-center">
                      <span className="font-medium">{t.subscriptions.totalPrice}:</span>
                      <span className="text-2xl font-bold text-primary inline-flex items-center gap-1">
                        {calculateFinalPrice()} <SARIcon size={18} />
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1 flex-wrap">
                      {billingPeriod === 'monthly'
                        ? <>{form.screenCount} {t.subscriptions.screens} × {getPricePerScreen()} <SARIcon size={10} /> × {form.durationMonths} {t.subscriptions.month}</>
                        : <>{form.screenCount} {t.subscriptions.screens} × {getPricePerScreen()} <SARIcon size={10} /> × {form.durationYears} {t.subscriptions.year}</>
                      }
                    </p>
                  </CardContent>
                </Card>
                <Button type="submit" disabled={createSubscription.isPending} className="w-full bg-primary rounded-xl" data-testid="button-confirm-subscription">
                  <CreditCard className="w-4 h-4 ml-2" />
                  {createSubscription.isPending ? t.subscriptions.creating : t.subscriptions.confirmSubscription}
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
                <p className="text-sm text-muted-foreground">{t.subscriptions.availableScreensToAdd}</p>
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
            <h3 className="text-xl font-bold text-foreground">{t.subscriptions.noSubscriptions}</h3>
            <p className="text-muted-foreground mt-2 mb-6">{t.subscriptions.createFirstSubscription}</p>
            <Button onClick={() => {
              setIsOpen(true);
              if (plans.length > 0) setSelectedPlan(plans[0]);
            }} className="bg-primary rounded-xl" data-testid="button-create-first-subscription">
              {t.subscriptions.createNewSubscription}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {activeSubscriptions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {t.subscriptions.activeSubscriptions}
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
                  {t.subscriptions.expiredSubscriptions}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expiredSubscriptions.map((sub) => (
                    <Card key={sub.id} className="opacity-60" data-testid={`card-subscription-expired-${sub.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Monitor className="w-5 h-5" />
                            {sub.screenCount} {t.subscriptions.screens}
                          </CardTitle>
                          <Badge variant="destructive">{t.subscriptions.statusExpired}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{t.subscriptions.expired}: {format(new Date(sub.endDate), 'dd MMMM yyyy', { locale: dateLocale })}</span>
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
