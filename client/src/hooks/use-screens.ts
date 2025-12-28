import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertScreen, type InsertSchedule } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useScreens() {
  return useQuery({
    queryKey: [api.screens.list.path],
    queryFn: async () => {
      const res = await fetch(api.screens.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل الشاشات");
      return api.screens.list.responses[200].parse(await res.json());
    },
  });
}

export function useScreen(id: number) {
  return useQuery({
    queryKey: [api.screens.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.screens.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("فشل في تحميل الشاشة");
      return api.screens.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateScreen() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertScreen) => {
      const validated = api.screens.create.input.parse(data);
      const res = await fetch(api.screens.create.path, {
        method: api.screens.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.screens.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('فشل في إضافة الشاشة');
      }
      return api.screens.create.responses[201].parse(await res.json());
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
      const res = await fetch(url, { 
        method: api.screens.delete.method, 
        credentials: "include" 
      });
      
      if (!res.ok) throw new Error('فشل في حذف الشاشة');
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
    mutationFn: async ({ id, data }: { id: number; data: { groupId: number | null } }) => {
      const url = buildUrl(api.screens.update.path, { id });
      const res = await fetch(url, {
        method: api.screens.update.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error('فشل في تحديث الشاشة');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.screens.list.path] });
    },
  });
}

export function useScreenSchedules(screenId: number) {
  return useQuery({
    queryKey: [api.schedules.list.path, screenId],
    queryFn: async () => {
      const url = buildUrl(api.schedules.list.path, { screenId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل الجدول");
      return api.schedules.list.responses[200].parse(await res.json());
    },
    enabled: !!screenId,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertSchedule) => {
      const validated = api.schedules.create.input.parse(data);
      const res = await fetch(api.schedules.create.path, {
        method: api.schedules.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error('فشل في جدولة المحتوى');
      return api.schedules.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      if (variables.screenId) {
        queryClient.invalidateQueries({ queryKey: [api.schedules.list.path, variables.screenId] });
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
      const res = await fetch(url, { 
        method: api.schedules.delete.method, 
        credentials: "include" 
      });
      if (!res.ok) throw new Error('فشل في حذف العنصر من الجدول');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.schedules.list.path, variables.screenId] });
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
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration }),
        credentials: "include",
      });
      if (!res.ok) throw new Error('فشل في تحديث المدة');
      return { ...(await res.json()), screenId, groupId };
    },
    onSuccess: (data) => {
      if (data.screenId) {
        queryClient.invalidateQueries({ queryKey: [api.schedules.list.path, data.screenId] });
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
      const res = await fetch('/api/schedules/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
        credentials: "include",
      });
      if (!res.ok) throw new Error('فشل في إعادة الترتيب');
      return { screenId, groupId };
    },
    onSuccess: (data) => {
      if (data.screenId) {
        queryClient.invalidateQueries({ queryKey: [api.schedules.list.path, data.screenId] });
      }
      if (data.groupId) {
        queryClient.invalidateQueries({ queryKey: ['/api/group-schedules', data.groupId] });
      }
    },
  });
}
