import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendPasswordResetEmail(email: string, resetToken: string, appUrl: string): Promise<boolean> {
  if (!resend) {
    console.warn('Resend API key not configured (RESEND_API_KEY). Password reset email not sent.');
    return false;
  }

  const resetLink = `${appUrl}/reset-password?token=${resetToken}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Digital Signage <noreply@resend.dev>',
      to: email,
      subject: 'إعادة تعيين كلمة المرور',
      html: `
        <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">إعادة تعيين كلمة المرور</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
              مرحباً،
            </p>
            <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
              تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر أدناه لإنشاء كلمة مرور جديدة:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                إعادة تعيين كلمة المرور
              </a>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">
              أو انسخ الرابط التالي والصقه في متصفحك:
            </p>
            <p style="font-size: 12px; color: #6366f1; word-break: break-all; background: #f1f5f9; padding: 10px; border-radius: 6px;">
              ${resetLink}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            
            <p style="font-size: 14px; color: #64748b;">
              ⚠️ هذا الرابط صالح لمدة ساعة واحدة فقط.
            </p>
            <p style="font-size: 14px; color: #64748b;">
              إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.
            </p>
          </div>
          
          <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
            منصة العرض الرقمي - Digital Signage Platform
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }

    console.log('Password reset email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

// Welcome email on registration
export async function sendWelcomeEmail(email: string, firstName: string, appUrl: string): Promise<boolean> {
  if (!resend) {
    console.warn('Resend API key not configured. Welcome email not sent.');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Meror <noreply@resend.dev>',
      to: email,
      subject: 'مرحباً بك في منصة Meror',
      html: `
        <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center; border: 1px solid #e2e8f0; border-bottom: none;">
            <img src="${appUrl}/logo.png" alt="Meror" style="height: 60px;" />
          </div>
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 0 0 12px 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">مرحباً بك في Meror</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">مرآة محتواك الرقمي</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 18px; color: #334155; margin-bottom: 20px;">
              مرحباً ${firstName}،
            </p>
            <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
              شكراً لانضمامك إلى منصة Meror لإدارة الشاشات الرقمية. نحن سعداء بوجودك معنا!
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #6366f1; margin: 0 0 15px 0;">ابدأ الآن:</h3>
              <ul style="color: #475569; padding-right: 20px; margin: 0;">
                <li style="margin-bottom: 10px;">أضف اشتراكاً جديداً لتفعيل الشاشات</li>
                <li style="margin-bottom: 10px;">ارفع محتواك من صور وفيديوهات</li>
                <li style="margin-bottom: 10px;">جدول عرض المحتوى على شاشاتك</li>
                <li style="margin-bottom: 10px;">أضف أعضاء فريقك للتعاون</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" style="background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                الذهاب للوحة التحكم
              </a>
            </div>
          </div>
          
          <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
            Meror - منصة إدارة الشاشات الرقمية
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }

    console.log('Welcome email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

// Subscription confirmation email
export async function sendSubscriptionEmail(
  email: string, 
  firstName: string, 
  screenCount: number, 
  durationYears: number, 
  totalPrice: number,
  appUrl: string
): Promise<boolean> {
  if (!resend) {
    console.warn('Resend API key not configured. Subscription email not sent.');
    return false;
  }

  const vatRate = 0.15;
  const vatAmount = totalPrice * vatRate;
  const totalWithVat = totalPrice + vatAmount;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Meror <noreply@resend.dev>',
      to: email,
      subject: 'تأكيد اشتراكك في منصة Meror',
      html: `
        <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center; border: 1px solid #e2e8f0; border-bottom: none;">
            <img src="${appUrl}/logo.png" alt="Meror" style="height: 60px;" />
          </div>
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 0 0 12px 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">تم تأكيد اشتراكك</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 18px; color: #334155; margin-bottom: 20px;">
              مرحباً ${firstName}،
            </p>
            <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
              شكراً لاشتراكك في منصة Meror. تم تفعيل اشتراكك بنجاح.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <h3 style="color: #334155; margin: 0 0 15px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">تفاصيل الاشتراك:</h3>
              <table style="width: 100%; color: #475569;">
                <tr>
                  <td style="padding: 8px 0;">عدد الشاشات:</td>
                  <td style="padding: 8px 0; text-align: left; font-weight: bold;">${screenCount} شاشة</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">مدة الاشتراك:</td>
                  <td style="padding: 8px 0; text-align: left; font-weight: bold;">${durationYears} ${durationYears === 1 ? 'سنة' : 'سنوات'}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0;">المبلغ قبل الضريبة:</td>
                  <td style="padding: 8px 0; text-align: left;">${totalPrice.toFixed(2)} ر.س</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">ضريبة القيمة المضافة (15%):</td>
                  <td style="padding: 8px 0; text-align: left;">${vatAmount.toFixed(2)} ر.س</td>
                </tr>
                <tr style="border-top: 2px solid #e2e8f0;">
                  <td style="padding: 12px 0; font-weight: bold; font-size: 18px;">الإجمالي:</td>
                  <td style="padding: 12px 0; text-align: left; font-weight: bold; font-size: 18px; color: #6366f1;">${totalWithVat.toFixed(2)} ر.س</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/screens" style="background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                إدارة الشاشات
              </a>
            </div>
          </div>
          
          <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
            Meror - منصة إدارة الشاشات الرقمية
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending subscription email:', error);
      return false;
    }

    console.log('Subscription email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending subscription email:', error);
    return false;
  }
}

// Team member invitation email
export async function sendTeamInviteEmail(
  email: string, 
  inviterName: string,
  companyName: string,
  permission: string,
  appUrl: string
): Promise<boolean> {
  if (!resend) {
    console.warn('Resend API key not configured. Team invite email not sent.');
    return false;
  }

  const permissionLabels: Record<string, string> = {
    viewer: 'مشاهد (قراءة فقط)',
    editor: 'محرر (قراءة وكتابة)',
    manager: 'مدير (صلاحيات كاملة)',
  };

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Meror <noreply@resend.dev>',
      to: email,
      subject: `دعوة للانضمام إلى فريق ${companyName} في Meror`,
      html: `
        <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center; border: 1px solid #e2e8f0; border-bottom: none;">
            <img src="${appUrl}/logo.png" alt="Meror" style="height: 60px;" />
          </div>
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 0 0 12px 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">دعوة للانضمام للفريق</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
              مرحباً،
            </p>
            <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
              قام <strong>${inviterName}</strong> بدعوتك للانضمام إلى فريق <strong>${companyName}</strong> على منصة Meror لإدارة الشاشات الرقمية.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #475569;">
                <strong>الصلاحية الممنوحة:</strong> ${permissionLabels[permission] || permission}
              </p>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">
              سجل دخولك للمنصة وستجد الدعوة في انتظارك لقبولها.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/login" style="background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                تسجيل الدخول
              </a>
            </div>
          </div>
          
          <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
            Meror - منصة إدارة الشاشات الرقمية
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending team invite email:', error);
      return false;
    }

    console.log('Team invite email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending team invite email:', error);
    return false;
  }
}

// إشعار رسالة تواصل جديدة
export async function sendContactNotificationEmail(
  adminEmail: string,
  senderName: string,
  senderEmail: string,
  senderPhone: string,
  subject: string,
  message: string
): Promise<boolean> {
  if (!resend) {
    console.warn('Resend API key not configured (RESEND_API_KEY). Contact notification email not sent.');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Meror <noreply@meror.net>',
      to: adminEmail,
      subject: `رسالة جديدة: ${subject}`,
      html: `
        <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">رسالة جديدة من صفحة التواصل</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="margin-bottom: 20px;">
              <p style="font-size: 14px; color: #64748b; margin: 0 0 5px 0;">المرسل:</p>
              <p style="font-size: 16px; color: #334155; margin: 0; font-weight: bold;">${senderName}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <p style="font-size: 14px; color: #64748b; margin: 0 0 5px 0;">البريد الإلكتروني:</p>
              <p style="font-size: 16px; color: #334155; margin: 0;">
                <a href="mailto:${senderEmail}" style="color: #6366f1;">${senderEmail}</a>
              </p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <p style="font-size: 14px; color: #64748b; margin: 0 0 5px 0;">رقم الجوال:</p>
              <p style="font-size: 16px; color: #334155; margin: 0;">
                <a href="tel:${senderPhone}" style="color: #6366f1;">${senderPhone}</a>
              </p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <p style="font-size: 14px; color: #64748b; margin: 0 0 5px 0;">الموضوع:</p>
              <p style="font-size: 16px; color: #334155; margin: 0; font-weight: bold;">${subject}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            
            <div>
              <p style="font-size: 14px; color: #64748b; margin: 0 0 10px 0;">الرسالة:</p>
              <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="font-size: 16px; color: #334155; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
            </div>
          </div>
          
          <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
            Meror - منصة إدارة الشاشات الرقمية
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending contact notification email:', error);
      return false;
    }

    console.log('Contact notification email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending contact notification email:', error);
    return false;
  }
}
