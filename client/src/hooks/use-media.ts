import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertMediaItem, type MediaItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useMedia() {
  return useQuery<MediaItem[]>({
    queryKey: [api.media.list.path],
  });
}

export function useCreateMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertMediaItem) => {
      const validated = api.media.create.input.parse(data);
      const res = await apiRequest(api.media.create.method, api.media.create.path, validated);
      return res.json();
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
      await apiRequest(api.media.delete.method, url);
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
