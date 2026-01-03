import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Redirect, Link } from "wouter";
import { Mail, Lock, User, Building2, Loader2, Languages } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import logoImage from "@assets/Meror_logo_v.1_1767180225600.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, isLoading, login, register, isLoggingIn, isRegistering } = useAuth();
  const { t, dir, language, setLanguage } = useLanguage();
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
          title: language === 'ar' ? "تم إنشاء الحساب بنجاح" : "Account created successfully",
          description: language === 'ar' ? "مرحباً بك في منصة إدارة الشاشات" : "Welcome to the screen management platform",
        });
      } else {
        await login({
          email: formData.email,
          password: formData.password,
        });
        toast({
          title: language === 'ar' ? "تم تسجيل الدخول بنجاح" : "Login successful",
          description: language === 'ar' ? "مرحباً بك مرة أخرى" : "Welcome back",
        });
      }
    } catch (error: any) {
      toast({
        title: t.messages.error,
        description: error.message || t.messages.error,
        variant: "destructive",
      });
    }
  };

  const isPending = isLoggingIn || isRegistering;
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden" dir={dir}>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="gap-2"
          data-testid="button-language-toggle"
        >
          <Languages className="w-4 h-4" />
          <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-2xl z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center mb-4">
            <img src={logoImage} alt="Meror" className="h-20 w-auto mb-3" />
            <p className="text-lg text-muted-foreground">
              {language === 'ar' ? 'مرآة محتواك الرقمي' : 'Your Digital Content Mirror'}
            </p>
          </div>
          <CardTitle className="text-2xl">
            {isRegisterMode ? t.auth.register : t.auth.login}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t.auth.firstName} *</Label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder={language === 'ar' ? 'أدخل اسمك الأول' : 'Enter your first name'}
                      className={isRTL ? 'pr-10' : 'pl-10'}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      data-testid="input-firstName"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">{t.auth.lastName}</Label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder={language === 'ar' ? 'أدخل اسمك الأخير (اختياري)' : 'Enter your last name (optional)'}
                      className={isRTL ? 'pr-10' : 'pl-10'}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      data-testid="input-lastName"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">{t.settings.companyName}</Label>
                  <div className="relative">
                    <Building2 className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder={language === 'ar' ? 'اسم شركتك (اختياري)' : 'Your company name (optional)'}
                      className={isRTL ? 'pr-10' : 'pl-10'}
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      data-testid="input-companyName"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email} *</Label>
              <div className="relative">
                <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  className={isRTL ? 'pr-10' : 'pl-10'}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">{t.auth.password} *</Label>
                {!isRegisterMode && (
                  <Link href="/forgot-password">
                    <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground" data-testid="link-forgot-password">
                      {t.auth.forgotPassword}
                    </Button>
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  id="password"
                  type="password"
                  placeholder={isRegisterMode 
                    ? (language === 'ar' ? '6 أحرف على الأقل' : 'At least 6 characters')
                    : (language === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password')
                  }
                  className={isRTL ? 'pr-10' : 'pl-10'}
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
              {isPending && <Loader2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} animate-spin`} />}
              {isRegisterMode ? t.auth.register : t.auth.login}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t.auth.or}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => window.location.href = "/api/auth/google"}
            data-testid="button-google-login"
          >
            <SiGoogle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t.auth.continueWithGoogle}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isRegisterMode ? t.auth.haveAccount : t.auth.noAccount}
              <Button
                variant="ghost"
                className={`p-0 ${isRTL ? 'mr-1' : 'ml-1'} h-auto text-primary`}
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                data-testid="button-toggle-mode"
              >
                {isRegisterMode ? t.auth.login : t.auth.register}
              </Button>
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            {language === 'ar' 
              ? 'بالتسجيل، أنت توافق على شروط الخدمة وسياسة الخصوصية'
              : 'By signing up, you agree to our Terms of Service and Privacy Policy'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
