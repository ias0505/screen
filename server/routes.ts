import type { Express } from "express";
import type { Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import express from "express";

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
    if (req.isAuthenticated()) {
      const userId = req.user.claims.sub;
      const screen = await storage.getScreen(Number(req.params.id));
      if (!screen || screen.userId !== userId) {
        return res.status(404).json({ message: 'Screen not found' });
      }
      return res.json(screen);
    }
    return res.status(401).json({ message: "Unauthorized" });
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
      const { screenGroupId, mediaItemId, priority, isActive } = req.body;
      
      const groups = await storage.getScreenGroups(userId);
      const group = groups.find(g => g.id === screenGroupId);
      if (!group) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const schedule = await storage.createSchedule({
        screenGroupId,
        mediaItemId,
        priority: priority || 1,
        isActive: isActive !== false
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
