import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPassword() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const searchParams = useSearch();
  const token = new URLSearchParams(searchParams).get("token");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      return await apiRequest("POST", "/api/auth/reset-password", { token, newPassword });
    },
    onSuccess: () => {
      setResetSuccess(true);
      toast({
        title: language === 'ar' ? "تم تغيير كلمة المرور" : "Password Changed",
        description: language === 'ar' ? "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة" : "You can now log in with your new password",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === 'ar' ? "حدث خطأ" : "An error occurred",
        description: error.message || (language === 'ar' ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" : "Reset link is invalid or expired"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: language === 'ar' ? "يرجى ملء جميع الحقول" : "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: language === 'ar' ? "كلمة المرور قصيرة" : "Password too short",
        description: language === 'ar' ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: language === 'ar' ? "كلمات المرور غير متطابقة" : "Passwords do not match",
        description: language === 'ar' ? "يرجى التأكد من تطابق كلمتي المرور" : "Please make sure both passwords match",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      toast({
        title: language === 'ar' ? "رابط غير صالح" : "Invalid link",
        description: language === 'ar' ? "يرجى استخدام الرابط المرسل إلى بريدك الإلكتروني" : "Please use the link sent to your email",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'ar' ? "رابط غير صالح" : "Invalid Link"}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {language === 'ar' 
                ? "الرابط الذي استخدمته غير صالح أو منتهي الصلاحية"
                : "The link you used is invalid or expired"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/forgot-password">
              <Button className="w-full" data-testid="button-request-new-link">
                {language === 'ar' ? "طلب رابط جديد" : "Request New Link"}
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="w-full" data-testid="button-back-to-login">
                {language === 'ar' ? "العودة لتسجيل الدخول" : "Back to Login"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'ar' ? "تم تغيير كلمة المرور" : "Password Changed"}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {language === 'ar' 
                ? "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة."
                : "Password changed successfully. You can now log in with your new password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full" data-testid="button-go-to-login">
                {language === 'ar' ? "تسجيل الدخول" : "Login"}
              </Button>
            </Link>
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
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {language === 'ar' ? "إعادة تعيين كلمة المرور" : "Reset Password"}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {language === 'ar' ? "أدخل كلمة المرور الجديدة" : "Enter your new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">
                {language === 'ar' ? "كلمة المرور الجديدة" : "New Password"}
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder={language === 'ar' ? "أدخل كلمة المرور الجديدة" : "Enter new password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={resetPasswordMutation.isPending}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {language === 'ar' ? "تأكيد كلمة المرور" : "Confirm Password"}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={language === 'ar' ? "أعد إدخال كلمة المرور" : "Re-enter password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={resetPasswordMutation.isPending}
                data-testid="input-confirm-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending}
              data-testid="button-submit"
            >
              {resetPasswordMutation.isPending 
                ? (language === 'ar' ? "جارٍ الحفظ..." : "Saving...") 
                : (language === 'ar' ? "تحديث كلمة المرور" : "Update Password")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
