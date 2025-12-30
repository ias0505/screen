import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetToken: string, appUrl: string): Promise<boolean> {
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
