import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPassword() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/auth/forgot-password", { email });
    },
    onSuccess: () => {
      setEmailSent(true);
    },
    onError: (error: any) => {
      toast({
        title: language === 'ar' ? "حدث خطأ" : "An error occurred",
        description: error.message || (language === 'ar' ? "يرجى المحاولة مرة أخرى" : "Please try again"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: language === 'ar' ? "البريد الإلكتروني مطلوب" : "Email is required",
        variant: "destructive",
      });
      return;
    }
    forgotPasswordMutation.mutate(email);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'ar' ? "تم إرسال الرابط" : "Link Sent"}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {language === 'ar' 
                ? "إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور."
                : "If the email is registered with us, you will receive a message containing a password reset link."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {language === 'ar' 
                ? "يرجى التحقق من صندوق البريد الوارد وكذلك مجلد الرسائل غير المرغوب فيها."
                : "Please check your inbox and spam folder."}
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/login">
                <Button className="w-full" data-testid="button-back-to-login">
                  {language === 'ar' ? "العودة لتسجيل الدخول" : "Back to Login"}
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                data-testid="button-try-again"
              >
                {language === 'ar' ? "إرسال رابط جديد" : "Send New Link"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {language === 'ar' ? "نسيت كلمة المرور؟" : "Forgot Password?"}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {language === 'ar' 
              ? "أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور"
              : "Enter your email and we'll send you a link to reset your password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                {language === 'ar' ? "البريد الإلكتروني" : "Email"}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={forgotPasswordMutation.isPending}
                data-testid="input-email"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={forgotPasswordMutation.isPending}
              data-testid="button-submit"
            >
              {forgotPasswordMutation.isPending ? (
                language === 'ar' ? "جارٍ الإرسال..." : "Sending..."
              ) : (
                <>
                  {language === 'ar' ? "إرسال رابط التعيين" : "Send Reset Link"}
                  {language === 'ar' ? <ArrowLeft className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                </>
              )}
            </Button>
            <div className="text-center">
              <Link href="/login">
                <Button variant="ghost" className="text-muted-foreground" data-testid="link-login">
                  {language === 'ar' ? "العودة لتسجيل الدخول" : "Back to Login"}
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
