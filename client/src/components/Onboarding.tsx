import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";

export default function Onboarding() {
  const { toast } = useToast();
  const { t, dir, language, setLanguage } = useLanguage();

  const companySchema = z.object({
    companyName: z.string().min(2, language === 'ar' 
      ? "اسم الشركة مطلوب (حرفين على الأقل)" 
      : "Company name required (at least 2 characters)"),
  });

  type CompanyForm = z.infer<typeof companySchema>;
  
  const form = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: { companyName: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: CompanyForm) => apiRequest('PATCH', '/api/user/company', data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user/profile'] });
      toast({ 
        title: language === 'ar' ? "تم حفظ اسم الشركة بنجاح" : "Company name saved successfully" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: t.messages.error, 
        description: error.message || (language === 'ar' ? "فشل حفظ اسم الشركة" : "Failed to save company name"), 
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={dir}>
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="gap-2"
          data-testid="button-language-toggle"
        >
          <Globe className="w-4 h-4" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </Button>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {language === 'ar' ? 'مرحباً بك في منصة العرض' : 'Welcome to the Display Platform'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'للبدء، أدخل اسم شركتك أو مؤسستك' 
              : 'To get started, enter your company or organization name'}
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
                    <FormLabel>
                      {language === 'ar' ? 'اسم الشركة أو المؤسسة' : 'Company or Organization Name'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={language === 'ar' ? 'مثال: شركة النور للتجارة' : 'Example: ABC Trading Company'}
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
                {mutation.isPending 
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                  : (language === 'ar' ? 'بدء استخدام المنصة' : 'Start Using the Platform')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
