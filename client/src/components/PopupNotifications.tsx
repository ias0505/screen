import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface PopupNotification {
  id: number;
  title: string;
  message: string | null;
  imageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  targetUsers: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
}

export function PopupNotifications() {
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const { data: popups = [] } = useQuery<PopupNotification[]>({
    queryKey: ['/api/popups/active'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  const dismissMutation = useMutation({
    mutationFn: async (popupId: number) => {
      await apiRequest("POST", `/api/popups/${popupId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/popups/active'] });
    },
  });

  useEffect(() => {
    if (popups.length > 0 && currentPopupIndex < popups.length) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [popups, currentPopupIndex]);

  const handleDismiss = () => {
    const currentPopup = popups[currentPopupIndex];
    if (currentPopup) {
      dismissMutation.mutate(currentPopup.id);
    }
    
    if (currentPopupIndex < popups.length - 1) {
      setCurrentPopupIndex(currentPopupIndex + 1);
    } else {
      setIsOpen(false);
    }
  };

  const handleButtonClick = () => {
    const currentPopup = popups[currentPopupIndex];
    if (currentPopup?.buttonUrl) {
      window.open(currentPopup.buttonUrl, '_blank');
    }
    handleDismiss();
  };

  if (popups.length === 0 || currentPopupIndex >= popups.length) {
    return null;
  }

  const currentPopup = popups[currentPopupIndex];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{currentPopup.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {currentPopup.imageUrl && (
            <img
              src={currentPopup.imageUrl}
              alt={currentPopup.title}
              className="w-full rounded-lg object-cover max-h-48"
              data-testid="img-popup-image"
            />
          )}
          
          {currentPopup.message && (
            <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-popup-message">
              {currentPopup.message}
            </p>
          )}
          
          {currentPopup.buttonText && currentPopup.buttonUrl && (
            <div className="flex gap-2 justify-end pt-2">
              <Button onClick={handleButtonClick} data-testid="button-popup-action">
                {currentPopup.buttonText}
              </Button>
            </div>
          )}
          
          {popups.length > 1 && (
            <p className="text-xs text-muted-foreground text-center">
              {currentPopupIndex + 1} من {popups.length}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
