import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScreenGroup, ScreenGroupSubscription } from "@shared/schema";

export type GroupWithSubscription = ScreenGroup & { subscription?: ScreenGroupSubscription };

export function useGroupsWithSubscriptions() {
  return useQuery<GroupWithSubscription[]>({
    queryKey: ['/api/groups/with-subscriptions'],
  });
}

export function useCreateGroupSubscription() {
  return useMutation({
    mutationFn: async ({ groupId, maxScreens, durationYears }: { groupId: number; maxScreens: number; durationYears: number }) => {
      const res = await apiRequest('POST', `/api/groups/${groupId}/subscribe`, { maxScreens, durationYears });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups/with-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/screen-groups'] });
    },
  });
}
