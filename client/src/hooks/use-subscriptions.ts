import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Subscription } from "@shared/schema";

export function useSubscriptions() {
  return useQuery<Subscription[]>({
    queryKey: ['/api/subscriptions'],
  });
}

export function useAvailableSlots() {
  return useQuery<{ availableSlots: number }>({
    queryKey: ['/api/subscriptions/available-slots'],
  });
}

export function useCreateSubscription() {
  return useMutation({
    mutationFn: async ({ screenCount, durationYears, discountCode, pricePerScreen }: { screenCount: number; durationYears: number; discountCode?: string; pricePerScreen?: number }) => {
      const res = await apiRequest('POST', '/api/subscriptions', { screenCount, durationYears, discountCode, pricePerScreen });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/screens'] });
    },
  });
}

export function useSubscriptionScreensCount(subscriptionId: number) {
  return useQuery<{ count: number }>({
    queryKey: ['/api/subscriptions', subscriptionId, 'screens-count'],
    enabled: !!subscriptionId,
  });
}
