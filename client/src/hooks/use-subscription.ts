import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { SubscriptionPlan, UserSubscription } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type SubscriptionStatus = (UserSubscription & { plan: SubscriptionPlan }) | { status: 'none' };

export function useSubscriptionPlans() {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription/plans'],
  });
}

export function useSubscriptionStatus() {
  return useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
  });
}

export function useSubscribe() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) throw new Error('Failed to subscribe');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      toast({ title: "تم تحديث الاشتراك بنجاح" });
    },
  });
}
