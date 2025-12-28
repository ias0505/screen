import { useState } from "react";
import { useSubscriptions, useCreateSubscription, useAvailableSlots } from "@/hooks/use-subscriptions";
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
  AlertCircle
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

export default function Subscriptions() {
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { data: slotsData } = useAvailableSlots();
  const createSubscription = useCreateSubscription();
  
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ screenCount: 5, durationYears: 1 });

  const activeSubscriptions = subscriptions.filter(s => 
    s.status === 'active' && new Date(s.endDate) > new Date()
  );
  const expiredSubscriptions = subscriptions.filter(s => 
    s.status === 'expired' || new Date(s.endDate) <= new Date()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalPrice = form.screenCount * 50 * form.durationYears;
    const confirmed = window.confirm(
      `هل تريد إنشاء اشتراك جديد؟\n` +
      `عدد الشاشات: ${form.screenCount}\n` +
      `المدة: ${form.durationYears} سنة\n` +
      `المبلغ: ${totalPrice} ريال`
    );
    
    if (confirmed) {
      await createSubscription.mutateAsync(form);
      setIsOpen(false);
      setForm({ screenCount: 5, durationYears: 1 });
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">الاشتراكات</h1>
            <p className="text-muted-foreground mt-1">إدارة اشتراكات الشاشات</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary rounded-xl px-6" data-testid="button-add-subscription">
                <Plus className="w-5 h-5" />
                <span>اشتراك جديد</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء اشتراك جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>عدد الشاشات</Label>
                  <Input 
                    type="number"
                    min={1}
                    max={100}
                    value={form.screenCount} 
                    onChange={(e) => setForm({...form, screenCount: parseInt(e.target.value) || 1})}
                    className="rounded-xl"
                    data-testid="input-screen-count"
                  />
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
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span>السعر الإجمالي:</span>
                      <span className="text-2xl font-bold text-primary">
                        {form.screenCount * 50 * form.durationYears} ريال
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {form.screenCount} شاشة × 50 ريال × {form.durationYears} سنة
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
            <Button onClick={() => setIsOpen(true)} className="bg-primary rounded-xl" data-testid="button-create-first-subscription">
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
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>ينتهي: {format(new Date(sub.endDate), 'dd MMMM yyyy', { locale: ar })}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <CreditCard className="w-4 h-4" />
                                <span>{sub.totalPrice} ريال ({sub.durationYears} سنة)</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
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
