import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { useScreenSchedules, useScreen } from "@/hooks/use-screens";
import { useQuery } from "@tanstack/react-query";
import { WifiOff, AlertCircle, CreditCard } from "lucide-react";

export default function Player() {
  const [, params] = useRoute("/player/:id");
  const screenId = params?.id ? parseInt(params.id) : 0;
  
  const { data: screen } = useScreen(screenId);
  const { data: schedules = [], isLoading } = useScreenSchedules(screenId);
  const { data: playableStatus } = useQuery<{ playable: boolean; reason?: string }>({
    queryKey: ['/api/screens', screenId, 'playable'],
    enabled: screenId > 0,
    refetchInterval: 60000,
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const preloadedImages = useRef<Set<string>>(new Set());

  // Preload all images on mount
  useEffect(() => {
    schedules.forEach((item: any) => {
      if (item.mediaItem.type === 'image' && !preloadedImages.current.has(item.mediaItem.url)) {
        const img = new Image();
        img.src = item.mediaItem.url;
        preloadedImages.current.add(item.mediaItem.url);
      }
    });
  }, [schedules]);

  useEffect(() => {
    if (!schedules.length) return;

    const currentItem = schedules[currentIndex] as any;
    // Use schedule's duration, not mediaItem's duration
    const duration = (currentItem.duration || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % schedules.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, schedules.length, schedules]);

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
