import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertMediaItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useMedia() {
  return useQuery({
    queryKey: [api.media.list.path],
    queryFn: async () => {
      const res = await fetch(api.media.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل المكتبة");
      return api.media.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertMediaItem) => {
      const validated = api.media.create.input.parse(data);
      const res = await fetch(api.media.create.path, {
        method: api.media.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.media.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('فشل في رفع المحتوى');
      }
      return api.media.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
      toast({
        title: "تم الرفع بنجاح",
        description: "تمت إضافة المحتوى إلى المكتبة",
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

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.media.delete.path, { id });
      const res = await fetch(url, { 
        method: api.media.delete.method, 
        credentials: "include" 
      });
      if (!res.ok) throw new Error('فشل في حذف المحتوى');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path] });
      toast({
        title: "تم الحذف",
        description: "تم حذف المحتوى بنجاح",
      });
    },
  });
}
