import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Monitor, Key, Loader2, QrCode, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface ActivationCodeData {
  code: string;
  expiresAt: string;
  screenId: number;
  pollingToken: string;
}

export default function Activate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [autoActivating, setAutoActivating] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedScreenId, setSelectedScreenId] = useState<number | null>(null);

  // Get screenId from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const screenIdParam = urlParams.get('screen');
    if (screenIdParam) {
      const id = parseInt(screenIdParam);
      if (!isNaN(id) && id > 0) {
        setSelectedScreenId(id);
        setShowQR(true);
      }
    }
  }, []);

  // Fetch activation code for QR display
  const { data: activationData } = useQuery<ActivationCodeData>({
    queryKey: ['/api/player', selectedScreenId, 'activation-code'],
    queryFn: async () => {
      const res = await fetch(`/api/player/${selectedScreenId}/activation-code`);
      if (!res.ok) throw new Error('Failed to fetch activation code');
      return res.json();
    },
    enabled: showQR && selectedScreenId !== null && selectedScreenId > 0,
    refetchInterval: 55000,
  });

  // Poll for activation status
  useEffect(() => {
    if (!showQR || !activationData?.code || !activationData?.pollingToken || !selectedScreenId) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/player/${selectedScreenId}/check-activation?code=${activationData.code}&pollingToken=${activationData.pollingToken}`
        );
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.activated && data.deviceToken) {
          localStorage.setItem(`screen_device_token_${selectedScreenId}`, data.deviceToken);
          toast({
            title: "تم التفعيل بنجاح",
            description: "جاري تحويلك لصفحة العرض...",
          });
          setTimeout(() => {
            setLocation(`/player/${selectedScreenId}`);
          }, 500);
        }
      } catch (error) {
        console.error('Activation poll error:', error);
      }
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, [showQR, activationData, selectedScreenId, setLocation, toast]);

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

  // Show QR code view
  if (showQR && selectedScreenId) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center text-white" dir="rtl">
        <div className="text-center max-w-lg px-4">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Monitor className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">تفعيل الشاشة</h1>
          <p className="text-zinc-400 text-lg mb-8">امسح الرمز من لوحة التحكم لربط هذا الجهاز</p>
          
          {activationData ? (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl inline-block">
                <QRCodeSVG 
                  value={`SCREEN:${selectedScreenId}:${activationData.code}`}
                  size={220}
                  level="H"
                  includeMargin
                />
              </div>
              
              <div className="bg-zinc-800 p-6 rounded-xl">
                <p className="text-sm text-zinc-400 mb-2">أو أدخل الرمز يدوياً</p>
                <p className="text-5xl font-mono font-bold tracking-[0.3em] text-white">
                  {activationData.code}
                </p>
              </div>
              
              <p className="text-zinc-500 text-sm flex items-center justify-center gap-2">
                <Key className="w-4 h-4" />
                رقم الشاشة: {selectedScreenId}
              </p>
            </div>
          ) : (
            <div className="animate-pulse">
              <div className="bg-zinc-800 w-64 h-64 rounded-2xl mx-auto"></div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            className="mt-8 text-zinc-400"
            onClick={() => {
              setShowQR(false);
              setSelectedScreenId(null);
            }}
            data-testid="button-back-to-manual"
          >
            العودة للإدخال اليدوي
          </Button>
        </div>
      </div>
    );
  }

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
          
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground mb-3">أو افتح صفحة العرض مباشرة</p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="رقم الشاشة"
                className="text-center"
                min={1}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  if (!isNaN(id) && id > 0) {
                    setSelectedScreenId(id);
                  }
                }}
                data-testid="input-screen-id"
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedScreenId && selectedScreenId > 0) {
                    setShowQR(true);
                  }
                }}
                disabled={!selectedScreenId || selectedScreenId <= 0}
                data-testid="button-show-qr"
              >
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
