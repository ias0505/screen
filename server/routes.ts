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

  // Helper to get effective user ID based on work context
  // If X-Work-Context header is set, use the specified owner ID (if user is a valid team member)
  // Otherwise, use the user's own ID (personal context)
  const getEffectiveUserId = async (req: any): Promise<string> => {
    const userId = getUserId(req);
    const workContext = req.headers['x-work-context'];
    
    // If work context header is set, verify user is a team member of that owner
    if (workContext && typeof workContext === 'string') {
      const memberships = await storage.getAcceptedTeamMemberships(userId);
      const validMembership = memberships.find(m => m.ownerId === workContext);
      if (validMembership) {
        return workContext;
      }
    }
    
    // Default to personal context (user's own ID)
    return userId;
  };

  // Helper to get current user's permission in work context
  // Returns 'owner' for personal context, or the team member permission level
  const getUserPermission = async (req: any): Promise<'owner' | 'viewer' | 'editor' | 'manager'> => {
    const userId = getUserId(req);
    const workContext = req.headers['x-work-context'];
    
    // If no work context or working in personal context
    if (!workContext || workContext === userId) {
      return 'owner';
    }
    
    // Check if user is a team member of the specified owner
    const memberships = await storage.getAcceptedTeamMemberships(userId);
    const membership = memberships.find(m => m.ownerId === workContext);
    
    if (membership) {
      return membership.permission as 'viewer' | 'editor' | 'manager';
    }
    
    // Default to viewer (most restrictive) if context is invalid
    return 'viewer';
  };

  // Middleware to require at least editor permission for mutating operations
  const requireEditor = async (req: any, res: any, next: any) => {
    const permission = await getUserPermission(req);
    if (permission === 'viewer') {
      return res.status(403).json({ message: "ليس لديك صلاحية لتنفيذ هذا الإجراء" });
    }
    next();
  };

  // Middleware to require manager permission for administrative operations
  const requireManager = async (req: any, res: any, next: any) => {
    const permission = await getUserPermission(req);
    if (permission !== 'owner' && permission !== 'manager') {
      return res.status(403).json({ message: "ليس لديك صلاحية لتنفيذ هذا الإجراء" });
    }
    next();
  };

  app.post("/api/upload", requireAuth, requireEditor, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  // Subscriptions (new independent model)
  app.get("/api/subscriptions", requireAuth, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
    await storage.expireOldSubscriptions();
    const subs = await storage.getSubscriptions(userId);
    res.json(subs);
  });

  app.post("/api/subscriptions", requireAuth, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
    const { screenCount, durationYears, discountCode, pricePerScreen } = req.body;
    
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

    const sub = await storage.createSubscription(userId, screenCount, durationYears, validatedDiscountCode, pricePerScreen);
    
    // Create invoice for the subscription (base amount before tax)
    await storage.createInvoice(sub.id, userId, sub.totalPrice, userId);
    
    // Increment discount code usage if applied
    if (validatedDiscountCode) {
      await storage.incrementDiscountCodeUsage(validatedDiscountCode.id);
    }
    
    res.status(201).json(sub);
  });

  app.get("/api/subscriptions/available-slots", requireAuth, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
    const slots = await storage.getAvailableScreenSlots(userId);
    res.json({ availableSlots: slots });
  });

  app.get("/api/subscriptions/:id/screens-count", requireAuth, async (req: any, res) => {
    const subId = Number(req.params.id);
    const count = await storage.getScreensCountBySubscription(subId);
    res.json({ count });
  });

  // Get invoices for a subscription
  app.get("/api/subscriptions/:id/invoices", requireAuth, async (req: any, res) => {
    const subId = Number(req.params.id);
    const invoicesList = await storage.getInvoicesBySubscription(subId);
    res.json(invoicesList);
  });

  // Screen Groups
  app.get(api.screenGroups.list.path, requireAuth, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
    const groups = await storage.getScreenGroups(userId);
    res.json(groups);
  });

  app.post(api.screenGroups.create.path, requireAuth, requireEditor, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
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

  app.delete("/api/screen-groups/:id", requireAuth, requireEditor, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
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

  app.post(api.mediaGroups.create.path, requireAuth, requireEditor, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
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

  app.post(api.screens.create.path, requireAuth, requireEditor, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
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

  app.patch("/api/screens/:id", requireAuth, requireEditor, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
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
      const userId = await getEffectiveUserId(req);
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
      orientation: screen.orientation,
    });
  });

  app.delete(api.screens.delete.path, requireAuth, requireEditor, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
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

  // Get user's storage usage
  app.get("/api/user/storage-usage", requireAuth, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
    const media = await storage.getMediaItems(userId);
    
    let totalBytes = 0;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    for (const item of media) {
      if (item.url && item.url.startsWith('/uploads/')) {
        const filename = item.url.replace('/uploads/', '');
        const filePath = path.join(uploadsDir, filename);
        try {
          const stats = await fs.promises.stat(filePath);
          totalBytes += stats.size;
        } catch {
          // File not found, skip
        }
      }
    }
    
    res.json({ 
      totalBytes,
      totalMB: Math.round(totalBytes / (1024 * 1024) * 10) / 10,
      fileCount: media.length
    });
  });

  app.post(api.media.create.path, requireAuth, requireEditor, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
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

  app.delete(api.media.delete.path, requireAuth, requireEditor, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
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

    // If screen belongs to a group, show only group content
    // Otherwise show screen's individual content
    let schedulesList: any[];
    if (screen.groupId) {
      schedulesList = await storage.getSchedulesByGroup(screen.groupId);
    } else {
      schedulesList = await storage.getSchedules(screenId);
    }
    
    res.json(schedulesList);
  });

  app.post(api.schedules.create.path, requireAuth, requireEditor, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
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

  app.delete(api.schedules.delete.path, requireAuth, requireEditor, async (req, res) => {
    await storage.deleteSchedule(Number(req.params.id));
    res.status(204).send();
  });

  // Get all schedules for the current user (across all screens)
  app.get("/api/schedules/all", requireAuth, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
    const screens = await storage.getScreens(userId);
    const screenIds = screens.map(s => s.id);
    
    let allSchedules: any[] = [];
    for (const screenId of screenIds) {
      const schedules = await storage.getSchedules(screenId);
      allSchedules = [...allSchedules, ...schedules];
    }
    
    // Also get group schedules
    const groups = await storage.getScreenGroups(userId);
    for (const group of groups) {
      const groupSchedules = await storage.getSchedulesByGroup(group.id);
      allSchedules = [...allSchedules, ...groupSchedules];
    }
    
    res.json(allSchedules);
  });

  app.patch("/api/schedules/reorder", requireAuth, requireEditor, async (req: any, res) => {
    try {
      const { updates } = req.body;
      await storage.updateSchedulesOrder(updates);
      res.json({ success: true });
    } catch (err) {
      console.error('Reorder error:', err);
      res.status(500).json({ message: 'فشل في إعادة الترتيب' });
    }
  });

  app.patch("/api/schedules/:id", requireAuth, requireEditor, async (req: any, res) => {
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
    const userId = await getEffectiveUserId(req);
    const groupId = Number(req.params.groupId);
    
    const groups = await storage.getScreenGroups(userId);
    const group = groups.find(g => g.id === groupId);
    if (!group) {
      return res.status(404).json({ message: 'المجموعة غير موجودة' });
    }
    
    const schedules = await storage.getSchedulesByGroup(groupId);
    res.json(schedules);
  });

  app.post("/api/group-schedules", requireAuth, requireEditor, async (req: any, res) => {
    try {
      const userId = await getEffectiveUserId(req);
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

  app.delete("/api/group-schedules/:id", requireAuth, requireEditor, async (req, res) => {
    await storage.deleteSchedule(Number(req.params.id));
    res.status(204).send();
  });

  // Device Binding - إنشاء رمز تفعيل (للمدير)
  app.post("/api/screens/:id/activation-codes", requireAuth, requireEditor, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
    const screenId = Number(req.params.id);
    
    const screen = await storage.getScreen(screenId);
    if (!screen || screen.userId !== userId) {
      return res.status(404).json({ message: "الشاشة غير موجودة" });
    }
    
    const code = await storage.createActivationCode(screenId, userId);
    res.status(201).json(code);
  });

  // Device Binding - الحصول على رمز التفعيل للشاشة (public - للعرض على الشاشة)
  // Generates a polling token that must be provided to retrieve device token
  app.get("/api/player/:id/activation-code", async (req, res) => {
    const screenId = Number(req.params.id);
    
    const screen = await storage.getScreen(screenId);
    if (!screen) {
      return res.status(404).json({ message: "الشاشة غير موجودة" });
    }
    
    const code = await storage.createActivationCode(screenId, screen.userId);
    
    // Generate a unique polling token for this activation request
    // This token must be provided when checking activation status
    const pollingToken = crypto.randomUUID();
    
    // Store the polling token with the activation code
    await storage.setActivationPollingToken(code.id, pollingToken);
    
    res.json({ 
      code: code.code, 
      expiresAt: code.expiresAt, 
      screenId,
      pollingToken 
    });
  });

  // Device Binding - التحقق من حالة التفعيل وجلب التوكن (public - للشاشة فقط)
  // Rate limited to prevent brute-force attempts
  // Requires polling token to retrieve device token (prevents code harvesting attacks)
  app.get("/api/player/:id/check-activation", async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Apply rate limiting
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        activated: false,
        message: `تم حظرك مؤقتاً. حاول مجدداً بعد ${rateCheck.blockedFor} دقيقة` 
      });
    }
    
    const screenId = Number(req.params.id);
    const code = req.query.code as string;
    const pollingToken = req.query.pollingToken as string;
    
    if (!code || !pollingToken) {
      return res.status(400).json({ activated: false, message: "الرمز ورمز الاستعلام مطلوبان" });
    }
    
    const screen = await storage.getScreen(screenId);
    if (!screen) {
      recordFailedAttempt(clientIp);
      return res.status(404).json({ activated: false, message: "الشاشة غير موجودة" });
    }
    
    // Check if this code exists and belongs to this screen
    const activation = await storage.getActivationCode(code);
    if (!activation) {
      recordFailedAttempt(clientIp);
      return res.json({ activated: false });
    }
    
    // Verify the code belongs to this screen
    if (activation.screenId !== screenId) {
      recordFailedAttempt(clientIp);
      return res.json({ activated: false });
    }
    
    // Verify the polling token matches (prevents code harvesting)
    // Only the device that originally requested this specific code knows its polling token
    if (!activation.pollingToken || activation.pollingToken !== pollingToken) {
      recordFailedAttempt(clientIp);
      return res.json({ activated: false });
    }
    
    if (!activation.usedAt) {
      return res.json({ activated: false });
    }
    
    // Get the device binding created by this activation
    const bindings = await storage.getDeviceBindingsByScreen(screenId);
    const latestBinding = bindings.sort((a, b) => 
      new Date(b.activatedAt).getTime() - new Date(a.activatedAt).getTime()
    )[0];
    
    if (latestBinding) {
      // Clear rate limit on successful activation check
      clearAttempts(clientIp);
      
      // Clear the polling token after successful device token retrieval (one-time use)
      await storage.clearActivationPollingToken(activation.id);
      
      res.json({ 
        activated: true, 
        deviceToken: latestBinding.deviceToken,
        bindingId: latestBinding.id 
      });
    } else {
      res.json({ activated: false });
    }
  });

  // Admin scan activation - authenticated endpoint for admin scanning QR codes
  app.post("/api/admin/screens/activate-by-scan", async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "يرجى تسجيل الدخول" });
    }
    
    const userId = await getEffectiveUserId(req);
    const { code, screenId } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: "يرجى إدخال رمز التفعيل" });
    }
    
    const activation = await storage.getActivationCode(code);
    if (!activation) {
      return res.status(404).json({ message: "رمز التفعيل غير صحيح" });
    }
    
    if (activation.usedAt) {
      return res.status(400).json({ message: "تم استخدام رمز التفعيل مسبقاً" });
    }
    
    if (new Date() > new Date(activation.expiresAt)) {
      return res.status(400).json({ message: "انتهت صلاحية رمز التفعيل" });
    }
    
    // Verify the screen belongs to this user (or user is admin or team member)
    const screen = await storage.getScreen(activation.screenId);
    if (!screen) {
      return res.status(404).json({ message: "الشاشة غير موجودة" });
    }
    
    const isAdmin = await storage.isAdmin(userId);
    const isOwner = screen.userId === userId;
    
    // Check if user is a team member of the screen owner with editor/manager permission
    let hasTeamPermission = false;
    if (!isOwner && !isAdmin) {
      const memberships = await storage.getAcceptedTeamMemberships(userId);
      const membership = memberships.find(m => m.ownerId === screen.userId);
      if (membership && (membership.permission === 'editor' || membership.permission === 'manager')) {
        hasTeamPermission = true;
      }
    }
    
    if (!isOwner && !isAdmin && !hasTeamPermission) {
      return res.status(403).json({ message: "ليس لديك صلاحية تفعيل هذه الشاشة" });
    }
    
    // Generate device token and create binding
    const deviceToken = crypto.randomUUID();
    const binding = await storage.useActivationCode(code, deviceToken, 'admin-scan');
    
    if (!binding) {
      return res.status(500).json({ message: "فشل في تفعيل الجهاز" });
    }
    
    // Return success but NOT the device token (player will poll for it)
    res.json({ 
      success: true, 
      screenId: activation.screenId,
      screenName: screen.name,
      message: "تم تفعيل الشاشة بنجاح" 
    });
  });

  // Manual code activation endpoint (for device to enter 6-character code)
  app.post("/api/activate", async (req, res) => {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: "يرجى إدخال رمز التفعيل" });
    }
    
    const activation = await storage.getActivationCode(code);
    if (!activation) {
      return res.status(404).json({ message: "رمز التفعيل غير صحيح" });
    }
    
    if (activation.usedAt) {
      return res.status(400).json({ message: "تم استخدام رمز التفعيل مسبقاً" });
    }
    
    if (new Date() > new Date(activation.expiresAt)) {
      return res.status(400).json({ message: "انتهت صلاحية رمز التفعيل" });
    }
    
    // Get screen name for response
    const screen = await storage.getScreen(activation.screenId);
    if (!screen) {
      return res.status(404).json({ message: "الشاشة غير موجودة" });
    }
    
    // Generate device token and create binding
    const deviceToken = crypto.randomUUID();
    const binding = await storage.useActivationCode(code, deviceToken, 'manual-code');
    
    if (!binding) {
      return res.status(500).json({ message: "فشل في تفعيل الجهاز" });
    }
    
    // Return device token for manual activation
    res.json({ 
      success: true, 
      screenId: activation.screenId,
      screenName: screen.name,
      deviceToken: deviceToken,
      message: "تم تفعيل الشاشة بنجاح" 
    });
  });

  // Device-centric binding: Device checks if it has been bound to a screen
  app.get("/api/device/:deviceId/check-binding", async (req, res) => {
    const deviceId = req.params.deviceId;
    
    if (!deviceId || deviceId.length < 6) {
      return res.json({ bound: false });
    }
    
    // Check for pending binding and claim it
    const binding = await storage.claimPendingDeviceBinding(deviceId);
    
    if (binding) {
      return res.json({ 
        bound: true, 
        screenId: binding.screenId,
        deviceToken: binding.deviceToken
      });
    }
    
    return res.json({ bound: false });
  });

  // Device-centric binding: Admin binds a device to a screen by scanning device QR
  app.post("/api/screens/:screenId/bind-device", requireAuth, requireEditor, async (req: any, res) => {
    const userId = await getEffectiveUserId(req);
    const screenId = Number(req.params.screenId);
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ message: "رقم تعريف الجهاز مطلوب" });
    }
    
    // Verify the screen exists and belongs to this user
    const screen = await storage.getScreen(screenId);
    if (!screen) {
      return res.status(404).json({ message: "الشاشة غير موجودة" });
    }
    
    const isAdmin = await storage.isAdmin(userId);
    if (screen.userId !== parseInt(userId) && !isAdmin) {
      return res.status(403).json({ message: "ليس لديك صلاحية ربط هذه الشاشة" });
    }
    
    // Generate device token
    const deviceToken = crypto.randomUUID();
    
    // Create pending binding (device will claim it when it polls)
    await storage.createPendingDeviceBinding(deviceId, screenId, deviceToken, userId);
    
    res.json({ 
      success: true, 
      message: "تم إرسال طلب الربط. سيتم ربط الجهاز تلقائياً.",
      screenId,
      screenName: screen.name
    });
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
    const userId = await getEffectiveUserId(req);
    const screenId = Number(req.params.id);
    
    const screen = await storage.getScreen(screenId);
    if (!screen || screen.userId !== userId) {
      return res.status(404).json({ message: "الشاشة غير موجودة" });
    }
    
    const bindings = await storage.getDeviceBindingsByScreen(screenId);
    res.json(bindings);
  });

  // Device Binding - إلغاء ربط جهاز
  app.delete("/api/device-bindings/:id", requireAuth, requireEditor, async (req: any, res) => {
    const bindingId = Number(req.params.id);
    await storage.revokeDeviceBinding(bindingId);
    res.status(204).send();
  });

  // Legacy subscription endpoints (for backwards compatibility)
  app.get("/api/subscription/plans", async (_req, res) => {
    const plans = await storage.getActiveSubscriptionPlans();
    res.json(plans);
  });

  // Public: Get default screen price from system settings
  app.get("/api/settings/price", async (_req, res) => {
    const price = await storage.getSystemSetting('price_per_screen');
    res.json({ pricePerScreen: price ? parseInt(price, 10) : 50 });
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

  // Admin: Get storage/disk usage
  app.get("/api/admin/storage", requireAdmin, async (req: any, res) => {
    try {
      const { execSync } = await import('child_process');
      const dfOutput = execSync('df -B1 /').toString();
      const lines = dfOutput.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        const total = parseInt(parts[1]) || 0;
        const used = parseInt(parts[2]) || 0;
        const available = parseInt(parts[3]) || 0;
        res.json({
          total,
          used,
          available,
          usedPercent: total > 0 ? Math.round((used / total) * 100) : 0
        });
      } else {
        res.json({ total: 0, used: 0, available: 0, usedPercent: 0 });
      }
    } catch (error) {
      res.json({ total: 0, used: 0, available: 0, usedPercent: 0 });
    }
  });

  // Admin: Get all users with stats
  app.get("/api/admin/users", requireAdmin, async (req: any, res) => {
    const users = await storage.getAllUsers();
    // Add screen and subscription counts for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const screens = await storage.getScreens(user.id);
      const subscriptions = await storage.getSubscriptions(user.id);
      return {
        ...user,
        screenCount: screens.length,
        subscriptionCount: subscriptions.length
      };
    }));
    res.json(usersWithStats);
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
    
    // Create invoice for the subscription - use price from settings
    const priceFromSettings = await storage.getSystemSetting('price_per_screen');
    const pricePerScreen = priceFromSettings ? parseInt(priceFromSettings, 10) : 50;
    const amount = screenCount * pricePerScreen * durationYears;
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

  // Admin: Delete any screen
  app.delete("/api/admin/screens/:id", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const screenId = Number(req.params.id);
    
    const screen = await storage.getScreen(screenId);
    if (!screen) {
      return res.status(404).json({ message: "الشاشة غير موجودة" });
    }
    
    await storage.deleteScreen(screenId);
    
    // Log admin activity
    await storage.logAdminActivity(
      adminId,
      'screen_deleted',
      'screen',
      String(screenId),
      JSON.stringify({ screenName: screen.name, userId: screen.userId }),
      req.ip
    );
    
    res.json({ message: "تم حذف الشاشة بنجاح" });
  });

  // Admin: Get all invoices
  app.get("/api/admin/invoices", requireAdmin, async (req: any, res) => {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  });

  // Get single invoice with details (for invoice view/print)
  app.get("/api/invoices/:id", requireAuth, async (req: any, res) => {
    const invoiceId = Number(req.params.id);
    const userId = getUserId(req);
    
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "الفاتورة غير موجودة" });
    }
    
    // Check if user is owner or admin
    const isAdmin = await storage.getAdmin(userId);
    if (invoice.userId !== userId && !isAdmin) {
      return res.status(403).json({ message: "غير مصرح لك بعرض هذه الفاتورة" });
    }
    
    // Get subscription and user details
    const subscription = await storage.getSubscription(invoice.subscriptionId);
    const user = await storage.getUserById(invoice.userId);
    
    res.json({
      ...invoice,
      subscription,
      user: user ? { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        companyName: user.companyName 
      } : null
    });
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

  // Get accepted team memberships for the current user
  app.get("/api/team/accepted", requireAuth, async (req: any, res) => {
    const memberId = getUserId(req);
    const memberships = await storage.getAcceptedTeamMemberships(memberId);
    res.json(memberships);
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

  // Update user profile
  app.patch("/api/user/profile", requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const { firstName, lastName, companyName, email } = req.body;
    
    // Validate firstName if provided
    if (firstName !== undefined && (!firstName || firstName.trim().length < 2)) {
      return res.status(400).json({ message: "الاسم الأول يجب أن يكون حرفين على الأقل" });
    }
    
    // Validate companyName if provided
    if (companyName !== undefined && (!companyName || companyName.trim().length < 2)) {
      return res.status(400).json({ message: "اسم الشركة يجب أن يكون حرفين على الأقل" });
    }
    
    // Validate email if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "البريد الإلكتروني غير صالح" });
      }
      // Check if email is already in use by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      }
    }
    
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || null;
    if (companyName !== undefined) updateData.companyName = companyName.trim();
    if (email !== undefined) updateData.email = email.trim();
    
    const updated = await storage.updateUserProfile(userId, updateData);
    res.json(updated);
  });

  // Admin: Get system settings
  app.get("/api/admin/settings", requireAdmin, async (req: any, res) => {
    const settings = await storage.getSystemSettings();
    
    // Return settings as key-value object for easier frontend use
    const settingsObj: Record<string, string> = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    
    // Add defaults if not set
    if (!settingsObj['price_per_screen']) {
      settingsObj['price_per_screen'] = '50';
    }
    
    res.json(settingsObj);
  });

  // Admin: Update system settings
  app.patch("/api/admin/settings", requireAdmin, async (req: any, res) => {
    const adminId = getUserId(req);
    const { key, value, description } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ message: "المفتاح والقيمة مطلوبان" });
    }
    
    const setting = await storage.setSystemSetting(key, String(value), description, adminId);
    
    // Log admin activity
    await storage.logAdminActivity(
      adminId,
      'setting_updated',
      'system_settings',
      key,
      JSON.stringify({ key, value }),
      req.ip
    );
    
    res.json(setting);
  });

  // Public: Get price per screen (for subscription form)
  app.get("/api/settings/price", async (req, res) => {
    const price = await storage.getSystemSetting('price_per_screen');
    res.json({ pricePerScreen: price ? parseInt(price, 10) : 50 });
  });

  // AI Image Generation using Pollinations.ai (free, no API key required)
  app.post("/api/ai/generate-image", requireAuth, async (req: any, res) => {
    try {
      const { prompt, width = 1024, height = 1024 } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "الوصف مطلوب" });
      }

      // Build the Pollinations.ai URL
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&enhance=true`;
      
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("AI image generation error:", error);
      res.status(500).json({ message: "فشل في إنشاء الصورة" });
    }
  });

  // Save AI-generated image to media library (requires editor permission)
  app.post("/api/ai/save-image", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { imageUrl, title } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ message: "رابط الصورة مطلوب" });
      }

      // Security: Only allow Pollinations.ai URLs to prevent SSRF attacks
      const allowedDomain = 'image.pollinations.ai';
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(imageUrl);
      } catch {
        return res.status(400).json({ message: "رابط غير صالح" });
      }
      
      if (parsedUrl.hostname !== allowedDomain) {
        return res.status(400).json({ message: "مصدر الصورة غير مسموح به" });
      }

      // Fetch the image from Pollinations
      const https = await import('https');
      const fs = await import('fs');
      
      const fileName = `ai-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
      const filePath = path.join('public/uploads', fileName);
      
      await new Promise((resolve, reject) => {
        https.get(imageUrl, (response: any) => {
          // Check for successful response
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }
          
          // Verify content type is an image
          const contentType = response.headers['content-type'] || '';
          if (!contentType.startsWith('image/')) {
            reject(new Error('Invalid content type'));
            return;
          }
          
          const file = fs.createWriteStream(filePath);
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(true);
          });
          file.on('error', (err: any) => {
            fs.unlink(filePath, () => {});
            reject(err);
          });
        }).on('error', (err: any) => {
          reject(err);
        });
      });

      // Create media item
      const mediaItem = await storage.createMediaItem({
        title: title || 'صورة AI',
        url: `/uploads/${fileName}`,
        type: 'image',
        duration: 10,
        groupId: null,
        userId: userId,
      });

      res.json(mediaItem);
    } catch (error: any) {
      console.error("Save AI image error:", error);
      res.status(500).json({ message: "فشل في حفظ الصورة" });
    }
  });

  // AI Image Editing using Pollinations.ai kontext model (image-to-image)
  // Requires editor permission to prevent abuse
  app.post("/api/ai/edit-image", requireAuth, requireEditor, async (req: any, res) => {
    try {
      const { prompt, imageData } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "وصف التعديل مطلوب" });
      }

      if (!imageData) {
        return res.status(400).json({ message: "الصورة الأصلية مطلوبة" });
      }

      // Validate that imageData is a valid base64 data URL with allowed MIME types
      const mimeMatch = imageData.match(/^data:(image\/(jpeg|jpg|png|gif|webp));base64,/);
      if (!mimeMatch) {
        return res.status(400).json({ message: "صيغة الصورة غير صالحة - يُسمح فقط بـ JPEG, PNG, GIF, WebP" });
      }

      // Extract base64 data and validate size (max 5MB)
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (sizeInBytes > maxSize) {
        return res.status(400).json({ message: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت" });
      }

      // Save the source image temporarily to get a public URL
      const fs = await import('fs');
      const tempFileName = `temp-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
      const tempFilePath = path.join('public/uploads', tempFileName);
      
      await fs.promises.writeFile(tempFilePath, base64Data, 'base64');
      
      // Get public URL for the image
      const host = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER?.toLowerCase()}.repl.co`
        : 'https://meror.net';
      const publicImageUrl = `${host}/uploads/${tempFileName}`;

      // Build the Pollinations.ai URL with flux model for image editing
      // Note: Pollinations image parameter is experimental, flux model supports basic image influence
      const encodedPrompt = encodeURIComponent(prompt);
      const encodedImageUrl = encodeURIComponent(publicImageUrl);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&image=${encodedImageUrl}&nologo=true`;
      
      // Clean up temp file after a delay (give Pollinations time to fetch it)
      setTimeout(async () => {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch {}
      }, 120000); // 2 minutes
      
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("AI image edit error:", error);
      res.status(500).json({ message: "فشل في تعديل الصورة" });
    }
  });

  return httpServer;
}
