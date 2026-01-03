import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Monitor, 
  Upload, 
  Calendar, 
  Users, 
  Shield, 
  Zap,
  Globe,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Play,
  Smartphone,
  BarChart3
} from "lucide-react";
import logoImage from "@assets/Meror_logo_v.1_1767180225600.png";

export default function LandingPage() {
  const { language, setLanguage, dir } = useLanguage();

  const features = [
    {
      icon: Monitor,
      titleAr: "إدارة الشاشات",
      titleEn: "Screen Management",
      descAr: "تحكم كامل في جميع شاشات العرض من مكان واحد",
      descEn: "Full control of all display screens from one place"
    },
    {
      icon: Upload,
      titleAr: "مكتبة الوسائط",
      titleEn: "Media Library",
      descAr: "رفع وتنظيم الصور والفيديوهات بسهولة",
      descEn: "Upload and organize images and videos easily"
    },
    {
      icon: Calendar,
      titleAr: "جدولة ذكية",
      titleEn: "Smart Scheduling",
      descAr: "برمجة المحتوى للعرض في الأوقات المناسبة",
      descEn: "Schedule content to display at the right times"
    },
    {
      icon: Users,
      titleAr: "إدارة الفريق",
      titleEn: "Team Management",
      descAr: "صلاحيات متعددة المستويات لفريق العمل",
      descEn: "Multi-level permissions for your team"
    },
    {
      icon: Shield,
      titleAr: "أمان متقدم",
      titleEn: "Advanced Security",
      descAr: "حماية بياناتك مع تشفير من الدرجة الأولى",
      descEn: "Protect your data with top-tier encryption"
    },
    {
      icon: Zap,
      titleAr: "تحديث فوري",
      titleEn: "Instant Updates",
      descAr: "تغييرات تظهر على الشاشات في ثوانٍ",
      descEn: "Changes appear on screens in seconds"
    }
  ];

  const stats = [
    { value: "99.9%", labelAr: "وقت التشغيل", labelEn: "Uptime" },
    { value: "500+", labelAr: "عميل سعيد", labelEn: "Happy Clients" },
    { value: "10K+", labelAr: "شاشة نشطة", labelEn: "Active Screens" },
    { value: "24/7", labelAr: "دعم فني", labelEn: "Support" }
  ];

  const pricingPlans = [
    {
      nameAr: "الأساسية",
      nameEn: "Basic",
      screens: 5,
      price: 250,
      featuresAr: ["5 شاشات", "5 جيجا تخزين", "دعم بالبريد"],
      featuresEn: ["5 Screens", "5GB Storage", "Email Support"]
    },
    {
      nameAr: "الاحترافية",
      nameEn: "Professional",
      screens: 20,
      price: 1000,
      popular: true,
      featuresAr: ["20 شاشة", "20 جيجا تخزين", "دعم أولوية", "تقارير متقدمة"],
      featuresEn: ["20 Screens", "20GB Storage", "Priority Support", "Advanced Reports"]
    },
    {
      nameAr: "المؤسسات",
      nameEn: "Enterprise",
      screens: 100,
      price: 4000,
      featuresAr: ["100 شاشة", "تخزين غير محدود", "مدير حساب مخصص", "API كامل"],
      featuresEn: ["100 Screens", "Unlimited Storage", "Dedicated Manager", "Full API Access"]
    }
  ];

  const Arrow = language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Meror" className="h-10 w-auto" />
          </div>
          
          <div className="flex items-center gap-3">
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
            <Link href="/dashboard">
              <Button variant="default" className="gap-2" data-testid="button-login">
                {language === 'ar' ? 'دخول المنصة' : 'Enter Platform'}
                <Arrow className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[100px] animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[150px]" />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'منصة اللافتات الرقمية الأولى في السعودية' : 'Saudi Arabia\'s Leading Digital Signage Platform'}
              </span>
            </motion.div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              {language === 'ar' ? (
                <>
                  <span className="text-foreground">حوّل شاشاتك إلى</span>
                  <br />
                  <span className="bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">
                    قنوات تسويقية ذكية
                  </span>
                </>
              ) : (
                <>
                  <span className="text-foreground">Transform Your Screens Into</span>
                  <br />
                  <span className="bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">
                    Smart Marketing Channels
                  </span>
                </>
              )}
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'منصة متكاملة لإدارة اللافتات الرقمية، تحكم في محتوى شاشاتك من أي مكان وفي أي وقت'
                : 'A comprehensive digital signage platform. Control your screen content from anywhere, anytime'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2 text-lg px-8 py-6 shadow-lg shadow-primary/25" data-testid="button-start-free">
                  <Play className="w-5 h-5" />
                  {language === 'ar' ? 'ابدأ مجاناً' : 'Start Free'}
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="gap-2 text-lg px-8 py-6" data-testid="button-watch-demo">
                <Smartphone className="w-5 h-5" />
                {language === 'ar' ? 'شاهد العرض' : 'Watch Demo'}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-primary"
            />
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{language === 'ar' ? stat.labelAr : stat.labelEn}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'ar' ? 'كل ما تحتاجه في منصة واحدة' : 'Everything You Need in One Platform'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'أدوات قوية وسهلة الاستخدام لإدارة اللافتات الرقمية بكفاءة عالية'
                : 'Powerful and easy-to-use tools for efficient digital signage management'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover-elevate transition-all duration-300 border-border/50">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {language === 'ar' ? feature.titleAr : feature.titleEn}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === 'ar' ? feature.descAr : feature.descEn}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'ar' ? 'خطط أسعار مرنة' : 'Flexible Pricing Plans'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'اختر الخطة المناسبة لاحتياجات عملك'
                : 'Choose the plan that fits your business needs'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className={`h-full relative overflow-visible ${plan.popular ? 'border-primary shadow-lg shadow-primary/20' : 'border-border/50'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm rounded-full">
                      {language === 'ar' ? 'الأكثر شعبية' : 'Most Popular'}
                    </div>
                  )}
                  <CardContent className="p-6 pt-8">
                    <h3 className="text-xl font-semibold mb-2">
                      {language === 'ar' ? plan.nameAr : plan.nameEn}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'ر.س/سنة' : 'SAR/year'}
                      </span>
                    </div>
                    <ul className="space-y-3 mb-6">
                      {(language === 'ar' ? plan.featuresAr : plan.featuresEn).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/dashboard">
                      <Button 
                        className="w-full" 
                        variant={plan.popular ? "default" : "outline"}
                        data-testid={`button-plan-${index}`}
                      >
                        {language === 'ar' ? 'ابدأ الآن' : 'Get Started'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/10 to-blue-500/20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'ar' ? 'جاهز للبدء؟' : 'Ready to Get Started?'}
            </h2>
            <p className="text-muted-foreground mb-8">
              {language === 'ar' 
                ? 'انضم إلى آلاف العملاء الذين يثقون بنا في إدارة شاشاتهم'
                : 'Join thousands of customers who trust us to manage their screens'}
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 text-lg px-8 py-6 shadow-lg shadow-primary/25" data-testid="button-cta-start">
                {language === 'ar' ? 'إنشاء حساب مجاني' : 'Create Free Account'}
                <Arrow className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="Meror" className="h-8 w-auto" />
              <span className="text-muted-foreground">
                © 2025 Meror. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
              </span>
            </div>
            <div className="flex items-center gap-6 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                {language === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
