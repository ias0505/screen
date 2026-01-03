import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Globe } from "lucide-react";
import logoImage from "@assets/Meror_logo_v.1_1767180225600.png";

export default function PrivacyPolicy() {
  const { language, setLanguage, dir } = useLanguage();
  const Arrow = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <img src={logoImage} alt="Meror" className="h-10 w-auto" />
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="gap-2"
            >
              <Globe className="w-4 h-4" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <Arrow className="w-4 h-4" />
                {language === 'ar' ? 'الرجوع' : 'Back'}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">
          {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
          {language === 'ar' ? (
            <>
              <section>
                <h2 className="text-2xl font-semibold mb-4">مقدمة</h2>
                <p className="text-muted-foreground leading-relaxed">
                  نحن في منصة ميرور نلتزم بحماية خصوصية مستخدمينا. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك الشخصية عند استخدام خدماتنا.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">المعلومات التي نجمعها</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>معلومات الحساب: الاسم، البريد الإلكتروني، اسم الشركة</li>
                  <li>بيانات الاستخدام: كيفية تفاعلك مع المنصة</li>
                  <li>المحتوى المرفوع: الصور والفيديوهات التي ترفعها</li>
                  <li>معلومات الدفع: تتم معالجتها بشكل آمن عبر بوابات الدفع</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">كيف نستخدم معلوماتك</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>تقديم وتحسين خدماتنا</li>
                  <li>التواصل معك بخصوص حسابك</li>
                  <li>إرسال تحديثات مهمة عن الخدمة</li>
                  <li>ضمان أمان المنصة</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">حماية البيانات</h2>
                <p className="text-muted-foreground leading-relaxed">
                  نستخدم تقنيات تشفير متقدمة لحماية بياناتك. جميع الاتصالات مشفرة باستخدام بروتوكول SSL/TLS. نحتفظ بنسخ احتياطية منتظمة ونطبق أعلى معايير الأمان.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">حقوقك</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>الوصول إلى بياناتك الشخصية</li>
                  <li>تصحيح أي معلومات غير دقيقة</li>
                  <li>طلب حذف بياناتك</li>
                  <li>الاعتراض على معالجة بياناتك</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">التواصل معنا</h2>
                <p className="text-muted-foreground leading-relaxed">
                  إذا كان لديك أي استفسار حول سياسة الخصوصية، يمكنك التواصل معنا عبر صفحة اتصل بنا.
                </p>
              </section>

              <p className="text-sm text-muted-foreground mt-8">
                آخر تحديث: يناير 2025
              </p>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  At Meror, we are committed to protecting the privacy of our users. This policy explains how we collect, use, and protect your personal information when using our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Account Information: Name, email, company name</li>
                  <li>Usage Data: How you interact with the platform</li>
                  <li>Uploaded Content: Images and videos you upload</li>
                  <li>Payment Information: Processed securely via payment gateways</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Provide and improve our services</li>
                  <li>Communicate with you about your account</li>
                  <li>Send important service updates</li>
                  <li>Ensure platform security</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Data Protection</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use advanced encryption technologies to protect your data. All communications are encrypted using SSL/TLS protocol. We maintain regular backups and apply the highest security standards.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Access your personal data</li>
                  <li>Correct any inaccurate information</li>
                  <li>Request deletion of your data</li>
                  <li>Object to data processing</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about our privacy policy, please contact us through our Contact page.
                </p>
              </section>

              <p className="text-sm text-muted-foreground mt-8">
                Last updated: January 2025
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
