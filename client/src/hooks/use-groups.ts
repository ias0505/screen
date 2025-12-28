import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
    mutationFn: async (group: InsertScreenGroup) => {
      const response = await fetch('/api/screen-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
      });
      if (!response.ok) throw new Error('Failed to create group');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screen-groups'] });
      toast({ title: "تم إنشاء المجموعة بنجاح" });
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
