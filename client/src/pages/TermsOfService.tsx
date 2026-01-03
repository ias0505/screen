import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Globe } from "lucide-react";
import logoImage from "@assets/Meror_logo_v.1_1767180225600.png";

export default function TermsOfService() {
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
          {language === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
          {language === 'ar' ? (
            <>
              <section>
                <h2 className="text-2xl font-semibold mb-4">القبول بالشروط</h2>
                <p className="text-muted-foreground leading-relaxed">
                  باستخدامك لمنصة ميرور، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام خدماتنا.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">وصف الخدمة</h2>
                <p className="text-muted-foreground leading-relaxed">
                  توفر منصة ميرور خدمات إدارة اللافتات الرقمية تشمل:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>إدارة شاشات العرض</li>
                  <li>رفع وتنظيم المحتوى</li>
                  <li>جدولة عرض المحتوى</li>
                  <li>إدارة الفريق والصلاحيات</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">حسابات المستخدمين</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>يجب تقديم معلومات دقيقة عند التسجيل</li>
                  <li>أنت مسؤول عن الحفاظ على سرية حسابك</li>
                  <li>يجب إبلاغنا فوراً عن أي استخدام غير مصرح به</li>
                  <li>يحق لنا تعليق الحسابات المخالفة</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">الاشتراكات والدفع</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة 15%</li>
                  <li>الاشتراكات سنوية وتُجدد تلقائياً</li>
                  <li>يمكن إلغاء الاشتراك في أي وقت</li>
                  <li>لا يوجد استرداد للمبالغ المدفوعة</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">المحتوى المحظور</h2>
                <p className="text-muted-foreground leading-relaxed">
                  يُحظر رفع أو عرض:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>محتوى غير قانوني أو ضار</li>
                  <li>محتوى ينتهك حقوق الملكية الفكرية</li>
                  <li>محتوى مسيء أو تمييزي</li>
                  <li>برامج ضارة أو فيروسات</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">حدود المسؤولية</h2>
                <p className="text-muted-foreground leading-relaxed">
                  نسعى لتوفير خدمة موثوقة، لكننا لا نضمن التشغيل المستمر دون انقطاع. لن نكون مسؤولين عن أي أضرار غير مباشرة ناتجة عن استخدام الخدمة.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">التعديلات</h2>
                <p className="text-muted-foreground leading-relaxed">
                  نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">القانون المعمول به</h2>
                <p className="text-muted-foreground leading-relaxed">
                  تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختص المحاكم السعودية بالنظر في أي نزاع ينشأ عنها.
                </p>
              </section>

              <p className="text-sm text-muted-foreground mt-8">
                آخر تحديث: يناير 2025
              </p>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By using the Meror platform, you agree to comply with these terms and conditions. If you do not agree to any of these terms, please do not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Service Description</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Meror provides digital signage management services including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Display screen management</li>
                  <li>Content upload and organization</li>
                  <li>Content display scheduling</li>
                  <li>Team and permissions management</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>You must provide accurate information when registering</li>
                  <li>You are responsible for maintaining account confidentiality</li>
                  <li>You must notify us immediately of any unauthorized use</li>
                  <li>We reserve the right to suspend violating accounts</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Subscriptions and Payment</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Prices are in Saudi Riyals and include 15% VAT</li>
                  <li>Subscriptions are annual and auto-renew</li>
                  <li>You can cancel your subscription at any time</li>
                  <li>No refunds for paid amounts</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Prohibited Content</h2>
                <p className="text-muted-foreground leading-relaxed">
                  It is prohibited to upload or display:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Illegal or harmful content</li>
                  <li>Content that infringes intellectual property rights</li>
                  <li>Offensive or discriminatory content</li>
                  <li>Malware or viruses</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We strive to provide a reliable service, but we do not guarantee uninterrupted operation. We will not be liable for any indirect damages resulting from the use of the service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Modifications</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these terms at any time. You will be notified of any material changes via email.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These terms are governed by the laws of the Kingdom of Saudi Arabia, and Saudi courts have jurisdiction over any disputes arising therefrom.
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
