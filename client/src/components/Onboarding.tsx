import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const companySchema = z.object({
  companyName: z.string().min(2, "اسم الشركة مطلوب (حرفين على الأقل)"),
});

type CompanyForm = z.infer<typeof companySchema>;

export default function Onboarding() {
  const { toast } = useToast();
  
  const form = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: { companyName: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: CompanyForm) => apiRequest('PATCH', '/api/user/company', data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user/profile'] });
      toast({ title: "تم حفظ اسم الشركة بنجاح" });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ", 
        description: error.message || "فشل حفظ اسم الشركة", 
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">مرحباً بك في منصة العرض</CardTitle>
          <CardDescription>
            للبدء، أدخل اسم شركتك أو مؤسستك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الشركة أو المؤسسة</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="مثال: شركة النور للتجارة"
                        data-testid="input-company-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={mutation.isPending}
                data-testid="button-save-company"
              >
                {mutation.isPending ? "جاري الحفظ..." : "بدء استخدام المنصة"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
