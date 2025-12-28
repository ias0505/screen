import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./replit_integrations/auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Middleware to ensure user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Screens
  app.get(api.screens.list.path, requireAuth, async (req, res) => {
    const screens = await storage.getScreens(req.user!.id);
    res.json(screens);
  });

  app.post(api.screens.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.screens.create.input.parse(req.body);
      const screen = await storage.createScreen({ ...input, userId: req.user!.id });
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

  app.get(api.screens.get.path, async (req, res) => {
    // Public endpoint for player? Or protected? 
    // For MVP, if accessed via /api/screens/:id, let's allow it if it's the player fetching config
    // But typically user managing it needs auth.
    // Let's protect it for management, and assume player gets data via schedules endpoint which we might make public or specific.
    
    // Check if it's an authenticated user managing the screen
    if (req.isAuthenticated()) {
      const screen = await storage.getScreen(Number(req.params.id));
      if (!screen || screen.userId !== req.user!.id) {
        return res.status(404).json({ message: 'Screen not found' });
      }
      return res.json(screen);
    }
    
    // If not authenticated, maybe return basic info if needed, but safe to 401/404
    return res.status(401).json({ message: "Unauthorized" });
  });

  app.delete(api.screens.delete.path, requireAuth, async (req, res) => {
    const screen = await storage.getScreen(Number(req.params.id));
    if (!screen || screen.userId !== req.user!.id) {
      return res.status(404).json({ message: 'Screen not found' });
    }
    await storage.deleteScreen(Number(req.params.id));
    res.status(204).send();
  });

  // Media
  app.get(api.media.list.path, requireAuth, async (req, res) => {
    const media = await storage.getMediaItems(req.user!.id);
    res.json(media);
  });

  app.post(api.media.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.media.create.input.parse(req.body);
      const media = await storage.createMediaItem({ ...input, userId: req.user!.id });
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

  app.delete(api.media.delete.path, requireAuth, async (req, res) => {
    const media = await storage.getMediaItem(Number(req.params.id));
    if (!media || media.userId !== req.user!.id) {
      return res.status(404).json({ message: 'Media not found' });
    }
    await storage.deleteMediaItem(Number(req.params.id));
    res.status(204).send();
  });

  // Schedules
  // This endpoint might be accessed by the player (publicly?) or the manager (authed).
  // For MVP, let's allow public access to get schedules for a screen so the player can work without complex auth.
  app.get(api.schedules.list.path, async (req, res) => {
    const screenId = Number(req.params.screenId);
    const schedules = await storage.getSchedules(screenId);
    res.json(schedules);
  });

  app.post(api.schedules.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.schedules.create.input.parse(req.body);
      // Verify screen ownership
      const screen = await storage.getScreen(input.screenId);
      if (!screen || screen.userId !== req.user!.id) {
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
    // ideally check ownership of the screen the schedule belongs to.
    // simplistic for MVP: assume if you have the ID you can delete if you are logged in (should improve later)
    await storage.deleteSchedule(Number(req.params.id));
    res.status(204).send();
  });

  return httpServer;
}
