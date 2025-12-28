import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md bg-card border border-border/50 shadow-2xl rounded-3xl p-8 z-10 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
          <Monitor className="w-8 h-8" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-2">مرحباً بك</h1>
        <p className="text-muted-foreground mb-8">منصة إدارة الشاشات الذكية</p>

        <div className="space-y-4">
          <Button 
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-12 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
            onClick={() => window.location.href = "/api/login"}
          >
            تسجيل الدخول
          </Button>
          
          <p className="text-xs text-muted-foreground mt-4">
            بالتسجيل، أنت توافق على شروط الخدمة وسياسة الخصوصية
          </p>
        </div>
      </div>
    </div>
  );
}
