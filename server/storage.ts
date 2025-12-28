import { db } from "./db";
import {
  screens, mediaItems, schedules,
  type Screen, type InsertScreen,
  type MediaItem, type InsertMediaItem,
  type Schedule, type InsertSchedule
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Screens
  getScreens(userId: string): Promise<Screen[]>;
  getScreen(id: number): Promise<Screen | undefined>;
  createScreen(screen: InsertScreen): Promise<Screen>;
  deleteScreen(id: number): Promise<void>;

  // Media
  getMediaItems(userId: string): Promise<MediaItem[]>;
  getMediaItem(id: number): Promise<MediaItem | undefined>;
  createMediaItem(item: InsertMediaItem): Promise<MediaItem>;
  deleteMediaItem(id: number): Promise<void>;

  // Schedules
  getSchedules(screenId: number): Promise<(Schedule & { mediaItem: MediaItem })[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Screens
  async getScreens(userId: string): Promise<Screen[]> {
    return await db.select().from(screens).where(eq(screens.userId, userId)).orderBy(desc(screens.createdAt));
  }

  async getScreen(id: number): Promise<Screen | undefined> {
    const [screen] = await db.select().from(screens).where(eq(screens.id, id));
    return screen;
  }

  async createScreen(screen: InsertScreen): Promise<Screen> {
    const [newScreen] = await db.insert(screens).values(screen).returning();
    return newScreen;
  }

  async deleteScreen(id: number): Promise<void> {
    await db.delete(screens).where(eq(screens.id, id));
  }

  // Media
  async getMediaItems(userId: string): Promise<MediaItem[]> {
    return await db.select().from(mediaItems).where(eq(mediaItems.userId, userId)).orderBy(desc(mediaItems.createdAt));
  }

  async getMediaItem(id: number): Promise<MediaItem | undefined> {
    const [item] = await db.select().from(mediaItems).where(eq(mediaItems.id, id));
    return item;
  }

  async createMediaItem(item: InsertMediaItem): Promise<MediaItem> {
    const [newItem] = await db.insert(mediaItems).values(item).returning();
    return newItem;
  }

  async deleteMediaItem(id: number): Promise<void> {
    await db.delete(mediaItems).where(eq(mediaItems.id, id));
  }

  // Schedules
  async getSchedules(screenId: number): Promise<(Schedule & { mediaItem: MediaItem })[]> {
    // Join with media items to get details for the player
    const result = await db.select({
        schedule: schedules,
        mediaItem: mediaItems
      })
      .from(schedules)
      .innerJoin(mediaItems, eq(schedules.mediaItemId, mediaItems.id))
      .where(eq(schedules.screenId, screenId))
      .orderBy(schedules.priority);
    
    return result.map(row => ({ ...row.schedule, mediaItem: row.mediaItem }));
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [newSchedule] = await db.insert(schedules).values(schedule).returning();
    return newSchedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }
}

export const storage = new DatabaseStorage();
