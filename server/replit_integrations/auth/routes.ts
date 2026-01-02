import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcrypt";
import { registerSchema, loginSchema } from "@shared/schema";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../../email";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // Support both Replit Auth and local auth
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.claims?.sub || req.user.id;
      const user = await authStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Sanitize user object - remove password before sending to client
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Register new user with email/password
  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors[0]?.message || "بيانات غير صالحة" 
        });
      }

      const { email, password, firstName, lastName, companyName } = parsed.data;

      // Check if user already exists
      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "البريد الإلكتروني مسجل مسبقاً" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await authStorage.createLocalUser({
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || null,
        companyName: companyName || null,
        authProvider: "local",
      });

      // Send welcome email
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const appUrl = process.env.APP_URL || `${protocol}://${host}`;
      sendWelcomeEmail(email, firstName, appUrl).catch(err => console.error('Failed to send welcome email:', err));

      // Create session
      const userSession = {
        id: user.id,
        claims: { sub: user.id },
        authProvider: "local",
      };

      req.login(userSession, (err: any) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "خطأ في تسجيل الدخول" });
        }
        res.json({ 
          message: "تم إنشاء الحساب بنجاح",
          user: { id: user.id, email: user.email, firstName: user.firstName }
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "حدث خطأ أثناء التسجيل" });
    }
  });

  // Login with email/password
  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors[0]?.message || "بيانات غير صالحة" 
        });
      }

      const { email, password } = parsed.data;

      // Find user
      const user = await authStorage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      // Create session
      const userSession = {
        id: user.id,
        claims: { sub: user.id },
        authProvider: "local",
      };

      req.login(userSession, (err: any) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "خطأ في تسجيل الدخول" });
        }
        res.json({ 
          message: "تم تسجيل الدخول بنجاح",
          user: { id: user.id, email: user.email, firstName: user.firstName }
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تسجيل الدخول" });
    }
  });

  // Logout (works for both auth methods)
  app.post("/api/auth/logout", (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: "خطأ في تسجيل الخروج" });
      }
      res.json({ message: "تم تسجيل الخروج بنجاح" });
    });
  });

  // Forgot password - request reset link
  app.post("/api/auth/forgot-password", async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
      }

      const user = await authStorage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط إعادة التعيين" });
      }

      // Invalidate any existing tokens for this user
      await authStorage.invalidateUserPasswordResetTokens(user.id);

      // Create new reset token
      const token = await authStorage.createPasswordResetToken(user.id);

      // Get app URL from request or environment
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const appUrl = process.env.APP_URL || `${protocol}://${host}`;

      // Send email
      const emailSent = await sendPasswordResetEmail(email, token, appUrl);
      
      if (!emailSent) {
        console.error('Failed to send password reset email');
      }

      res.json({ message: "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط إعادة التعيين" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "حدث خطأ، يرجى المحاولة مرة أخرى" });
    }
  });

  // Reset password - set new password with token
  app.post("/api/auth/reset-password", async (req: any, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "الرمز وكلمة المرور الجديدة مطلوبان" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }

      // Find valid token
      const resetToken = await authStorage.getValidPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ message: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" });
      }

      // Hash new password and update user
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await authStorage.updateUserPassword(resetToken.userId, hashedPassword);

      // Mark token as used
      await authStorage.markPasswordResetTokenUsed(resetToken.id);

      res.json({ message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إعادة تعيين كلمة المرور" });
    }
  });

  // Change password
  app.post("/api/auth/change-password", async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims?.sub || req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "يرجى إدخال كلمة المرور الحالية والجديدة" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
      }

      const user = await authStorage.getUser(userId);
      if (!user || !user.password) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await authStorage.updateUserPassword(userId, hashedPassword);

      res.json({ message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تغيير كلمة المرور" });
    }
  });
}
