import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcrypt";
import { registerSchema, loginSchema } from "@shared/schema";

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
      res.json(user);
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
}
