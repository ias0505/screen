import type { Express } from "express";
import type { Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import express from "express";
import crypto from "crypto";

// Rate limiting for activation attempts (in-memory store)
const activationAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts?: number; blockedFor?: number } {
  const now = Date.now();
  const record = activationAttempts.get(ip);
  
  if (record) {
    if (record.blockedUntil > now) {
      return { allowed: false, blockedFor: Math.ceil((record.blockedUntil - now) / 1000 / 60) };
    }
    if (record.blockedUntil <= now && record.count >= MAX_ATTEMPTS) {
      // Reset after block expires
      activationAttempts.delete(ip);
    }
  }
  
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - (record?.count || 0) };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = activationAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  record.count += 1;
  
  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
  }
  
  activationAttempts.set(ip, record);
}

function clearAttempts(ip: string): void {
  activationAttempts.delete(ip);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: "public/uploads",
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/uploads", express.static("public/uploads"));

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  app.post("/api/upload", requireAuth, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  // Subscriptions (new independent model)
  app.get("/api/subscriptions", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    await storage.expireOldSubscriptions();
    const subs = await storage.getSubscriptions(userId);
    res.json(subs);
  });

  app.post("/api/subscriptions", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { screenCount, durationYears } = req.body;
    
    if (!screenCount || !durationYears) {
      return res.status(400).json({ message: "يرجى تحديد عدد الشاشات ومدة الاشتراك" });
    }
    
    if (screenCount < 1 || screenCount > 100) {
      return res.status(400).json({ message: "عدد الشاشات يجب أن يكون بين 1 و 100" });
    }
    
    if (durationYears < 1 || durationYears > 3) {
      return res.status(400).json({ message: "مدة الاشتراك يجب أن تكون من 1 إلى 3 سنوات" });
    }

    const sub = await storage.createSubscription(userId, screenCount, durationYears);
    res.status(201).json(sub);
  });

  app.get("/api/subscriptions/available-slots", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const slots = await storage.getAvailableScreenSlots(userId);
    res.json({ availableSlots: slots });
  });

  app.get("/api/subscriptions/:id/screens-count", requireAuth, async (req: any, res) => {
    const subId = Number(req.params.id);
    const count = await storage.getScreensCountBySubscription(subId);
    res.json({ count });
  });

  // Screen Groups
  app.get(api.screenGroups.list.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const groups = await storage.getScreenGroups(userId);
    res.json(groups);
  });

  app.post(api.screenGroups.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.screenGroups.create.input.parse(req.body);
      const group = await storage.createScreenGroup({ ...input, userId });
      res.status(201).json(group);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete("/api/screen-groups/:id", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const groups = await storage.getScreenGroups(userId);
    const group = groups.find(g => g.id === Number(req.params.id));
    if (!group) {
      return res.status(404).json({ message: "المجموعة غير موجودة" });
    }
    await storage.deleteScreenGroup(Number(req.params.id));
    res.status(204).send();
  });

  // Media Groups
  app.get(api.mediaGroups.list.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const groups = await storage.getMediaGroups(userId);
    res.json(groups);
  });

  app.post(api.mediaGroups.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.mediaGroups.create.input.parse(req.body);
      const group = await storage.createMediaGroup({ ...input, userId });
      res.status(201).json(group);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Screens
  app.get(api.screens.list.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    await storage.expireOldSubscriptions();
    const screens = await storage.getScreens(userId);
    res.json(screens);
  });

  app.post(api.screens.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.screens.create.input.parse(req.body);
      
      const subscription = await storage.findSubscriptionWithAvailableSlot(userId);
      if (!subscription) {
        return res.status(403).json({ 
          message: 'لا توجد شاشات متاحة في اشتراكك. يرجى إضافة اشتراك جديد.' 
        });
      }

      const screen = await storage.createScreen({ 
        ...input, 
        userId,
        subscriptionId: subscription.id 
      });
      res.status(201).json(screen);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch("/api/screens/:id", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const screen = await storage.getScreen(Number(req.params.id));
    if (!screen || screen.userId !== userId) {
      return res.status(404).json({ message: 'الشاشة غير موجودة' });
    }
    const updated = await storage.updateScreen(Number(req.params.id), req.body);
    res.json(updated);
  });

  app.get(api.screens.get.path, async (req: any, res) => {
    const screen = await storage.getScreen(Number(req.params.id));
    if (!screen) {
      return res.status(404).json({ message: 'Screen not found' });
    }
    // If authenticated, verify ownership; otherwise allow public read for player
    if (req.isAuthenticated()) {
      const userId = req.user.claims.sub;
      if (screen.userId !== userId) {
        return res.status(404).json({ message: 'Screen not found' });
      }
    }
    return res.json(screen);
  });

  app.delete(api.screens.delete.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const screen = await storage.getScreen(Number(req.params.id));
    if (!screen || screen.userId !== userId) {
      return res.status(404).json({ message: 'Screen not found' });
    }
    await storage.deleteScreen(Number(req.params.id));
    res.status(204).send();
  });

  // Media
  app.get(api.media.list.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const media = await storage.getMediaItems(userId);
    res.json(media);
  });

  app.post(api.media.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.media.create.input.parse(req.body);
      const media = await storage.createMediaItem({ ...input, userId });
      res.status(201).json(media);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.media.delete.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const media = await storage.getMediaItem(Number(req.params.id));
    if (!media || media.userId !== userId) {
      return res.status(404).json({ message: 'Media not found' });
    }
    await storage.deleteMediaItem(Number(req.params.id));
    res.status(204).send();
  });

  // Screen playable check (public endpoint for display screens)
  app.get("/api/screens/:id/playable", async (req, res) => {
    const screenId = Number(req.params.id);
    await storage.expireOldSubscriptions();
    
    const screen = await storage.getScreen(screenId);
    
    if (!screen) {
      return res.json({ playable: false, reason: 'unavailable' });
    }
    
    if (screen.subscriptionId) {
      const sub = await storage.getSubscription(screen.subscriptionId);
      if (!sub || sub.status !== 'active' || new Date(sub.endDate) <= new Date()) {
        return res.json({ playable: false, reason: 'subscription_expired' });
      }
    }
    
    return res.json({ playable: true });
  });

  // Schedules
  app.get(api.schedules.list.path, async (req, res) => {
    const screenId = Number(req.params.screenId);
    await storage.expireOldSubscriptions();
    
    const screen = await storage.getScreen(screenId);
    if (!screen) {
      return res.json([]);
    }

    let schedulesList = await storage.getSchedules(screenId);
    
    if (screen.groupId) {
      const groupSchedules = await storage.getSchedulesByGroup(screen.groupId);
      schedulesList = [...schedulesList, ...groupSchedules];
    }
    
    res.json(schedulesList);
  });

  app.post(api.schedules.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.schedules.create.input.parse(req.body);
      
      if (input.screenId) {
        const screen = await storage.getScreen(input.screenId);
        if (!screen || screen.userId !== userId) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const schedule = await storage.createSchedule(input);
      res.status(201).json(schedule);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.schedules.delete.path, requireAuth, async (req, res) => {
    await storage.deleteSchedule(Number(req.params.id));
    res.status(204).send();
  });

  app.patch("/api/schedules/reorder", requireAuth, async (req: any, res) => {
    try {
      const { updates } = req.body;
      await storage.updateSchedulesOrder(updates);
      res.json({ success: true });
    } catch (err) {
      console.error('Reorder error:', err);
      res.status(500).json({ message: 'فشل في إعادة الترتيب' });
    }
  });

  app.patch("/api/schedules/:id", requireAuth, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const { duration, displayOrder } = req.body;
      const updateData: any = {};
      if (duration !== undefined) updateData.duration = duration;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      
      const updated = await storage.updateSchedule(id, updateData);
      res.json(updated);
    } catch (err) {
      console.error('Update schedule error:', err);
      res.status(500).json({ message: 'فشل في تحديث الجدولة' });
    }
  });

  // Group Schedules
  app.get("/api/group-schedules/:groupId", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const groupId = Number(req.params.groupId);
    
    const groups = await storage.getScreenGroups(userId);
    const group = groups.find(g => g.id === groupId);
    if (!group) {
      return res.status(404).json({ message: 'المجموعة غير موجودة' });
    }
    
    const schedules = await storage.getSchedulesByGroup(groupId);
    res.json(schedules);
  });

  app.post("/api/group-schedules", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { screenGroupId, mediaItemId, priority, isActive, duration } = req.body;
      
      const groups = await storage.getScreenGroups(userId);
      const group = groups.find(g => g.id === screenGroupId);
      if (!group) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const schedule = await storage.createSchedule({
        screenGroupId,
        mediaItemId,
        priority: priority || 1,
        isActive: isActive !== false,
        duration: duration || 10
      });
      res.status(201).json(schedule);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete("/api/group-schedules/:id", requireAuth, async (req, res) => {
    await storage.deleteSchedule(Number(req.params.id));
    res.status(204).send();
  });

  // Device Binding - إنشاء رمز تفعيل
  app.post("/api/screens/:id/activation-codes", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const screenId = Number(req.params.id);
    
    const screen = await storage.getScreen(screenId);
    if (!screen || screen.userId !== userId) {
      return res.status(404).json({ message: "الشاشة غير موجودة" });
    }
    
    const code = await storage.createActivationCode(screenId, userId);
    res.status(201).json(code);
  });

  // Device Binding - تفعيل جهاز موحد (public endpoint - unified activation with rate limiting)
  app.post("/api/screens/activate", async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Check rate limit
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        message: `تم حظرك مؤقتاً بسبب كثرة المحاولات الفاشلة. حاول مجدداً بعد ${rateCheck.blockedFor} دقيقة` 
      });
    }
    
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: "يرجى إدخال رمز التفعيل" });
    }
    
    const activation = await storage.getActivationCode(code);
    if (!activation) {
      recordFailedAttempt(clientIp);
      return res.status(404).json({ message: "رمز التفعيل غير صحيح" });
    }
    
    if (activation.usedAt) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ message: "تم استخدام رمز التفعيل مسبقاً" });
    }
    
    if (new Date() > new Date(activation.expiresAt)) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ message: "انتهت صلاحية رمز التفعيل" });
    }
    
    // Generate cryptographically secure device token
    const deviceToken = crypto.randomUUID();
    const binding = await storage.useActivationCode(code, deviceToken, req.headers['user-agent'] || '');
    
    if (!binding) {
      return res.status(500).json({ message: "فشل في تفعيل الجهاز" });
    }
    
    // Clear failed attempts on success
    clearAttempts(clientIp);
    
    res.json({ deviceToken, screenId: activation.screenId, bindingId: binding.id });
  });

  // Device Binding - تفعيل جهاز (public endpoint - legacy with screenId and rate limiting)
  app.post("/api/player/activate", async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Check rate limit
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        message: `تم حظرك مؤقتاً بسبب كثرة المحاولات الفاشلة. حاول مجدداً بعد ${rateCheck.blockedFor} دقيقة` 
      });
    }
    
    const { code, screenId, deviceInfo } = req.body;
    
    if (!code || !screenId) {
      return res.status(400).json({ message: "يرجى إدخال رمز التفعيل" });
    }
    
    const activation = await storage.getActivationCode(code);
    if (!activation) {
      recordFailedAttempt(clientIp);
      return res.status(404).json({ message: "رمز التفعيل غير صحيح" });
    }
    
    if (activation.screenId !== Number(screenId)) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ message: "رمز التفعيل لا يخص هذه الشاشة" });
    }
    
    if (activation.usedAt) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ message: "تم استخدام رمز التفعيل مسبقاً" });
    }
    
    if (new Date() > new Date(activation.expiresAt)) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ message: "انتهت صلاحية رمز التفعيل" });
    }
    
    // Generate cryptographically secure device token
    const deviceToken = crypto.randomUUID();
    const binding = await storage.useActivationCode(code, deviceToken, deviceInfo);
    
    if (!binding) {
      return res.status(500).json({ message: "فشل في تفعيل الجهاز" });
    }
    
    // Clear failed attempts on success
    clearAttempts(clientIp);
    
    res.json({ deviceToken, bindingId: binding.id });
  });

  // Device Binding - التحقق من ربط الجهاز (public endpoint)
  app.post("/api/player/verify", async (req, res) => {
    const { deviceToken, screenId } = req.body;
    
    if (!deviceToken || !screenId) {
      return res.json({ bound: false });
    }
    
    const binding = await storage.getDeviceBinding(deviceToken, Number(screenId));
    if (!binding) {
      return res.json({ bound: false });
    }
    
    // Update last seen
    await storage.updateDeviceLastSeen(binding.id);
    
    return res.json({ bound: true, bindingId: binding.id });
  });

  // Device Binding - عرض الأجهزة المرتبطة
  app.get("/api/screens/:id/devices", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const screenId = Number(req.params.id);
    
    const screen = await storage.getScreen(screenId);
    if (!screen || screen.userId !== userId) {
      return res.status(404).json({ message: "الشاشة غير موجودة" });
    }
    
    const bindings = await storage.getDeviceBindingsByScreen(screenId);
    res.json(bindings);
  });

  // Device Binding - إلغاء ربط جهاز
  app.delete("/api/device-bindings/:id", requireAuth, async (req: any, res) => {
    const bindingId = Number(req.params.id);
    await storage.revokeDeviceBinding(bindingId);
    res.status(204).send();
  });

  // Legacy subscription endpoints (for backwards compatibility)
  app.get("/api/subscription/plans", async (_req, res) => {
    const plans = await storage.getSubscriptionPlans();
    res.json(plans);
  });

  app.get("/api/subscription/status", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const sub = await storage.getUserSubscription(userId);
    res.json(sub || { status: 'none' });
  });

  return httpServer;
}
