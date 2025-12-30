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

// Check if Replit Auth is disabled
const isReplitAuthDisabled = process.env.REPLIT_AUTH_DISABLED === "true";

// Helper to get user ID from request (handles both Replit Auth and local auth)
function getUserId(req: any): string {
  // Local auth session has both id and claims.sub (for compatibility)
  // Replit Auth only has claims.sub
  // Try claims.sub first (works for both), then fall back to id
  return req.user?.claims?.sub?.toString() || req.user?.id?.toString();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/uploads", express.static("public/uploads"));

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Helper to get effective user ID (owner ID if team member)
  const getEffectiveUserId = async (req: any): Promise<string> => {
    const userId = getUserId(req);
    const ownerId = await storage.getOwnerForMember(userId);
    return ownerId || userId;
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
    const userId = getUserId(req);
    await storage.expireOldSubscriptions();
    const subs = await storage.getSubscriptions(userId);
    res.json(subs);
  });

  app.post("/api/subscriptions", requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const { screenCount, durationYears, discountCode } = req.body;
    
    if (!screenCount || !durationYears) {
      return res.status(400).json({ message: "يرجى تحديد عدد الشاشات ومدة الاشتراك" });
    }
    
    if (screenCount < 1 || screenCount > 100) {
      return res.status(400).json({ message: "عدد الشاشات يجب أن يكون بين 1 و 100" });
    }
    
    if (durationYears < 1 || durationYears > 3) {
      return res.status(400).json({ message: "مدة الاشتراك يجب أن تكون من 1 إلى 3 سنوات" });
    }

    // Validate and apply discount code if provided
    let validatedDiscountCode = null;
    if (discountCode) {
      const code = await storage.getDiscountCodeByCode(discountCode);
      if (code && code.isActive) {
        const now = new Date();
        const validFrom = code.validFrom ? new Date(code.validFrom) : null;
        const validUntil = code.validUntil ? new Date(code.validUntil) : null;
        
        if ((!validFrom || validFrom <= now) && 
            (!validUntil || validUntil >= now) &&
            (!code.maxUses || code.usedCount < code.maxUses) &&
            (!code.minScreens || screenCount >= code.minScreens)) {
          validatedDiscountCode = code;
        }
      }
    }

    const sub = await storage.createSubscription(userId, screenCount, durationYears, validatedDiscountCode);
    
    // Increment discount code usage if applied
    if (validatedDiscountCode) {
      await storage.incrementDiscountCodeUsage(validatedDiscountCode.code);
    }
    
    res.status(201).json(sub);
  });

  app.get("/api/subscriptions/available-slots", requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
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
    const userId = await getEffectiveUserId(req);
    const groups = await storage.getScreenGroups(userId);
    res.json(groups);
  });

  app.post(api.screenGroups.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = await getEffectiveUserId(req);
    const groups = await storage.getMediaGroups(userId);
    res.json(groups);
  });

  app.post(api.mediaGroups.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
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
    const userId = await getEffectiveUserId(req);
    await storage.expireOldSubscriptions();
    const screens = await storage.getScreens(userId);
    res.json(screens);
  });

  app.post(api.screens.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
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
    const userId = getUserId(req);
    const screen = await storage.getScreen(Number(req.params.id));
    if (!screen || screen.userId !== userId) {
      return res.status(404).json({ message: 'الشاشة غير موجودة' });
    }
    const updated = await storage.updateScreen(Number(req.params.id), req.body);
    res.json(updated);
  });

  // Heartbeat endpoint for player status updates
  app.post("/api/screens/:id/heartbeat", async (req: any, res) => {
    const screenId = Number(req.params.id);
    const deviceToken = req.headers['x-device-token'] as string;
    
    const screen = await storage.getScreen(screenId);
    if (!screen) {
      return res.status(404).json({ message: 'الشاشة غير موجودة' });
    }
    
    // Verify device token if provided and update last seen
    if (deviceToken) {
      const binding = await storage.getDeviceBinding(deviceToken, screenId);
      if (binding) {
        await storage.updateDeviceLastSeen(binding.id);
      }
    }
    
    // Update screen status to online with heartbeat timestamp
    await storage.updateScreen(screenId, { status: 'online', lastHeartbeat: new Date() });
    res.json({ success: true });
  });

  app.get(api.screens.get.path, async (req: any, res) => {
    const screenId = Number(req.params.id);
    const deviceToken = req.headers['x-device-token'] as string;
    
    const screen = await storage.getScreen(screenId);
    if (!screen) {
      return res.status(404).json({ message: 'Screen not found' });
    }
    
    // If authenticated, verify ownership and return full data
    if (req.isAuthenticated && req.isAuthenticated()) {
      const userId = getUserId(req);
      if (screen.userId !== userId) {
        return res.status(404).json({ message: 'Screen not found' });
      }
      return res.json(screen);
    }
    
    // For unauthenticated requests, require device token
    if (!deviceToken) {
      return res.status(403).json({ message: 'Device token required' });
    }
    
    const binding = await storage.getDeviceBinding(deviceToken, screenId);
    if (!binding) {
      return res.status(403).json({ message: 'Unauthorized device' });
    }
    
    // Return only minimal data for player
    return res.json({
      id: screen.id,
      name: screen.name,
      status: screen.status,
      groupId: screen.groupId,
    });
  });

  app.delete(api.screens.delete.path, requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const screen = await storage.getScreen(Number(req.params.id));
    if (!screen || screen.userId !== userId) {
      return res.status(404).json({ message: 'Screen not found' });
    }
    await storage.deleteScreen(Number(req.params.id));
    res.status(204).send();
  });

  // Media
  app.get(api.media.list.path, requireAuth, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
    const media = await storage.getMediaItems(userId);
    res.json(media);
  });

  app.post(api.media.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
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
    const userId = getUserId(req);
    const media = await storage.getMediaItem(Number(req.params.id));
    if (!media || media.userId !== userId) {
      return res.status(404).json({ message: 'Media not found' });
    }
    await storage.deleteMediaItem(Number(req.params.id));
    res.status(204).send();
  });

  // Screen playable check (requires device token for security)
  app.get("/api/screens/:id/playable", async (req: any, res) => {
    const screenId = Number(req.params.id);
    const deviceToken = req.headers['x-device-token'] as string;
    
    // Require device token for unauthenticated requests
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      if (!deviceToken) {
        return res.status(403).json({ playable: false, reason: 'device_token_required' });
      }
      const binding = await storage.getDeviceBinding(deviceToken, screenId);
      if (!binding) {
        return res.status(403).json({ playable: false, reason: 'unauthorized_device' });
      }
    }
    
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

  // Schedules (requires device token for unauthenticated access)
  app.get(api.schedules.list.path, async (req: any, res) => {
    const screenId = Number(req.params.screenId);
    const deviceToken = req.headers['x-device-token'] as string;
    
    // Require device token for unauthenticated requests
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      if (!deviceToken) {
        return res.status(403).json({ message: 'Device token required' });
      }
      const binding = await storage.getDeviceBinding(deviceToken, screenId);
      if (!binding) {
        return res.status(403).json({ message: 'Unauthorized device' });
      }
    }
    
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
      const userId = getUserId(req);
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
    const userId = getUserId(req);
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
      const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const plans = await storage.getActiveSubscriptionPlans();
    res.json(plans);
  });

  // Validate discount code
  app.post("/api/discount-codes/validate", async (req, res) => {
    const { code, screenCount } = req.body;
    
    if (!code) {
      return res.status(400).json({ valid: false, message: "الكود مطلوب" });
    }
    
    const discountCode = await storage.getDiscountCodeByCode(code);
    
    if (!discountCode) {
      return res.status(404).json({ valid: false, message: "الكود غير موجود" });
    }
    
    if (!discountCode.isActive) {
      return res.status(400).json({ valid: false, message: "الكود غير نشط" });
    }
    
    const now = new Date();
    if (discountCode.validFrom && new Date(discountCode.validFrom) > now) {
      return res.status(400).json({ valid: false, message: "الكود لم يبدأ بعد" });
    }
    
    if (discountCode.validUntil && new Date(discountCode.validUntil) < now) {
      return res.status(400).json({ valid: false, message: "الكود منتهي الصلاحية" });
    }
    
    if (discountCode.maxUses && discountCode.usedCount >= discountCode.maxUses) {
      return res.status(400).json({ valid: false, message: "تم استخدام الكود الحد الأقصى من المرات" });
    }
    
    if (discountCode.minScreens && screenCount && screenCount < discountCode.minScreens) {
      return res.status(400).json({ valid: false, message: `يتطلب هذا الكود ${discountCode.minScreens} شاشة على الأقل` });
    }
    
    res.json({
      valid: true,
      discountType: discountCode.discountType,
      discountValue: discountCode.discountValue,
      minScreens: discountCode.minScreens,
      message: discountCode.discountType === 'percentage' 
        ? `خصم ${discountCode.discountValue}%` 
        : `خصم ${discountCode.discountValue} ريال`
    });
  });

  app.get("/api/subscription/status", requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const sub = await storage.getUserSubscription(userId);
    res.json(sub || { status: 'none' });
  });

  // ==================== Admin Routes ====================
  
  // Middleware للتحقق من صلاحيات المدير
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const userId = getUserId(req);
    const isAdmin = await storage.isAdmin(userId);
    if (!isAdmin) {
      return res.status(403).json({ message: "لا تملك صلاحيات المدير" });
    }
    next();
  };

  // Admin: Check if current user is admin
  app.get("/api/admin/check", requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const admin = await storage.getAdmin(userId);
    res.json({ isAdmin: !!admin, role: admin?.role });
  });

  // Admin: Get system statistics
  app.get("/api/admin/stats", requireAdmin, async (req: any, res) => {
    const stats = await storage.getSystemStats();
    res.json(stats);
  });

  // Admin: Get all users
  app.get("/api/admin/users", requireAdmin, async (req: any, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  // Admin: Get user details with subscriptions and screens
  app.get("/api/admin/users/:id", requireAdmin, async (req: any, res) => {
    const userId = req.params.id;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    const userSubscriptions = await storage.getSubscriptions(userId);
    const userScreens = await storage.getScreens(userId);
    res.json({ user, subscriptions: userSubscriptions, screens: userScreens });
  });

  // Admin: Add screen to user without subscription
  app.post("/api/admin/users/:id/screens", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const userId = req.params.id;
    const { name, location } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: "اسم الشاشة مطلوب" });
    }
    
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    
    const screen = await storage.createScreenForUser(userId, name, location);
    
    // Log admin activity
    await storage.logAdminActivity(
      adminId, 
      'screen_added_to_user', 
      'screen', 
      String(screen.id),
      JSON.stringify({ userId, name, location }),
      req.ip
    );
    
    res.status(201).json(screen);
  });

  // Admin: Get all subscriptions
  app.get("/api/admin/subscriptions", requireAdmin, async (req: any, res) => {
    await storage.expireOldSubscriptions();
    const subs = await storage.getAllSubscriptions();
    res.json(subs);
  });

  // Admin: Create subscription for user
  app.post("/api/admin/users/:id/subscriptions", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const userId = req.params.id;
    const { screenCount, durationYears } = req.body;
    
    if (!screenCount || !durationYears) {
      return res.status(400).json({ message: "يرجى تحديد عدد الشاشات ومدة الاشتراك" });
    }
    
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    
    const subscription = await storage.createSubscription(userId, screenCount, durationYears);
    
    // Create invoice for the subscription
    const amount = screenCount * 50 * durationYears;
    await storage.createInvoice(subscription.id, userId, amount, adminId);
    
    // Log admin activity
    await storage.logAdminActivity(
      adminId,
      'subscription_created',
      'subscription',
      String(subscription.id),
      JSON.stringify({ userId, screenCount, durationYears, amount }),
      req.ip
    );
    
    res.status(201).json(subscription);
  });

  // Admin: Get all screens
  app.get("/api/admin/screens", requireAdmin, async (req: any, res) => {
    const screens = await storage.getAllScreens();
    res.json(screens);
  });

  // Admin: Get all invoices
  app.get("/api/admin/invoices", requireAdmin, async (req: any, res) => {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  });

  // Admin: Update invoice status
  app.patch("/api/admin/invoices/:id", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const invoiceId = Number(req.params.id);
    const { status, paymentMethod } = req.body;
    
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "الفاتورة غير موجودة" });
    }
    
    const updated = await storage.updateInvoiceStatus(invoiceId, status, paymentMethod);
    
    // Log admin activity
    await storage.logAdminActivity(
      adminId,
      'invoice_updated',
      'invoice',
      String(invoiceId),
      JSON.stringify({ oldStatus: invoice.status, newStatus: status, paymentMethod }),
      req.ip
    );
    
    res.json(updated);
  });

  // Admin: Get activity logs
  app.get("/api/admin/activity-logs", requireAdmin, async (req: any, res) => {
    const limit = Number(req.query.limit) || 100;
    const logs = await storage.getAdminActivityLogs(limit);
    res.json(logs);
  });

  // Admin: Get all admins
  app.get("/api/admin/admins", requireAdmin, async (req: any, res) => {
    const admins = await storage.getAllAdmins();
    res.json(admins);
  });

  // Admin: Make user an admin
  app.post("/api/admin/admins", requireAdmin, async (req: any, res) => {
    const creatorId = getUserId(req);
    const { userId, role } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "معرف المستخدم مطلوب" });
    }
    
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    
    const existingAdmin = await storage.getAdmin(userId);
    if (existingAdmin) {
      return res.status(400).json({ message: "المستخدم مدير بالفعل" });
    }
    
    const admin = await storage.createAdmin(userId, role || 'admin', creatorId);
    
    // Log admin activity
    await storage.logAdminActivity(
      creatorId,
      'admin_created',
      'admin',
      userId,
      JSON.stringify({ role: role || 'admin' }),
      req.ip
    );
    
    res.status(201).json(admin);
  });

  // Admin: Remove admin
  app.delete("/api/admin/admins/:userId", requireAdmin, async (req: any, res) => {
    const creatorId = getUserId(req);
    const userId = req.params.userId;
    
    // Prevent self-removal
    if (creatorId === userId) {
      return res.status(400).json({ message: "لا يمكنك إزالة نفسك من المدراء" });
    }
    
    await storage.removeAdmin(userId);
    
    // Log admin activity
    await storage.logAdminActivity(
      creatorId,
      'admin_removed',
      'admin',
      userId,
      undefined,
      req.ip
    );
    
    res.status(204).send();
  });

  // ============ Admin: Subscription Plans Management ============
  
  // Get all subscription plans
  app.get("/api/admin/plans", requireAdmin, async (req: any, res) => {
    const plans = await storage.getAllSubscriptionPlans();
    res.json(plans);
  });

  // Create subscription plan
  app.post("/api/admin/plans", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const { name, description, pricePerScreen, minScreens, maxScreens, discountPercentage, features, isActive, isDefault } = req.body;
    
    if (!name || !pricePerScreen) {
      return res.status(400).json({ message: "اسم الخطة وسعر الشاشة مطلوبان" });
    }
    
    const plan = await storage.createSubscriptionPlan({
      name,
      description,
      pricePerScreen,
      minScreens: minScreens || 1,
      maxScreens: maxScreens || null,
      discountPercentage: discountPercentage || 0,
      features: features ? JSON.stringify(features) : null,
      isActive: isActive !== false,
      isDefault: isDefault || false
    });
    
    await storage.logAdminActivity(adminId, 'plan_created', 'plan', String(plan.id), JSON.stringify({ name, pricePerScreen }), req.ip);
    res.status(201).json(plan);
  });

  // Update subscription plan
  app.patch("/api/admin/plans/:id", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const planId = Number(req.params.id);
    const updates = req.body;
    
    const plan = await storage.getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(404).json({ message: "الخطة غير موجودة" });
    }
    
    if (updates.features && typeof updates.features !== 'string') {
      updates.features = JSON.stringify(updates.features);
    }
    
    const updated = await storage.updateSubscriptionPlan(planId, updates);
    await storage.logAdminActivity(adminId, 'plan_updated', 'plan', String(planId), JSON.stringify(updates), req.ip);
    res.json(updated);
  });

  // Delete subscription plan
  app.delete("/api/admin/plans/:id", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const planId = Number(req.params.id);
    
    const plan = await storage.getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(404).json({ message: "الخطة غير موجودة" });
    }
    
    await storage.deleteSubscriptionPlan(planId);
    await storage.logAdminActivity(adminId, 'plan_deleted', 'plan', String(planId), JSON.stringify({ name: plan.name }), req.ip);
    res.status(204).send();
  });

  // ============ Admin: Discount Codes Management ============
  
  // Get all discount codes
  app.get("/api/admin/discount-codes", requireAdmin, async (req: any, res) => {
    const codes = await storage.getAllDiscountCodes();
    res.json(codes);
  });

  // Create discount code
  app.post("/api/admin/discount-codes", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const { code, description, discountType, discountValue, minScreens, maxUses, validFrom, validUntil, isActive } = req.body;
    
    if (!code || !discountValue) {
      return res.status(400).json({ message: "كود الخصم وقيمة الخصم مطلوبان" });
    }
    
    // Check if code already exists
    const existing = await storage.getDiscountCodeByCode(code);
    if (existing) {
      return res.status(400).json({ message: "كود الخصم موجود بالفعل" });
    }
    
    const discountCode = await storage.createDiscountCode({
      code: code.toUpperCase(),
      description,
      discountType: discountType || 'percentage',
      discountValue,
      minScreens: minScreens || 1,
      maxUses: maxUses || null,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      isActive: isActive !== false,
      createdBy: adminId
    });
    
    await storage.logAdminActivity(adminId, 'discount_code_created', 'discount_code', String(discountCode.id), JSON.stringify({ code, discountValue }), req.ip);
    res.status(201).json(discountCode);
  });

  // Update discount code
  app.patch("/api/admin/discount-codes/:id", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const codeId = Number(req.params.id);
    const updates = req.body;
    
    const discountCode = await storage.getDiscountCode(codeId);
    if (!discountCode) {
      return res.status(404).json({ message: "كود الخصم غير موجود" });
    }
    
    if (updates.validFrom) updates.validFrom = new Date(updates.validFrom);
    if (updates.validUntil) updates.validUntil = new Date(updates.validUntil);
    if (updates.code) updates.code = updates.code.toUpperCase();
    
    const updated = await storage.updateDiscountCode(codeId, updates);
    await storage.logAdminActivity(adminId, 'discount_code_updated', 'discount_code', String(codeId), JSON.stringify(updates), req.ip);
    res.json(updated);
  });

  // Delete discount code
  app.delete("/api/admin/discount-codes/:id", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const codeId = Number(req.params.id);
    
    const discountCode = await storage.getDiscountCode(codeId);
    if (!discountCode) {
      return res.status(404).json({ message: "كود الخصم غير موجود" });
    }
    
    await storage.deleteDiscountCode(codeId);
    await storage.logAdminActivity(adminId, 'discount_code_deleted', 'discount_code', String(codeId), JSON.stringify({ code: discountCode.code }), req.ip);
    res.status(204).send();
  });

  // ============ Team Members API ============
  
  // Get team members for the current user (owner)
  app.get("/api/team", requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const members = await storage.getTeamMembers(userId);
    res.json(members);
  });

  // Invite a team member
  app.post("/api/team/invite", requireAuth, async (req: any, res) => {
    const ownerId = getUserId(req);
    const { email, name, permission } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ message: "البريد الإلكتروني والاسم مطلوبان" });
    }
    
    const validPermissions = ['viewer', 'editor', 'manager'];
    const selectedPermission = validPermissions.includes(permission) ? permission : 'viewer';
    
    // Check if already invited
    const existing = await storage.getTeamMemberByEmail(ownerId, email);
    if (existing) {
      return res.status(400).json({ message: "تم دعوة هذا البريد مسبقاً" });
    }
    
    const member = await storage.inviteTeamMember(ownerId, email, name, selectedPermission);
    res.status(201).json(member);
  });

  // Update team member permission
  app.patch("/api/team/:invitationId/permission", requireAuth, async (req: any, res) => {
    const ownerId = getUserId(req);
    const invitationId = Number(req.params.invitationId);
    const { permission } = req.body;
    
    const validPermissions = ['viewer', 'editor', 'manager'];
    if (!validPermissions.includes(permission)) {
      return res.status(400).json({ message: "صلاحية غير صالحة" });
    }
    
    const updated = await storage.updateTeamMemberPermission(ownerId, invitationId, permission);
    if (!updated) {
      return res.status(404).json({ message: "العضو غير موجود" });
    }
    
    res.json(updated);
  });

  // Remove a team member by invitation ID
  app.delete("/api/team/:invitationId", requireAuth, async (req: any, res) => {
    const ownerId = getUserId(req);
    const invitationId = Number(req.params.invitationId);
    
    await storage.removeTeamMember(ownerId, invitationId);
    res.status(204).send();
  });

  // Get pending invitations for the current user
  app.get("/api/team/invitations", requireAuth, async (req: any, res) => {
    const user = await storage.getUserById(getUserId(req));
    if (!user?.email) {
      return res.json([]);
    }
    
    const invitations = await storage.getPendingInvitations(user.email);
    res.json(invitations);
  });

  // Accept a team invitation
  app.post("/api/team/invitations/:ownerId/accept", requireAuth, async (req: any, res) => {
    const memberId = getUserId(req);
    const ownerId = req.params.ownerId;
    
    const user = await storage.getUserById(memberId);
    if (!user?.email) {
      return res.status(400).json({ message: "البريد الإلكتروني غير متوفر" });
    }
    
    const result = await storage.acceptTeamInvitation(memberId, ownerId, user.email);
    if (!result) {
      return res.status(403).json({ message: "الدعوة غير موجودة أو ليست موجهة لك" });
    }
    
    res.json(result);
  });

  // Reject a team invitation
  app.post("/api/team/invitations/:ownerId/reject", requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const ownerId = req.params.ownerId;
    
    const user = await storage.getUserById(userId);
    if (!user?.email) {
      return res.status(400).json({ message: "البريد الإلكتروني غير متوفر" });
    }
    
    await storage.rejectTeamInvitation(ownerId, user.email);
    res.status(204).send();
  });

  // Check if user is a team member and get owner context
  app.get("/api/team/context", requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const ownerId = await storage.getOwnerForMember(userId);
    
    if (ownerId) {
      // User is a team member, return owner context
      res.json({ isTeamMember: true, ownerId });
    } else {
      // User is an owner
      res.json({ isTeamMember: false, ownerId: userId });
    }
  });

  // ============ User Profile API ============
  
  // Get user profile
  app.get("/api/user/profile", requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const user = await storage.getUserById(userId);
    res.json(user);
  });

  // Update company name (onboarding)
  app.patch("/api/user/company", requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const { companyName } = req.body;
    
    if (!companyName || companyName.trim().length < 2) {
      return res.status(400).json({ message: "اسم الشركة مطلوب (حرفين على الأقل)" });
    }
    
    const updated = await storage.updateUserCompanyName(userId, companyName.trim());
    res.json(updated);
  });

  return httpServer;
}
