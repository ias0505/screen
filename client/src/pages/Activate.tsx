import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, QrCode, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoImage from "@assets/Meror_logo_v.1_1767180225600.png";

function getDeviceId(): string {
  const storageKey = 'signage_device_id';
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    deviceId = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
}

function saveScreenBinding(screenId: number, deviceToken: string): void {
  localStorage.setItem('bound_screen_id', screenId.toString());
  localStorage.setItem(`screen_device_token_${screenId}`, deviceToken);
}

function getBoundScreen(): number | null {
  const screenId = localStorage.getItem('bound_screen_id');
  return screenId ? parseInt(screenId) : null;
}

export default function Activate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [deviceId] = useState(() => getDeviceId());
  const [isChecking, setIsChecking] = useState(true);
  const [isActivated, setIsActivated] = useState(false);
  const [activationMode, setActivationMode] = useState<'qr' | 'code'>('qr');
  const [manualCode, setManualCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const boundScreenId = getBoundScreen();
    if (boundScreenId) {
      const token = localStorage.getItem(`screen_device_token_${boundScreenId}`);
      if (token) {
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
            title: t.activation.deviceBindingSuccess,
            description: `${t.activation.deviceBoundToScreen} ${data.screenId}`,
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
  }, [deviceId, isChecking, isActivated, activationMode, setLocation, toast, t]);

  const handleManualActivation = async () => {
    if (!manualCode.trim() || manualCode.length !== 6) {
      toast({
        title: t.activation.invalidCode,
        description: t.activation.enterSixChars,
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
        throw new Error(data.message || t.activation.activationError);
      }
      
      setIsActivated(true);
      saveScreenBinding(data.screenId, data.deviceToken);
      
      toast({
        title: t.activation.activationSuccess,
        description: `${t.activation.screenActivated} ${data.screenName}`,
      });
      
      setTimeout(() => {
        setLocation(`/player/${data.screenId}`);
      }, 1500);
    } catch (error: any) {
      toast({
        title: t.activation.activationError,
        description: error.message || t.activation.invalidOrExpiredCode,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary z-10"></div>
      </div>
    );
  }

  if (isActivated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden" dir={dir}>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        <div className="text-center z-10">
          <img 
            src={logoImage} 
            alt="Meror" 
            className="h-16 mx-auto mb-8"
          />
          
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-binding-success">{t.activation.bindingSuccess}</h1>
          <p className="text-muted-foreground" data-testid="text-redirecting">{t.activation.redirectingToPlayer}</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mt-4 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden" dir={dir}>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      <div className="text-center max-w-lg px-4 z-10">
        <img 
          src={logoImage} 
          alt="Meror" 
          className="h-16 mx-auto mb-8"
        />
        
        <h1 className="text-4xl font-bold mb-2" data-testid="text-activation-title">{t.activation.title}</h1>
        <p className="text-muted-foreground text-lg mb-6" data-testid="text-activation-subtitle">
          {t.activation.chooseActivationMethod}
        </p>
        
        <div className="flex gap-2 justify-center mb-8">
          <Button
            variant={activationMode === 'qr' ? 'default' : 'outline'}
            className="gap-2 rounded-xl"
            onClick={() => setActivationMode('qr')}
            data-testid="button-mode-qr"
          >
            <QrCode className="w-4 h-4" />
            {t.activation.qrCode}
          </Button>
          <Button
            variant={activationMode === 'code' ? 'default' : 'outline'}
            className="gap-2 rounded-xl"
            onClick={() => setActivationMode('code')}
            data-testid="button-mode-code"
          >
            <Keyboard className="w-4 h-4" />
            {t.activation.enterCodeManual}
          </Button>
        </div>
        
        <div className="space-y-6">
          {activationMode === 'qr' ? (
            <>
              <p className="text-sm text-muted-foreground" data-testid="text-scan-instruction">
                {t.activation.scanFromDashboard}
              </p>
              <div className="bg-white p-6 rounded-2xl inline-block shadow-lg">
                <QRCodeSVG 
                  value={`DEVICE:${deviceId}`}
                  size={220}
                  level="H"
                  includeMargin
                />
              </div>
              
              <div className="bg-card border p-6 rounded-xl">
                <p className="text-sm text-muted-foreground mb-2" data-testid="text-device-id-label">{t.activation.deviceId}</p>
                <p className="text-4xl font-mono font-bold tracking-[0.2em]" data-testid="text-device-id">
                  {deviceId}
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span data-testid="text-waiting">{t.activation.waitingForBinding}</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground" data-testid="text-enter-code-instruction">
                {t.activation.enterSixDigitCode}
              </p>
              <div className="bg-card border p-6 rounded-xl space-y-4">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder={t.activation.enterCodePlaceholder}
                  className="text-center text-3xl font-mono tracking-[0.3em] h-16"
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
                      <Loader2 className={`w-5 h-5 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                      {t.activation.activating}
                    </>
                  ) : (
                    t.activation.activate
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground" data-testid="text-get-code-hint">
                {t.activation.getCodeFromScreensPage}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
