import { db } from "./db";
import {
  screens, mediaItems, schedules, screenGroups, mediaGroups,
  subscriptionPlans, userSubscriptions, subscriptions,
  type Screen, type InsertScreen,
  type MediaItem, type InsertMediaItem,
  type Schedule, type InsertSchedule,
  type ScreenGroup, type InsertScreenGroup,
  type MediaGroup, type InsertMediaGroup,
  type SubscriptionPlan, type UserSubscription, type Subscription
} from "@shared/schema";
import { eq, desc, and, gt, lte } from "drizzle-orm";

export interface IStorage {
  // Screen Groups
  getScreenGroups(userId: string): Promise<ScreenGroup[]>;
  createScreenGroup(group: InsertScreenGroup & { userId: string }): Promise<ScreenGroup>;
  deleteScreenGroup(id: number): Promise<void>;
  
  // Media Groups
  getMediaGroups(userId: string): Promise<MediaGroup[]>;
  createMediaGroup(group: InsertMediaGroup & { userId: string }): Promise<MediaGroup>;

  // Screens
  getScreens(userId: string): Promise<Screen[]>;
  getScreen(id: number): Promise<Screen | undefined>;
  createScreen(screen: InsertScreen & { userId: string }): Promise<Screen>;
  updateScreen(id: number, data: Partial<Screen>): Promise<Screen>;
  deleteScreen(id: number): Promise<void>;

  // Media
  getMediaItems(userId: string): Promise<MediaItem[]>;
  getMediaItem(id: number): Promise<MediaItem | undefined>;
  createMediaItem(item: InsertMediaItem & { userId: string }): Promise<MediaItem>;
  deleteMediaItem(id: number): Promise<void>;

  // Schedules
  getSchedules(screenId: number): Promise<(Schedule & { mediaItem: MediaItem })[]>;
  getSchedulesByGroup(groupId: number): Promise<(Schedule & { mediaItem: MediaItem })[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;

  // Subscriptions (independent)
  getSubscriptions(userId: string): Promise<Subscription[]>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  createSubscription(userId: string, screenCount: number, durationYears: number): Promise<Subscription>;
  getAvailableScreenSlots(userId: string): Promise<number>;
  findSubscriptionWithAvailableSlot(userId: string): Promise<Subscription | null>;
  getScreensCountBySubscription(subscriptionId: number): Promise<number>;
  expireOldSubscriptions(): Promise<void>;
  
  // Legacy subscription plans (for reference)
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getUserSubscription(userId: string): Promise<(UserSubscription & { plan?: SubscriptionPlan }) | undefined>;
  updateUserSubscription(userId: string, planId: number): Promise<UserSubscription>;
}

export class DatabaseStorage implements IStorage {
  // Subscriptions (independent)
  async getSubscriptions(userId: string): Promise<Subscription[]> {
    return await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return sub;
  }

  async createSubscription(userId: string, screenCount: number, durationYears: number): Promise<Subscription> {
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + durationYears);
    
    const pricePerScreen = 50;
    const totalPrice = screenCount * pricePerScreen * durationYears;

    const [sub] = await db.insert(subscriptions).values({
      userId,
      screenCount,
      durationYears,
      endDate,
      pricePerScreen,
      totalPrice,
      status: 'active'
    }).returning();
    
    return sub;
  }

  async getAvailableScreenSlots(userId: string): Promise<number> {
    await this.expireOldSubscriptions();
    
    const now = new Date();
    const activeSubs = await db.select().from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gt(subscriptions.endDate, now)
      ));
    
    const totalSubscribedScreens = activeSubs.reduce((sum, sub) => sum + sub.screenCount, 0);
    
    const allUserScreens = await db.select().from(screens)
      .where(eq(screens.userId, userId));
    const totalScreens = allUserScreens.length;
    
    return Math.max(0, totalSubscribedScreens - totalScreens);
  }

  async findSubscriptionWithAvailableSlot(userId: string): Promise<Subscription | null> {
    await this.expireOldSubscriptions();
    
    const availableSlots = await this.getAvailableScreenSlots(userId);
    if (availableSlots <= 0) {
      return null;
    }
    
    const now = new Date();
    const activeSubs = await db.select().from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gt(subscriptions.endDate, now)
      ))
      .orderBy(subscriptions.endDate);
    
    for (const sub of activeSubs) {
      const screensInSub = await db.select().from(screens)
        .where(eq(screens.subscriptionId, sub.id));
      if (screensInSub.length < sub.screenCount) {
        return sub;
      }
    }
    
    return activeSubs[0] || null;
  }

  async getScreensCountBySubscription(subscriptionId: number): Promise<number> {
    const screensInSub = await db.select().from(screens)
      .where(eq(screens.subscriptionId, subscriptionId));
    return screensInSub.length;
  }

  async expireOldSubscriptions(): Promise<void> {
    const now = new Date();
    await db.update(subscriptions)
      .set({ status: 'expired' })
      .where(and(
        eq(subscriptions.status, 'active'),
        lte(subscriptions.endDate, now)
      ));
  }

  // Legacy subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans);
  }

  async getUserSubscription(userId: string): Promise<(UserSubscription & { plan?: SubscriptionPlan }) | undefined> {
    const result = await db.select({
      subscription: userSubscriptions,
      plan: subscriptionPlans
    })
    .from(userSubscriptions)
    .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

    const first = result[0];
    return first ? { ...first.subscription, plan: first.plan || undefined } : undefined;
  }

  async updateUserSubscription(userId: string, planId: number): Promise<UserSubscription> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
    const [existing] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    const data = { 
      userId, 
      planId, 
      maxScreens: plan.maxScreens,
      status: 'active', 
      currentPeriodEnd,
      subscriptionType: 'plan',
      durationYears: 0
    };

    if (existing) {
      const [updated] = await db.update(userSubscriptions)
        .set(data)
        .where(eq(userSubscriptions.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(userSubscriptions)
        .values(data)
        .returning();
      return inserted;
    }
  }

  // Screen Groups
  async getScreenGroups(userId: string): Promise<ScreenGroup[]> {
    return await db.select().from(screenGroups).where(eq(screenGroups.userId, userId)).orderBy(desc(screenGroups.createdAt));
  }

  async createScreenGroup(group: InsertScreenGroup & { userId: string }): Promise<ScreenGroup> {
    const [newGroup] = await db.insert(screenGroups).values(group).returning();
    return newGroup;
  }

  async deleteScreenGroup(id: number): Promise<void> {
    await db.update(screens).set({ groupId: null }).where(eq(screens.groupId, id));
    await db.delete(schedules).where(eq(schedules.screenGroupId, id));
    await db.delete(screenGroups).where(eq(screenGroups.id, id));
  }

  // Media Groups
  async getMediaGroups(userId: string): Promise<MediaGroup[]> {
    return await db.select().from(mediaGroups).where(eq(mediaGroups.userId, userId)).orderBy(desc(mediaGroups.createdAt));
  }

  async createMediaGroup(group: InsertMediaGroup & { userId: string }): Promise<MediaGroup> {
    const [newGroup] = await db.insert(mediaGroups).values(group).returning();
    return newGroup;
  }

  // Screens
  async getScreens(userId: string): Promise<Screen[]> {
    return await db.select().from(screens).where(eq(screens.userId, userId)).orderBy(desc(screens.createdAt));
  }

  async getScreen(id: number): Promise<Screen | undefined> {
    const [screen] = await db.select().from(screens).where(eq(screens.id, id));
    return screen;
  }

  async createScreen(screen: InsertScreen & { userId: string }): Promise<Screen> {
    const [newScreen] = await db.insert(screens).values(screen).returning();
    return newScreen;
  }

  async updateScreen(id: number, data: Partial<Screen>): Promise<Screen> {
    const [updated] = await db.update(screens).set(data).where(eq(screens.id, id)).returning();
    return updated;
  }

  async deleteScreen(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.screenId, id));
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

  async createMediaItem(item: InsertMediaItem & { userId: string }): Promise<MediaItem> {
    const [newItem] = await db.insert(mediaItems).values(item).returning();
    return newItem;
  }

  async deleteMediaItem(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.mediaItemId, id));
    await db.delete(mediaItems).where(eq(mediaItems.id, id));
  }

  // Schedules
  async getSchedules(screenId: number): Promise<(Schedule & { mediaItem: MediaItem })[]> {
    const result = await db.select({
        schedule: schedules,
        mediaItem: mediaItems
      })
      .from(schedules)
      .innerJoin(mediaItems, eq(schedules.mediaItemId, mediaItems.id))
      .where(eq(schedules.screenId, screenId))
      .orderBy(schedules.displayOrder);
    
    return result.map(row => ({ ...row.schedule, mediaItem: row.mediaItem }));
  }

  async getSchedulesByGroup(groupId: number): Promise<(Schedule & { mediaItem: MediaItem })[]> {
    const result = await db.select({
        schedule: schedules,
        mediaItem: mediaItems
      })
      .from(schedules)
      .innerJoin(mediaItems, eq(schedules.mediaItemId, mediaItems.id))
      .where(eq(schedules.screenGroupId, groupId))
      .orderBy(schedules.displayOrder);
    
    return result.map(row => ({ ...row.schedule, mediaItem: row.mediaItem }));
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [newSchedule] = await db.insert(schedules).values(schedule).returning();
    return newSchedule;
  }

  async updateSchedule(id: number, data: Partial<Schedule>): Promise<Schedule> {
    const [updated] = await db.update(schedules).set(data).where(eq(schedules.id, id)).returning();
    return updated;
  }

  async updateSchedulesOrder(updates: { id: number; displayOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db.update(schedules).set({ displayOrder: update.displayOrder }).where(eq(schedules.id, update.id));
    }
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }
}

export const storage = new DatabaseStorage();
