import { useSubscriptionPlans, useSubscriptionStatus, useSubscribe } from "@/hooks/use-subscription";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, ScreenShare } from "lucide-react";
import { motion } from "framer-motion";

export default function Subscription() {
  const { data: plans = [] } = useSubscriptionPlans();
  const { data: status } = useSubscriptionStatus();
  const subscribe = useSubscribe();

  const currentPlanId = status && 'plan' in status ? status.plan.id : null;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">باقات الاشتراك</h1>
          <p className="text-muted-foreground text-lg">اختر الباقة المناسبة لاحتياجات عملك وحجم شاشاتك</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
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
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span>إدارة المجموعات والوسائط</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span>دعم فني متميز</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pb-8">
                  <Button 
                    className="w-full rounded-xl text-lg h-12"
                    variant={currentPlanId === plan.id ? "outline" : "default"}
                    disabled={currentPlanId === plan.id || subscribe.isPending}
                    onClick={() => subscribe.mutate(plan.id)}
                  >
                    {currentPlanId === plan.id ? 'مشترك بالفعل' : 'اشترك الآن'}
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
