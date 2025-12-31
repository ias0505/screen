import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { Mail, Lock, User, Building2, Loader2 } from "lucide-react";
import logoImage from "@assets/Meror_logo_v.1_1767180225600.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, isLoading, login, register, isLoggingIn, isRegistering } = useAuth();
  const { toast } = useToast();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    companyName: "",
  });

  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isRegisterMode) {
        await register({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName || undefined,
          companyName: formData.companyName || undefined,
        });
        toast({
          title: "تم إنشاء الحساب بنجاح",
          description: "مرحباً بك في منصة إدارة الشاشات",
        });
      } else {
        await login({
          email: formData.email,
          password: formData.password,
        });
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك مرة أخرى",
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء المعالجة",
        variant: "destructive",
      });
    }
  };

  const isPending = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Card className="w-full max-w-md shadow-2xl z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center mb-4">
            <img src={logoImage} alt="Meror" className="h-20 w-auto mb-3" />
            <p className="text-lg font-semibold text-primary">مرآة محتواك الرقمي</p>
          </div>
          <CardTitle className="text-2xl">
            {isRegisterMode ? "إنشاء حساب جديد" : "تسجيل الدخول"}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">الاسم الأول *</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="أدخل اسمك الأول"
                      className="pr-10"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      data-testid="input-firstName"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">الاسم الأخير</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="أدخل اسمك الأخير (اختياري)"
                      className="pr-10"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      data-testid="input-lastName"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">اسم الشركة</Label>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="اسم شركتك (اختياري)"
                      className="pr-10"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      data-testid="input-companyName"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني *</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  className="pr-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">كلمة المرور *</Label>
                {!isRegisterMode && (
                  <Link href="/forgot-password">
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground" data-testid="link-forgot-password">
                      نسيت كلمة المرور؟
                    </Button>
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={isRegisterMode ? "6 أحرف على الأقل" : "أدخل كلمة المرور"}
                  className="pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={isRegisterMode ? 6 : 1}
                  data-testid="input-password"
                />
              </div>
            </div>

            <Button 
              type="submit"
              size="lg"
              className="w-full"
              disabled={isPending}
              data-testid="button-submit"
            >
              {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {isRegisterMode ? "إنشاء الحساب" : "تسجيل الدخول"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isRegisterMode ? "لديك حساب بالفعل؟" : "ليس لديك حساب؟"}
              <Button
                variant="ghost"
                className="p-0 mr-1 h-auto text-primary"
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                data-testid="button-toggle-mode"
              >
                {isRegisterMode ? "تسجيل الدخول" : "إنشاء حساب جديد"}
              </Button>
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            بالتسجيل، أنت توافق على شروط الخدمة وسياسة الخصوصية
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
