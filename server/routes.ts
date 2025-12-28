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

  // Serve uploads directory
  app.use("/uploads", express.static("public/uploads"));

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Upload endpoint
  app.post("/api/upload", requireAuth, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
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

  // Subscriptions
  app.get("/api/subscription/plans", async (_req, res) => {
    const plans = await storage.getSubscriptionPlans();
    res.json(plans);
  });

  app.get("/api/subscription/status", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const sub = await storage.getUserSubscription(userId);
    res.json(sub || { status: 'none' });
  });

  app.post("/api/subscription/subscribe", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { planId, maxScreens, durationYears, type } = req.body;
    
    if (type === 'custom') {
      if (!maxScreens || !durationYears) {
        return res.status(400).json({ message: "Screens count and duration are required for custom subscription" });
      }
      const sub = await storage.createCustomSubscription(userId, maxScreens, durationYears);
      return res.json(sub);
    }

    if (!planId) return res.status(400).json({ message: "Plan ID is required" });
    const sub = await storage.updateUserSubscription(userId, planId);
    res.json(sub);
  });

  // Screens
  app.get(api.screens.list.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const screens = await storage.getScreens(userId);
    res.json(screens);
  });

  app.post(api.screens.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.screens.create.input.parse(req.body);
      
      // Check subscription limit
      const screens = await storage.getScreens(userId);
      const sub = await storage.getUserSubscription(userId);
      const maxScreens = sub?.maxScreens || 2; // Default free limit

      if (screens.length >= maxScreens) {
        return res.status(403).json({ 
          message: `لقد وصلت للحد الأقصى لعدد الشاشات المسموح به في باقتك الحالية (${maxScreens}). يرجى ترقية الاشتراك.` 
        });
      }

      const screen = await storage.createScreen({ ...input, userId });
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

  // Schedules
  app.get(api.schedules.list.path, async (req, res) => {
    const screenId = Number(req.params.screenId);
    const schedules = await storage.getSchedules(screenId);
    res.json(schedules);
  });

  app.post(api.schedules.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.schedules.create.input.parse(req.body);
      const screenId = input.screenId;
      if (!screenId) return res.status(400).json({ message: "Screen ID is required" });
      
      const screen = await storage.getScreen(screenId);
      if (!screen || screen.userId !== userId) {
         return res.status(403).json({ message: "Forbidden" });
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

  return httpServer;
}
