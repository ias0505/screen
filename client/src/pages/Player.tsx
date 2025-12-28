import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useScreenSchedules, useScreen } from "@/hooks/use-screens";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";

export default function Player() {
  const [, params] = useRoute("/player/:id");
  const screenId = params?.id ? parseInt(params.id) : 0;
  
  const { data: screen } = useScreen(screenId);
  const { data: schedules = [], isLoading } = useScreenSchedules(screenId);
  
  const [currentIndex, setCurrentIndex] = useState(0);

  // Cycle through content
  useEffect(() => {
    if (!schedules.length) return;

    const currentItem = schedules[currentIndex];
    const duration = (currentItem.mediaItem.duration || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % schedules.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, schedules.length]);

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

  if (schedules.length === 0) {
    return (
      <div className="w-screen h-screen bg-zinc-900 flex flex-col items-center justify-center text-white">
        <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center mb-8 animate-pulse">
           <span className="text-4xl">⏳</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">بانتظار المحتوى...</h1>
        <p className="text-zinc-400">الشاشة: {screen.name}</p>
      </div>
    );
  }

  const currentItem = schedules[currentIndex];

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id} // Unique key triggers exit/enter animation
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 w-full h-full"
        >
          {currentItem.mediaItem.type === 'video' ? (
             <video 
               src={currentItem.mediaItem.url} 
               autoPlay 
               muted 
               loop={false} // Let the timer handle transition, or loop if it's the only item
               className="w-full h-full object-contain"
             />
          ) : (
            <img 
              src={currentItem.mediaItem.url} 
              alt={currentItem.mediaItem.title} 
              className="w-full h-full object-cover"
            />
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Debug Info Overlay (Hidden in production or toggleable) */}
      <div className="absolute bottom-4 left-4 bg-black/50 text-white/50 text-xs p-2 rounded backdrop-blur-sm pointer-events-none">
         {screen.name} • {currentIndex + 1}/{schedules.length}
      </div>
    </div>
  );
}
