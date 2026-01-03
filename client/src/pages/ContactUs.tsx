import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  ArrowRight, 
  Globe, 
  Mail, 
  Phone, 
  MapPin,
  Send,
  Loader2
} from "lucide-react";
import logoImage from "@assets/Meror_logo_v.1_1767180225600.png";

export default function ContactUs() {
  const { language, setLanguage, dir } = useLanguage();
  const { toast } = useToast();
  const Arrow = language === 'ar' ? ArrowRight : ArrowLeft;
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: language === 'ar' ? 'تم إرسال رسالتك' : 'Message Sent',
      description: language === 'ar' 
        ? 'شكراً لتواصلك معنا، سنرد عليك في أقرب وقت' 
        : 'Thank you for contacting us, we will respond soon',
    });
    
    setForm({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  const contactInfo = [
    {
      icon: Mail,
      titleAr: "البريد الإلكتروني",
      titleEn: "Email",
      value: "support@meror.net"
    },
    {
      icon: Phone,
      titleAr: "الهاتف",
      titleEn: "Phone",
      value: "+966 50 000 0000"
    },
    {
      icon: MapPin,
      titleAr: "الموقع",
      titleEn: "Location",
      valueAr: "الرياض، المملكة العربية السعودية",
      valueEn: "Riyadh, Saudi Arabia"
    }
  ];

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

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'نحن هنا لمساعدتك. أرسل لنا رسالتك وسنرد عليك في أقرب وقت ممكن'
              : 'We are here to help. Send us your message and we will respond as soon as possible'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Form */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">
                {language === 'ar' ? 'أرسل رسالة' : 'Send a Message'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {language === 'ar' ? 'الاسم' : 'Name'}
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={language === 'ar' ? 'أدخل اسمك' : 'Enter your name'}
                    required
                    data-testid="input-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                    required
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">
                    {language === 'ar' ? 'الموضوع' : 'Subject'}
                  </Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder={language === 'ar' ? 'موضوع الرسالة' : 'Message subject'}
                    required
                    data-testid="input-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">
                    {language === 'ar' ? 'الرسالة' : 'Message'}
                  </Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
                    rows={5}
                    required
                    data-testid="input-message"
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isSubmitting} data-testid="button-submit">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {language === 'ar' ? 'جاري الإرسال...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {language === 'ar' ? 'إرسال الرسالة' : 'Send Message'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-6">
              {language === 'ar' ? 'معلومات التواصل' : 'Contact Information'}
            </h2>

            {contactInfo.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">
                      {language === 'ar' ? item.titleAr : item.titleEn}
                    </h3>
                    <p className="text-muted-foreground">
                      {item.valueAr && item.valueEn 
                        ? (language === 'ar' ? item.valueAr : item.valueEn)
                        : item.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">
                  {language === 'ar' ? 'ساعات العمل' : 'Working Hours'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'ar' 
                    ? 'الأحد - الخميس: 9 صباحاً - 6 مساءً'
                    : 'Sunday - Thursday: 9 AM - 6 PM'}
                </p>
                <p className="text-muted-foreground">
                  {language === 'ar' 
                    ? 'الجمعة - السبت: مغلق'
                    : 'Friday - Saturday: Closed'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
