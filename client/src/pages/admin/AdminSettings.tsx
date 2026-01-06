import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { SARIcon } from "@/components/ui/price";
import { Settings, Save, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettings() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [pricePerScreen, setPricePerScreen] = useState("");

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
  });

  useEffect(() => {
    if (settings) {
      setPricePerScreen(settings.price_per_screen || "50");
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("PATCH", "/api/admin/settings", { key, value });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || (language === 'ar' ? "حدث خطأ" : "An error occurred"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: language === 'ar' ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: language === 'ar' ? "خطأ" : "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSavePrice = () => {
    const price = parseInt(pricePerScreen, 10);
    if (isNaN(price) || price < 1) {
      toast({ 
        title: language === 'ar' ? "خطأ" : "Error", 
        description: language === 'ar' ? "يرجى إدخال سعر صالح" : "Please enter a valid price", 
        variant: "destructive" 
      });
      return;
    }
    updateSettingMutation.mutate({ key: "price_per_screen", value: String(price) });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">
            {language === 'ar' ? "إعدادات النظام" : "System Settings"}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? "تحكم في إعدادات التطبيق العامة" : "Manage general application settings"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {language === 'ar' ? "إعدادات الأسعار" : "Pricing Settings"}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? "تحكم في أسعار الاشتراكات" : "Manage subscription pricing"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerScreen">
                  {language === 'ar' ? "سعر الشاشة الواحدة (ريال سعودي / سنة)" : "Price per Screen (SAR / year)"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="pricePerScreen"
                    type="number"
                    min="1"
                    value={pricePerScreen}
                    onChange={(e) => setPricePerScreen(e.target.value)}
                    placeholder="50"
                    className="max-w-xs"
                    data-testid="input-price-per-screen"
                  />
                  <Button
                    onClick={handleSavePrice}
                    disabled={updateSettingMutation.isPending}
                    data-testid="button-save-price"
                  >
                    <Save className="w-4 h-4 ml-2" />
                    {updateSettingMutation.isPending 
                      ? (language === 'ar' ? "جاري الحفظ..." : "Saving...")
                      : (language === 'ar' ? "حفظ" : "Save")}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground inline-flex items-center gap-1 flex-wrap">
                  {language === 'ar' 
                    ? <>السعر الحالي: {settings?.price_per_screen || "50"} <SARIcon size={12} /> لكل شاشة في السنة</>
                    : <>Current price: {settings?.price_per_screen || "50"} <SARIcon size={12} /> per screen per year</>}
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">
                  {language === 'ar' ? "أمثلة على حساب السعر:" : "Price calculation examples:"}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="inline-flex items-center gap-1 flex-wrap">
                    {language === 'ar' 
                      ? <>شاشة واحدة لمدة سنة = {pricePerScreen || "50"} <SARIcon size={12} /></>
                      : <>1 screen for 1 year = {pricePerScreen || "50"} <SARIcon size={12} /></>}
                  </li>
                  <li className="inline-flex items-center gap-1 flex-wrap">
                    {language === 'ar' 
                      ? <>5 شاشات لمدة سنة = {(parseInt(pricePerScreen) || 50) * 5} <SARIcon size={12} /></>
                      : <>5 screens for 1 year = {(parseInt(pricePerScreen) || 50) * 5} <SARIcon size={12} /></>}
                  </li>
                  <li className="inline-flex items-center gap-1 flex-wrap">
                    {language === 'ar' 
                      ? <>5 شاشات لمدة سنتين = {(parseInt(pricePerScreen) || 50) * 5 * 2} <SARIcon size={12} /></>
                      : <>5 screens for 2 years = {(parseInt(pricePerScreen) || 50) * 5 * 2} <SARIcon size={12} /></>}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
