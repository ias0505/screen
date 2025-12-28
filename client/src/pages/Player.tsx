import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { useScreenSchedules, useScreen } from "@/hooks/use-screens";
import { useQuery, useMutation } from "@tanstack/react-query";
import { WifiOff, AlertCircle, CreditCard, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function Player() {
  const [, params] = useRoute("/player/:id");
  const screenId = params?.id ? parseInt(params.id) : 0;
  
  const [activationCode, setActivationCode] = useState("");
  const [activationError, setActivationError] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);
  const [isDeviceBound, setIsDeviceBound] = useState(false);
  
  const { data: screen } = useScreen(screenId);
  const { data: schedules = [], isLoading } = useScreenSchedules(screenId);
  const { data: playableStatus } = useQuery<{ playable: boolean; reason?: string }>({
    queryKey: ['/api/screens', screenId, 'playable'],
    enabled: screenId > 0 && isDeviceBound,
    refetchInterval: 60000,
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const preloadedImages = useRef<Set<string>>(new Set());

  // Check device binding on mount
  useEffect(() => {
    async function verifyDevice() {
      const deviceToken = localStorage.getItem(`device_token_${screenId}`);
      
      if (!deviceToken) {
        setIsVerifying(false);
        setIsDeviceBound(false);
        return;
      }
      
      try {
        const response = await fetch("/api/player/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken, screenId }),
        });
        
        const data = await response.json();
        
        if (data.bound) {
          setIsDeviceBound(true);
        } else {
          localStorage.removeItem(`device_token_${screenId}`);
          setIsDeviceBound(false);
        }
      } catch (error) {
        setIsDeviceBound(false);
      }
      
      setIsVerifying(false);
    }
    
    if (screenId > 0) {
      verifyDevice();
    }
  }, [screenId]);

  const activateMutation = useMutation({
    mutationFn: async (code: string) => {
      const deviceInfo = navigator.userAgent;
      const response = await apiRequest("POST", "/api/player/activate", {
        code,
        screenId,
        deviceInfo,
      });
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem(`device_token_${screenId}`, data.deviceToken);
      setIsDeviceBound(true);
      setActivationError("");
    },
    onError: (error: Error) => {
      setActivationError(error.message || "فشل في تفعيل الجهاز");
    },
  });

  // Preload all images on mount
  useEffect(() => {
    if (!isDeviceBound) return;
    schedules.forEach((item: any) => {
      if (item.mediaItem.type === 'image' && !preloadedImages.current.has(item.mediaItem.url)) {
        const img = new Image();
        img.src = item.mediaItem.url;
        preloadedImages.current.add(item.mediaItem.url);
      }
    });
  }, [schedules, isDeviceBound]);

  useEffect(() => {
    if (!isDeviceBound || !schedules.length) return;

    const currentItem = schedules[currentIndex] as any;
    const duration = (currentItem.duration || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % schedules.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, schedules.length, schedules, isDeviceBound]);

  // Loading state while verifying device
  if (isVerifying) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div>
      </div>
    );
  }

  // Activation form
  if (!isDeviceBound) {
    return (
      <div className="w-screen h-screen bg-zinc-900 flex items-center justify-center" dir="rtl">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">تفعيل الشاشة</CardTitle>
            <p className="text-muted-foreground mt-2">
              أدخل رمز التفعيل للوصول إلى محتوى الشاشة
            </p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (activationCode.trim()) {
                  activateMutation.mutate(activationCode.trim());
                }
              }}
              className="space-y-4"
            >
              <div>
                <Input
                  data-testid="input-activation-code"
                  type="text"
                  placeholder="أدخل رمز التفعيل"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                />
              </div>
              
              {activationError && (
                <p className="text-destructive text-sm text-center">{activationError}</p>
              )}
              
              <Button
                data-testid="button-activate"
                type="submit"
                className="w-full"
                disabled={activateMutation.isPending || activationCode.length < 4}
              >
                {activateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري التفعيل...
                  </>
                ) : (
                  "تفعيل"
                )}
              </Button>
            </form>
            
            <p className="text-xs text-muted-foreground text-center mt-6">
              احصل على رمز التفعيل من لوحة تحكم المدير
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div>
      </div>
    );
  }

  if (!screen) {
    return (
       <div className="w-screen h-screen bg-black flex items-center justify-center text-white flex-col gap-4">
        <WifiOff className="w-16 h-16 opacity-50" />
        <h1 className="text-2xl font-bold">الشاشة غير موجودة</h1>
      </div>
    );
  }

  if (playableStatus && !playableStatus.playable) {
    return (
      <div className="w-screen h-screen bg-zinc-900 flex flex-col items-center justify-center text-white" dir="rtl">
        <div className="w-32 h-32 rounded-full bg-red-900/30 flex items-center justify-center mb-8">
          <AlertCircle className="w-16 h-16 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold mb-4">الشاشة غير فعالة</h1>
        {playableStatus.reason === 'subscription_expired' && (
          <>
            <p className="text-zinc-400 text-xl mb-6">انتهى اشتراك المجموعة</p>
            <div className="flex items-center gap-2 bg-zinc-800 px-6 py-3 rounded-lg">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <span>يرجى تجديد الاشتراك لاستعادة عرض المحتوى</span>
            </div>
          </>
        )}
        {playableStatus.reason === 'no_subscription' && (
          <p className="text-zinc-400 text-xl">هذه المجموعة ليس لديها اشتراك فعال</p>
        )}
        {playableStatus.reason === 'no_group' && (
          <p className="text-zinc-400 text-xl">الشاشة غير مرتبطة بمجموعة</p>
        )}
        <p className="text-zinc-600 mt-8 text-sm">الشاشة: {screen.name}</p>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="w-screen h-screen bg-zinc-900 flex flex-col items-center justify-center text-white">
        <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center mb-8 animate-pulse">
          <div className="w-12 h-12 border-4 border-zinc-600 border-t-white rounded-full animate-spin"></div>
        </div>
        <h1 className="text-3xl font-bold mb-2">بانتظار المحتوى...</h1>
        <p className="text-zinc-400">الشاشة: {screen.name}</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {/* Render all items but only show current one */}
      {schedules.map((item: any, index: number) => (
        <div 
          key={item.id}
          className="absolute inset-0 w-full h-full"
          style={{ 
            visibility: index === currentIndex ? 'visible' : 'hidden',
            zIndex: index === currentIndex ? 1 : 0
          }}
        >
          {item.mediaItem.type === 'video' ? (
            <video 
              src={item.mediaItem.url} 
              autoPlay={index === currentIndex}
              muted 
              loop={false}
              className="w-full h-full object-contain"
            />
          ) : (
            <img 
              src={item.mediaItem.url} 
              alt={item.mediaItem.title} 
              className="w-full h-full object-cover"
            />
          )}
        </div>
      ))}
      
      <div className="absolute bottom-4 left-4 bg-black/50 text-white/50 text-xs p-2 rounded backdrop-blur-sm pointer-events-none z-10">
         {screen.name} • {currentIndex + 1}/{schedules.length}
      </div>
    </div>
  );
}
