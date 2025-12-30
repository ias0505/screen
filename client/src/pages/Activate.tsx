import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Monitor, Loader2, CheckCircle, Smartphone, QrCode, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Generate or retrieve persistent device ID
function getDeviceId(): string {
  const storageKey = 'signage_device_id';
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    // Generate a unique device ID (8 characters)
    deviceId = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
}

// Save bound screen info
function saveScreenBinding(screenId: number, deviceToken: string): void {
  localStorage.setItem('bound_screen_id', screenId.toString());
  localStorage.setItem(`screen_device_token_${screenId}`, deviceToken);
}

// Get bound screen
function getBoundScreen(): number | null {
  const screenId = localStorage.getItem('bound_screen_id');
  return screenId ? parseInt(screenId) : null;
}

export default function Activate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deviceId] = useState(() => getDeviceId());
  const [isChecking, setIsChecking] = useState(true);
  const [isActivated, setIsActivated] = useState(false);
  const [activationMode, setActivationMode] = useState<'qr' | 'code'>('qr');
  const [manualCode, setManualCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if device is already bound on mount
  useEffect(() => {
    const boundScreenId = getBoundScreen();
    if (boundScreenId) {
      const token = localStorage.getItem(`screen_device_token_${boundScreenId}`);
      if (token) {
        // Verify binding is still valid
        fetch("/api/player/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: token, screenId: boundScreenId }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.bound) {
              setLocation(`/player/${boundScreenId}`);
            } else {
              // Clear invalid binding
              localStorage.removeItem('bound_screen_id');
              localStorage.removeItem(`screen_device_token_${boundScreenId}`);
              setIsChecking(false);
            }
          })
          .catch(() => setIsChecking(false));
      } else {
        setIsChecking(false);
      }
    } else {
      setIsChecking(false);
    }
  }, [setLocation]);

  // Poll for device binding status (only in QR mode)
  useEffect(() => {
    if (isChecking || isActivated || activationMode !== 'qr') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}/check-binding`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.bound && data.screenId && data.deviceToken) {
          setIsActivated(true);
          saveScreenBinding(data.screenId, data.deviceToken);
          
          toast({
            title: "تم ربط الجهاز بنجاح",
            description: `تم ربط هذا الجهاز بالشاشة رقم ${data.screenId}`,
          });
          
          setTimeout(() => {
            setLocation(`/player/${data.screenId}`);
          }, 1500);
        }
      } catch (error) {
        console.error('Binding check error:', error);
      }
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, [deviceId, isChecking, isActivated, activationMode, setLocation, toast]);

  // Handle manual code activation
  const handleManualActivation = async () => {
    if (!manualCode.trim() || manualCode.length !== 6) {
      toast({
        title: "رمز غير صالح",
        description: "يرجى إدخال رمز من 6 أحرف",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: manualCode.toUpperCase() }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "فشل التفعيل");
      }
      
      setIsActivated(true);
      saveScreenBinding(data.screenId, data.deviceToken);
      
      toast({
        title: "تم التفعيل بنجاح",
        description: `تم تفعيل الشاشة: ${data.screenName}`,
      });
      
      setTimeout(() => {
        setLocation(`/player/${data.screenId}`);
      }, 1500);
    } catch (error: any) {
      toast({
        title: "خطأ في التفعيل",
        description: error.message || "رمز غير صالح أو منتهي الصلاحية",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div>
      </div>
    );
  }

  if (isActivated) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center text-white" dir="rtl">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">تم الربط بنجاح</h1>
          <p className="text-zinc-400">جاري تحويلك لصفحة العرض...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mt-4 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center text-white" dir="rtl">
      <div className="text-center max-w-lg px-4">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Smartphone className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-2">تفعيل الشاشة</h1>
        <p className="text-zinc-400 text-lg mb-6">
          اختر طريقة التفعيل المناسبة
        </p>
        
        {/* Mode Toggle */}
        <div className="flex gap-2 justify-center mb-8">
          <Button
            variant={activationMode === 'qr' ? 'default' : 'outline'}
            className="gap-2 rounded-xl"
            onClick={() => setActivationMode('qr')}
            data-testid="button-mode-qr"
          >
            <QrCode className="w-4 h-4" />
            رمز QR
          </Button>
          <Button
            variant={activationMode === 'code' ? 'default' : 'outline'}
            className="gap-2 rounded-xl"
            onClick={() => setActivationMode('code')}
            data-testid="button-mode-code"
          >
            <Keyboard className="w-4 h-4" />
            إدخال الرمز
          </Button>
        </div>
        
        <div className="space-y-6">
          {activationMode === 'qr' ? (
            <>
              <p className="text-sm text-zinc-400">
                امسح هذا الرمز من لوحة التحكم لربط الجهاز بشاشة
              </p>
              <div className="bg-white p-6 rounded-2xl inline-block">
                <QRCodeSVG 
                  value={`DEVICE:${deviceId}`}
                  size={220}
                  level="H"
                  includeMargin
                />
              </div>
              
              <div className="bg-zinc-800 p-6 rounded-xl">
                <p className="text-sm text-zinc-400 mb-2">رقم تعريف الجهاز</p>
                <p className="text-4xl font-mono font-bold tracking-[0.2em] text-white">
                  {deviceId}
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>في انتظار الربط من لوحة التحكم...</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400">
                أدخل رمز التفعيل المكون من 6 أحرف الذي تم إنشاؤه من لوحة التحكم
              </p>
              <div className="bg-zinc-800 p-6 rounded-xl space-y-4">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="أدخل الرمز"
                  className="text-center text-3xl font-mono tracking-[0.3em] h-16 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500"
                  maxLength={6}
                  data-testid="input-activation-code"
                />
                <Button
                  onClick={handleManualActivation}
                  disabled={isSubmitting || manualCode.length !== 6}
                  className="w-full h-12 text-lg rounded-xl"
                  data-testid="button-submit-code"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                      جاري التفعيل...
                    </>
                  ) : (
                    "تفعيل"
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-zinc-500">
                يمكنك الحصول على رمز التفعيل من صفحة الشاشات في لوحة التحكم
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
