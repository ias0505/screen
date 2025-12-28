import { useSubscriptionPlans, useSubscriptionStatus, useSubscribe } from "@/hooks/use-subscription";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Crown, Zap, ScreenShare, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Subscription() {
  const { data: plans = [] } = useSubscriptionPlans();
  const { data: status } = useSubscriptionStatus();
  const subscribe = useSubscribe();

  const [customScreens, setCustomScreens] = useState(10);
  const [customDuration, setCustomDuration] = useState("1");

  const currentPlanId = status && 'plan' in status ? status.plan?.id : null;
  const isCustom = status && 'subscriptionType' in status && status.subscriptionType === 'custom';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">إدارة الاشتراك</h1>
          <p className="text-muted-foreground text-lg">اختر باقة جاهزة أو صمم اشتراكك الخاص حسب احتياجك</p>
        </div>

        {/* Custom Subscription Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`border-2 transition-all hover:shadow-xl ${isCustom ? 'border-primary shadow-lg' : 'border-border'}`}>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Settings2 className="w-6 h-6" />
              </div>
              <div>
                <CardTitle>اشتراك مخصص</CardTitle>
                <CardDescription>حدد عدد الشاشات والمدة التي تناسبك</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>عدد الشاشات</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="100" 
                      value={customScreens}
                      onChange={(e) => setCustomScreens(parseInt(e.target.value))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>مدة الاشتراك</Label>
                    <Select value={customDuration} onValueChange={setCustomDuration}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">سنة واحدة</SelectItem>
                        <SelectItem value="2">سنتين</SelectItem>
                        <SelectItem value="3">3 سنوات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-2xl p-6 flex flex-col justify-center text-center">
                  <p className="text-sm text-muted-foreground mb-1">السعر التقريبي</p>
                  <p className="text-3xl font-bold">
                    {(customScreens * 50 * parseInt(customDuration)).toFixed(2)} ر.س
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">السعر يعتمد على عدد الشاشات المختار</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full rounded-xl text-lg h-12"
                variant={isCustom ? "outline" : "default"}
                disabled={subscribe.isPending}
                onClick={() => {
                  subscribe.mutate({ 
                    type: 'custom', 
                    maxScreens: customScreens, 
                    durationYears: parseInt(customDuration) 
                  });
                }}
              >
                {isCustom ? 'تحديث الاشتراك المخصص' : 'تفعيل الاشتراك المخصص'}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground font-medium">أو اختر من الباقات الجاهزة</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={`relative flex flex-col h-full border-2 transition-all hover:shadow-xl ${
                currentPlanId === plan.id ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
              }`}>
                {currentPlanId === plan.id && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    باقتك الحالية
                  </div>
                )}
                
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {idx === 0 ? <Zap className="w-6 h-6" /> : idx === 1 ? <ScreenShare className="w-6 h-6" /> : <Crown className="w-6 h-6" />}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-lg font-bold text-foreground mt-2">
                    {plan.price === 0 ? 'مجاناً' : `${(plan.price / 100).toFixed(2)} ر.س / شهرياً`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground text-center">{plan.description}</p>
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span>حتى {plan.maxScreens} شاشات عرض</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pb-8">
                  <Button 
                    className="w-full rounded-xl text-lg h-12"
                    variant={currentPlanId === plan.id ? "outline" : "default"}
                    disabled={currentPlanId === plan.id || subscribe.isPending}
                    onClick={() => {
                      if (plan.price > 0) {
                        const confirmPay = window.confirm(`هل ترغب في محاكاة عملية الدفع لمبلغ ${(plan.price / 100).toFixed(2)} ر.س؟\n(هذه مجرد تجربة محاكاة)`);
                        if (!confirmPay) return;
                      }
                      subscribe.mutate({ type: 'plan', planId: plan.id });
                    }}
                  >
                    {subscribe.isPending ? 'جاري المعالجة...' : currentPlanId === plan.id ? 'مشترك بالفعل' : 'اشترك الآن'}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
