import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScreenGroup, InsertScreenGroup, MediaGroup, InsertMediaGroup } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useScreenGroups() {
  return useQuery<ScreenGroup[]>({
    queryKey: ['/api/screen-groups'],
  });
}

export function useCreateScreenGroup() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (group: { name: string; description?: string }) => {
      const response = await apiRequest('POST', '/api/screen-groups', group);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screen-groups'] });
      toast({ title: "تم إنشاء المجموعة بنجاح" });
    },
  });
}

export function useDeleteScreenGroup() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/screen-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screen-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/screens'] });
      toast({ title: "تم حذف المجموعة بنجاح" });
    },
  });
}

export function useMediaGroups() {
  return useQuery<MediaGroup[]>({
    queryKey: ['/api/media-groups'],
  });
}

export function useCreateMediaGroup() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (group: InsertMediaGroup) => {
      const response = await fetch('/api/media-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
      });
      if (!response.ok) throw new Error('Failed to create group');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/media-groups'] });
      toast({ title: "تم إنشاء المجموعة بنجاح" });
    },
  });
}
