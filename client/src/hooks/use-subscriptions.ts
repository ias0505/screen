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
    mutationFn: async ({ screenCount, durationYears, discountCode }: { screenCount: number; durationYears: number; discountCode?: string }) => {
      const res = await apiRequest('POST', '/api/subscriptions', { screenCount, durationYears, discountCode });
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
    queryFn: async () => {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/screens-count`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!subscriptionId,
  });
}
