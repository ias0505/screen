import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Monitor, Key, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Activate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [autoActivating, setAutoActivating] = useState(false);

  const activateMutation = useMutation({
    mutationFn: async (activationCode: string) => {
      const response = await fetch("/api/screens/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activationCode }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل التفعيل");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem(`screen_device_token_${data.screenId}`, data.deviceToken);
      toast({
        title: "تم التفعيل بنجاح",
        description: "جاري تحويلك لصفحة العرض...",
      });
      setTimeout(() => {
        setLocation(`/player/${data.screenId}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في التفعيل",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl && codeFromUrl.length === 6) {
      setCode(codeFromUrl.toUpperCase());
      setAutoActivating(true);
      activateMutation.mutate(codeFromUrl.toUpperCase());
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) {
      activateMutation.mutate(code.trim().toUpperCase());
    }
  };

  return (
    <div 
      className="min-h-screen bg-background flex items-center justify-center p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit">
            {autoActivating ? (
              <QrCode className="w-12 h-12 text-primary" />
            ) : (
              <Monitor className="w-12 h-12 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {autoActivating ? 'جاري التفعيل...' : 'تفعيل الشاشة'}
          </CardTitle>
          <p className="text-muted-foreground">
            {autoActivating 
              ? 'تم مسح رمز QR، جاري ربط الجهاز بالشاشة...'
              : 'أدخل رمز التفعيل المكون من 6 أحرف لربط هذا الجهاز بالشاشة'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="XXXXXX"
                className="text-center text-3xl font-mono tracking-[0.5em] h-16 rounded-xl"
                maxLength={6}
                autoFocus
                data-testid="input-activation-code"
              />
              <p className="text-xs text-muted-foreground text-center">
                احصل على الرمز من لوحة التحكم
              </p>
            </div>
            
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={code.length !== 6 || activateMutation.isPending}
              data-testid="button-activate"
            >
              {activateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التفعيل...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  تفعيل الشاشة
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
