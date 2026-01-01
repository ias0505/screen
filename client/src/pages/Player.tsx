import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { WifiOff, AlertCircle, CreditCard, Monitor, Key } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

function getDeviceToken(screenId: number): string | null {
  return localStorage.getItem(`screen_device_token_${screenId}`) || 
         localStorage.getItem(`device_token_${screenId}`);
}

function saveDeviceToken(screenId: number, token: string): void {
  localStorage.setItem(`screen_device_token_${screenId}`, token);
}

interface ActivationCodeData {
  code: string;
  expiresAt: string;
  screenId: number;
  pollingToken: string;
}

export default function Player() {
  const [, params] = useRoute("/player/:id");
  const [, setLocation] = useLocation();
  const screenId = params?.id ? parseInt(params.id) : 0;
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isDeviceBound, setIsDeviceBound] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [showActivation, setShowActivation] = useState(false);
  
  // Fetch screen with device token header
  const { data: screen } = useQuery({
    queryKey: ['/api/screens', screenId, 'screen'],
    queryFn: async () => {
      const token = getDeviceToken(screenId);
      const res = await fetch(`/api/screens/${screenId}`, {
        headers: token ? { 'X-Device-Token': token } : {},
        credentials: 'include',
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: screenId > 0 && isDeviceBound,
  });
  
  // Fetch schedules with device token header
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['/api/schedules', screenId, 'player'],
    queryFn: async () => {
      const token = getDeviceToken(screenId);
      const res = await fetch(`/api/screens/${screenId}/schedules`, {
        headers: token ? { 'X-Device-Token': token } : {},
        credentials: 'include',
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: screenId > 0 && isDeviceBound,
    refetchInterval: 30000,
  });
  
  // Fetch playable status with device token header
  const { data: playableStatus } = useQuery<{ playable: boolean; reason?: string }>({
    queryKey: ['/api/screens', screenId, 'playable'],
    queryFn: async () => {
      const token = getDeviceToken(screenId);
      const res = await fetch(`/api/screens/${screenId}/playable`, {
        headers: token ? { 'X-Device-Token': token } : {},
      });
      return res.json();
    },
    enabled: screenId > 0 && isDeviceBound,
    refetchInterval: 60000,
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const preloadedImages = useRef<Set<string>>(new Set());

  // Fetch activation code for unbound screens
  const { data: activationData, refetch: refetchActivation } = useQuery<ActivationCodeData>({
    queryKey: ['/api/player', screenId, 'activation-code'],
    queryFn: async () => {
      const res = await fetch(`/api/player/${screenId}/activation-code`);
      if (!res.ok) throw new Error('Failed to fetch activation code');
      return res.json();
    },
    enabled: screenId > 0 && showActivation,
    refetchInterval: 55000, // Refresh before expiry
  });

  // Check device binding on mount - show activation screen if not bound
  useEffect(() => {
    async function verifyDevice() {
      const token = getDeviceToken(screenId);
      
      if (!token) {
        setShowActivation(true);
        setIsVerifying(false);
        return;
      }
      
      try {
        const response = await fetch("/api/player/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: token, screenId }),
        });
        
        const data = await response.json();
        
        if (data.bound) {
          setDeviceToken(token);
          setIsDeviceBound(true);
          setShowActivation(false);
          setIsVerifying(false);
        } else {
          localStorage.removeItem(`screen_device_token_${screenId}`);
          localStorage.removeItem(`device_token_${screenId}`);
          setShowActivation(true);
          setIsVerifying(false);
        }
      } catch (error) {
        setShowActivation(true);
        setIsVerifying(false);
      }
    }
    
    if (screenId > 0) {
      verifyDevice();
    }
  }, [screenId]);

  // Poll for activation status when showing activation screen
  useEffect(() => {
    if (!showActivation || !activationData?.code || !activationData?.pollingToken) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/player/${screenId}/check-activation?code=${activationData.code}&pollingToken=${activationData.pollingToken}`
        );
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.activated && data.deviceToken) {
          // Store the device token and mark as bound
          saveDeviceToken(screenId, data.deviceToken);
          setDeviceToken(data.deviceToken);
          setIsDeviceBound(true);
          setShowActivation(false);
        }
      } catch (error) {
        console.error('Activation poll error:', error);
      }
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, [showActivation, activationData, screenId]);

  // Send heartbeat every 30 seconds to update screen status
  useEffect(() => {
    if (!isDeviceBound || !screenId) return;
    
    const sendHeartbeat = async () => {
      try {
        const token = getDeviceToken(screenId);
        await fetch(`/api/screens/${screenId}/heartbeat`, {
          method: 'POST',
          headers: token ? { 'X-Device-Token': token } : {},
        });
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    };
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Send heartbeat every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);
    
    return () => clearInterval(interval);
  }, [isDeviceBound, screenId]);

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

  // Show activation screen with QR code
  if (showActivation) {
    return (
      <div className="w-screen h-screen bg-zinc-900 flex flex-col items-center justify-center text-white" dir="rtl">
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
                  value={`SCREEN:${screenId}:${activationData.code}`}
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
                رقم الشاشة: {screenId}
              </p>
            </div>
          ) : (
            <div className="animate-pulse">
              <div className="bg-zinc-800 w-64 h-64 rounded-2xl mx-auto"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isDeviceBound) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div>
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

  // For portrait orientation, rotate content 90 degrees
  // This is for landscape monitors mounted vertically - we rotate content to fill the vertical space
  const isPortrait = screen?.orientation === 'portrait';
  
  // Debug: log orientation for troubleshooting
  console.log('Screen orientation:', screen?.orientation, 'isPortrait:', isPortrait);
  
  if (isPortrait) {
    // Portrait mode: rotate the entire content area
    // The monitor is physically rotated 90 degrees (landscape screen mounted vertically)
    // So we rotate content 90 degrees to match
    return (
      <div className="w-screen h-screen bg-black overflow-hidden relative">
        {/* Rotated container for portrait mode */}
        <div 
          style={{
            position: 'absolute',
            width: '100vh',
            height: '100vw',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(90deg)',
            WebkitTransform: 'translate(-50%, -50%) rotate(90deg)',
            MozTransform: 'translate(-50%, -50%) rotate(90deg)',
            msTransform: 'translate(-50%, -50%) rotate(90deg)',
            transformOrigin: 'center center',
            WebkitTransformOrigin: 'center center',
          } as React.CSSProperties}
        >
          {schedules.map((item: any, index: number) => (
            <div 
              key={item.id}
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <img 
                  src={item.mediaItem.url} 
                  alt={item.mediaItem.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
          ))}
        </div>
        
        <div className="absolute bottom-4 left-4 bg-black/50 text-white/50 text-xs p-2 rounded backdrop-blur-sm pointer-events-none z-10">
           {screen.name} • {currentIndex + 1}/{schedules.length} • Portrait Mode
        </div>
      </div>
    );
  }
  
  // Landscape mode (default)
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
         {screen.name} • {currentIndex + 1}/{schedules.length} • Landscape (ori: {screen?.orientation || 'unknown'})
      </div>
    </div>
  );
}
