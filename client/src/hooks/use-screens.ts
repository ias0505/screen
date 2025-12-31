import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertScreen, type InsertSchedule, type Screen, type Schedule } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useScreens() {
  return useQuery<Screen[]>({
    queryKey: [api.screens.list.path],
  });
}

export function useScreen(id: number) {
  return useQuery<Screen | null>({
    queryKey: ['/api/screens', id],
    enabled: !!id,
  });
}

export function useCreateScreen() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertScreen) => {
      const validated = api.screens.create.input.parse(data);
      const res = await apiRequest(api.screens.create.method, api.screens.create.path, validated);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.screens.list.path] });
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تمت إضافة الشاشة الجديدة إلى النظام",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useDeleteScreen() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.screens.delete.path, { id });
      await apiRequest(api.screens.delete.method, url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.screens.list.path] });
      toast({
        title: "تم الحذف",
        description: "تم حذف الشاشة بنجاح",
      });
    },
  });
}

export function useUpdateScreen() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; location?: string; orientation?: string; groupId?: number | null } }) => {
      const url = buildUrl(api.screens.update.path, { id });
      const res = await apiRequest(api.screens.update.method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.screens.list.path] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث معلومات الشاشة بنجاح",
      });
    },
  });
}

export function useScreenSchedules(screenId: number) {
  return useQuery<Schedule[]>({
    queryKey: ['/api/screens', screenId, 'schedules'],
    enabled: !!screenId,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertSchedule) => {
      const validated = api.schedules.create.input.parse(data);
      const res = await apiRequest(api.schedules.create.method, api.schedules.create.path, validated);
      return res.json();
    },
    onSuccess: (_, variables) => {
      if (variables.screenId) {
        queryClient.invalidateQueries({ queryKey: ['/api/screens', variables.screenId, 'schedules'] });
      }
      toast({
        title: "تمت الجدولة",
        description: "تمت إضافة المحتوى للجدول بنجاح",
      });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, screenId }: { id: number, screenId: number }) => {
      const url = buildUrl(api.schedules.delete.path, { id });
      await apiRequest(api.schedules.delete.method, url);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/screens', variables.screenId, 'schedules'] });
      toast({
        title: "تم الحذف",
        description: "تم إزالة المحتوى من الجدول",
      });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, duration, screenId, groupId }: { id: number; duration: number; screenId?: number; groupId?: number }) => {
      const res = await apiRequest('PATCH', `/api/schedules/${id}`, { duration });
      return { ...(await res.json()), screenId, groupId };
    },
    onSuccess: (data) => {
      if (data.screenId) {
        queryClient.invalidateQueries({ queryKey: ['/api/screens', data.screenId, 'schedules'] });
      }
      if (data.groupId) {
        queryClient.invalidateQueries({ queryKey: ['/api/group-schedules', data.groupId] });
      }
      toast({ title: "تم التحديث", description: "تم تحديث مدة العرض بنجاح" });
    },
  });
}

export function useReorderSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updates, screenId, groupId }: { 
      updates: { id: number; displayOrder: number }[]; 
      screenId?: number;
      groupId?: number;
    }) => {
      await apiRequest('PATCH', '/api/schedules/reorder', { updates });
      return { screenId, groupId };
    },
    onSuccess: (data) => {
      if (data.screenId) {
        queryClient.invalidateQueries({ queryKey: ['/api/screens', data.screenId, 'schedules'] });
      }
      if (data.groupId) {
        queryClient.invalidateQueries({ queryKey: ['/api/group-schedules', data.groupId] });
      }
    },
  });
}
