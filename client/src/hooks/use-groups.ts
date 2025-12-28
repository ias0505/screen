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

export function useGroupSchedules(groupId: number) {
  return useQuery({
    queryKey: ['/api/group-schedules', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const res = await fetch(`/api/group-schedules/${groupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل الجدول");
      return res.json();
    },
    enabled: !!groupId,
  });
}

export function useCreateGroupSchedule() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { screenGroupId: number; mediaItemId: number; priority?: number; isActive?: boolean; duration?: number }) => {
      const response = await apiRequest('POST', '/api/group-schedules', data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-schedules', variables.screenGroupId] });
      toast({ title: "تمت الجدولة", description: "تمت إضافة المحتوى للجدول بنجاح" });
    },
  });
}

export function useDeleteGroupSchedule() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, groupId }: { id: number; groupId: number }) => {
      await apiRequest('DELETE', `/api/group-schedules/${id}`);
      return { groupId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-schedules', data.groupId] });
      toast({ title: "تم الحذف", description: "تم إزالة المحتوى من الجدول" });
    },
  });
}
