import { db } from "./db";
import {
  screens, mediaItems, schedules, screenGroups, mediaGroups,
  subscriptionPlans, userSubscriptions, subscriptions, discountCodes,
  screenActivationCodes, screenDeviceBindings,
  admins, adminActivityLogs, invoices, users, teamMembers,
  type Screen, type InsertScreen,
  type MediaItem, type InsertMediaItem,
  type Schedule, type InsertSchedule,
  type ScreenGroup, type InsertScreenGroup,
  type MediaGroup, type InsertMediaGroup,
  type SubscriptionPlan, type UserSubscription, type Subscription, type DiscountCode,
  type ScreenActivationCode, type ScreenDeviceBinding,
  type Admin, type AdminActivityLog, type Invoice, type User, type TeamMember,
  type InsertSubscriptionPlan, type InsertDiscountCode
} from "@shared/schema";
import { eq, desc, and, gt, lte, isNull, sql, ne } from "drizzle-orm";

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
  createSubscription(userId: string, screenCount: number, durationYears: number, discountCode?: DiscountCode | null): Promise<Subscription>;
  getAvailableScreenSlots(userId: string): Promise<number>;
  findSubscriptionWithAvailableSlot(userId: string): Promise<Subscription | null>;
  getScreensCountBySubscription(subscriptionId: number): Promise<number>;
  expireOldSubscriptions(): Promise<void>;
  
  // Legacy subscription plans (for reference)
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getUserSubscription(userId: string): Promise<(UserSubscription & { plan?: SubscriptionPlan }) | undefined>;
  updateUserSubscription(userId: string, planId: number): Promise<UserSubscription>;
  getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined>;
  incrementDiscountCodeUsage(code: string): Promise<void>;

  // Device binding
  createActivationCode(screenId: number, createdBy: string): Promise<ScreenActivationCode>;
  getActivationCode(code: string): Promise<ScreenActivationCode | undefined>;
  useActivationCode(code: string, deviceToken: string, deviceInfo?: string): Promise<ScreenDeviceBinding | null>;
  getDeviceBinding(deviceToken: string, screenId: number): Promise<ScreenDeviceBinding | undefined>;
  getDeviceBindingsByScreen(screenId: number): Promise<ScreenDeviceBinding[]>;
  revokeDeviceBinding(id: number): Promise<void>;
  updateDeviceLastSeen(id: number): Promise<void>;

  // Admin operations
  isAdmin(userId: string): Promise<boolean>;
  getAdmin(userId: string): Promise<Admin | undefined>;
  createAdmin(userId: string, role?: string, createdBy?: string): Promise<Admin>;
  removeAdmin(userId: string): Promise<void>;
  getAllAdmins(): Promise<(Admin & { user: User })[]>;
  
  // Admin activity logging
  logAdminActivity(adminId: string, action: string, targetType?: string, targetId?: string, details?: string, ipAddress?: string): Promise<AdminActivityLog>;
  getAdminActivityLogs(limit?: number): Promise<AdminActivityLog[]>;
  
  // Admin: All users management
  getAllUsers(): Promise<User[]>;
  getUserById(userId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserCompanyName(userId: string, companyName: string): Promise<User>;
  updateUserProfile(userId: string, data: { firstName?: string; lastName?: string | null; companyName?: string; email?: string }): Promise<User>;
  
  // Admin: All subscriptions
  getAllSubscriptions(): Promise<(Subscription & { user: User })[]>;
  
  // Admin: All screens
  getAllScreens(): Promise<(Screen & { user: User })[]>;
  createScreenForUser(userId: string, name: string, location?: string): Promise<Screen>;
  
  // Admin: Invoices
  getInvoices(): Promise<(Invoice & { user: User, subscription: Subscription })[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(subscriptionId: number, userId: string, amount: number, createdBy: string, notes?: string): Promise<Invoice>;
  updateInvoiceStatus(id: number, status: string, paymentMethod?: string): Promise<Invoice>;
  
  // Admin: Statistics
  getSystemStats(): Promise<{
    totalUsers: number;
    totalScreens: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalRevenue: number;
    paidInvoices: number;
    pendingInvoices: number;
  }>;
  
  // Team Members
  getTeamMembers(ownerId: string): Promise<(TeamMember & { member?: User })[]>;
  inviteTeamMember(ownerId: string, email: string, name: string, permission: string): Promise<TeamMember>;
  updateTeamMemberPermission(ownerId: string, invitationId: number, permission: string): Promise<TeamMember | null>;
  getTeamMemberByEmail(ownerId: string, email: string): Promise<TeamMember | undefined>;
  acceptTeamInvitation(memberId: string, ownerId: string, userEmail: string): Promise<TeamMember | null>;
  rejectTeamInvitation(ownerId: string, userEmail: string): Promise<void>;
  removeTeamMember(ownerId: string, memberIdOrInvitationId: number): Promise<void>;
  getOwnerForMember(memberId: string): Promise<string | null>;
  getPendingInvitations(email: string): Promise<(TeamMember & { owner: User })[]>;
  
  // Admin: Subscription Plans Management
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan>;
  deleteSubscriptionPlan(id: number): Promise<void>;
  
  // Admin: Discount Codes Management
  getAllDiscountCodes(): Promise<DiscountCode[]>;
  getDiscountCode(id: number): Promise<DiscountCode | undefined>;
  getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined>;
  createDiscountCode(code: InsertDiscountCode): Promise<DiscountCode>;
  updateDiscountCode(id: number, code: Partial<InsertDiscountCode>): Promise<DiscountCode>;
  deleteDiscountCode(id: number): Promise<void>;
  incrementDiscountCodeUsage(id: number): Promise<void>;
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

  async createSubscription(userId: string, screenCount: number, durationYears: number, discountCode?: DiscountCode | null): Promise<Subscription> {
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + durationYears);
    
    const pricePerScreen = 50;
    let totalPrice = screenCount * pricePerScreen * durationYears;
    
    // Apply discount if provided
    if (discountCode) {
      if (discountCode.discountType === 'percentage') {
        totalPrice = totalPrice * (1 - discountCode.discountValue / 100);
      } else if (discountCode.discountType === 'fixed') {
        totalPrice = totalPrice - discountCode.discountValue;
      }
      totalPrice = Math.max(0, Math.round(totalPrice));
    }

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

  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  }

  async getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
    const [result] = await db.select().from(discountCodes).where(eq(discountCodes.code, code)).limit(1);
    return result;
  }

  async incrementDiscountCodeUsage(code: string): Promise<void> {
    await db.update(discountCodes)
      .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
      .where(eq(discountCodes.code, code));
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
    const allScreens = await db.select().from(screens).where(eq(screens.userId, userId)).orderBy(desc(screens.createdAt));
    
    // Check for stale heartbeats and mark screens as offline
    const now = new Date();
    const staleThreshold = 60000; // 60 seconds
    
    for (const screen of allScreens) {
      if (screen.status === 'online' && screen.lastHeartbeat) {
        const timeSinceHeartbeat = now.getTime() - new Date(screen.lastHeartbeat).getTime();
        if (timeSinceHeartbeat > staleThreshold) {
          await db.update(screens).set({ status: 'offline' }).where(eq(screens.id, screen.id));
          screen.status = 'offline';
        }
      }
    }
    
    return allScreens;
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

  // Device Binding
  async createActivationCode(screenId: number, createdBy: string): Promise<ScreenActivationCode> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const [newCode] = await db.insert(screenActivationCodes).values({
      screenId,
      code,
      expiresAt,
      createdBy
    }).returning();
    
    return newCode;
  }

  async getActivationCode(code: string): Promise<ScreenActivationCode | undefined> {
    const [result] = await db.select().from(screenActivationCodes)
      .where(eq(screenActivationCodes.code, code.toUpperCase()));
    return result;
  }

  async useActivationCode(code: string, deviceToken: string, deviceInfo?: string): Promise<ScreenDeviceBinding | null> {
    const activation = await this.getActivationCode(code);
    
    if (!activation) return null;
    if (activation.usedAt) return null;
    if (new Date() > new Date(activation.expiresAt)) return null;

    await db.update(screenActivationCodes)
      .set({ usedAt: new Date() })
      .where(eq(screenActivationCodes.id, activation.id));

    const [binding] = await db.insert(screenDeviceBindings).values({
      screenId: activation.screenId,
      deviceToken,
      deviceInfo
    }).returning();

    return binding;
  }

  async getDeviceBinding(deviceToken: string, screenId: number): Promise<ScreenDeviceBinding | undefined> {
    const [binding] = await db.select().from(screenDeviceBindings)
      .where(and(
        eq(screenDeviceBindings.deviceToken, deviceToken),
        eq(screenDeviceBindings.screenId, screenId),
        isNull(screenDeviceBindings.revokedAt)
      ));
    return binding;
  }

  async getDeviceBindingsByScreen(screenId: number): Promise<ScreenDeviceBinding[]> {
    return await db.select().from(screenDeviceBindings)
      .where(and(
        eq(screenDeviceBindings.screenId, screenId),
        isNull(screenDeviceBindings.revokedAt)
      ))
      .orderBy(desc(screenDeviceBindings.activatedAt));
  }

  async revokeDeviceBinding(id: number): Promise<void> {
    await db.update(screenDeviceBindings)
      .set({ revokedAt: new Date() })
      .where(eq(screenDeviceBindings.id, id));
  }

  async updateDeviceLastSeen(id: number): Promise<void> {
    await db.update(screenDeviceBindings)
      .set({ lastSeenAt: new Date() })
      .where(eq(screenDeviceBindings.id, id));
  }

  // Admin operations
  async isAdmin(userId: string): Promise<boolean> {
    const [admin] = await db.select().from(admins).where(eq(admins.userId, userId));
    return !!admin;
  }

  async getAdmin(userId: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.userId, userId));
    return admin;
  }

  async createAdmin(userId: string, role: string = 'super_admin', createdBy?: string): Promise<Admin> {
    const [admin] = await db.insert(admins).values({
      userId,
      role,
      createdBy
    }).returning();
    return admin;
  }

  async removeAdmin(userId: string): Promise<void> {
    await db.delete(admins).where(eq(admins.userId, userId));
  }

  async getAllAdmins(): Promise<(Admin & { user: User })[]> {
    const result = await db.select({
      admin: admins,
      user: users
    })
    .from(admins)
    .innerJoin(users, eq(admins.userId, users.id))
    .orderBy(desc(admins.createdAt));
    
    return result.map(r => ({ ...r.admin, user: r.user }));
  }

  // Admin activity logging
  async logAdminActivity(adminId: string, action: string, targetType?: string, targetId?: string, details?: string, ipAddress?: string): Promise<AdminActivityLog> {
    const [log] = await db.insert(adminActivityLogs).values({
      adminId,
      action,
      targetType,
      targetId,
      details,
      ipAddress
    }).returning();
    return log;
  }

  async getAdminActivityLogs(limit: number = 100): Promise<AdminActivityLog[]> {
    return await db.select().from(adminActivityLogs)
      .orderBy(desc(adminActivityLogs.createdAt))
      .limit(limit);
  }

  // Admin: All users management
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async updateUserCompanyName(userId: string, companyName: string): Promise<User> {
    const [updated] = await db.update(users)
      .set({ companyName, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserProfile(userId: string, data: { firstName?: string; lastName?: string | null; companyName?: string; email?: string }): Promise<User> {
    const [updated] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // Admin: All subscriptions
  async getAllSubscriptions(): Promise<(Subscription & { user: User })[]> {
    const result = await db.select({
      subscription: subscriptions,
      user: users
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .orderBy(desc(subscriptions.createdAt));
    
    return result.map(r => ({ ...r.subscription, user: r.user }));
  }

  // Admin: All screens
  async getAllScreens(): Promise<(Screen & { user: User })[]> {
    const result = await db.select({
      screen: screens,
      user: users
    })
    .from(screens)
    .innerJoin(users, eq(screens.userId, users.id))
    .orderBy(desc(screens.createdAt));
    
    return result.map(r => ({ ...r.screen, user: r.user }));
  }

  async createScreenForUser(userId: string, name: string, location?: string): Promise<Screen> {
    const [screen] = await db.insert(screens).values({
      userId,
      name,
      location,
      status: 'offline'
    }).returning();
    return screen;
  }

  // Admin: Invoices
  async getInvoices(): Promise<(Invoice & { user: User, subscription: Subscription })[]> {
    const result = await db.select({
      invoice: invoices,
      user: users,
      subscription: subscriptions
    })
    .from(invoices)
    .innerJoin(users, eq(invoices.userId, users.id))
    .innerJoin(subscriptions, eq(invoices.subscriptionId, subscriptions.id))
    .orderBy(desc(invoices.createdAt));
    
    return result.map(r => ({ ...r.invoice, user: r.user, subscription: r.subscription }));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(subscriptionId: number, userId: string, amount: number, createdBy: string, notes?: string): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values({
      subscriptionId,
      userId,
      amount,
      status: 'pending',
      createdBy,
      notes
    }).returning();
    return invoice;
  }

  async updateInvoiceStatus(id: number, status: string, paymentMethod?: string): Promise<Invoice> {
    const updateData: any = { status };
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (status === 'paid') updateData.paidAt = new Date();
    
    const [updated] = await db.update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  // Admin: Statistics
  async getSystemStats(): Promise<{
    totalUsers: number;
    totalScreens: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalRevenue: number;
    paidInvoices: number;
    pendingInvoices: number;
  }> {
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [screensCount] = await db.select({ count: sql<number>`count(*)` }).from(screens);
    const [subsCount] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions);
    const [activeSubsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));
    const [revenueResult] = await db.select({ sum: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(invoices)
      .where(eq(invoices.status, 'paid'));
    const [paidCount] = await db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(eq(invoices.status, 'paid'));
    const [pendingCount] = await db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(eq(invoices.status, 'pending'));

    return {
      totalUsers: Number(usersCount?.count) || 0,
      totalScreens: Number(screensCount?.count) || 0,
      totalSubscriptions: Number(subsCount?.count) || 0,
      activeSubscriptions: Number(activeSubsCount?.count) || 0,
      totalRevenue: Number(revenueResult?.sum) || 0,
      paidInvoices: Number(paidCount?.count) || 0,
      pendingInvoices: Number(pendingCount?.count) || 0
    };
  }

  // Team Members
  async getTeamMembers(ownerId: string): Promise<(TeamMember & { member?: User })[]> {
    const result = await db.select({
      teamMember: teamMembers,
      member: users
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.memberId, users.id))
    .where(and(
      eq(teamMembers.ownerId, ownerId),
      isNull(teamMembers.removedAt)
    ))
    .orderBy(desc(teamMembers.invitedAt));
    
    return result.map(r => ({ ...r.teamMember, member: r.member || undefined }));
  }

  async inviteTeamMember(ownerId: string, email: string, name: string, permission: string): Promise<TeamMember> {
    const [member] = await db.insert(teamMembers).values({
      ownerId,
      memberId: null, // null until member accepts
      invitedEmail: email,
      invitedName: name,
      permission: permission,
      status: 'pending',
      role: 'member'
    }).returning();
    return member;
  }

  async updateTeamMemberPermission(ownerId: string, invitationId: number, permission: string): Promise<TeamMember | null> {
    const [updated] = await db.update(teamMembers)
      .set({ permission })
      .where(and(
        eq(teamMembers.ownerId, ownerId),
        eq(teamMembers.id, invitationId),
        ne(teamMembers.status, 'removed')
      ))
      .returning();
    return updated || null;
  }

  async getTeamMemberByEmail(ownerId: string, email: string): Promise<TeamMember | undefined> {
    const [member] = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.ownerId, ownerId),
        eq(teamMembers.invitedEmail, email),
        isNull(teamMembers.removedAt)
      ));
    return member;
  }

  async acceptTeamInvitation(memberId: string, ownerId: string, userEmail: string): Promise<TeamMember | null> {
    // Find pending invitation for this owner with matching email
    const [invitation] = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.ownerId, ownerId),
        eq(teamMembers.invitedEmail, userEmail), // Must match invited email
        eq(teamMembers.status, 'pending'),
        isNull(teamMembers.removedAt)
      ));
    
    if (!invitation) return null;
    
    // Update with the actual member ID
    const [updated] = await db.update(teamMembers)
      .set({
        memberId,
        status: 'active',
        joinedAt: new Date()
      })
      .where(eq(teamMembers.id, invitation.id))
      .returning();
    
    return updated;
  }

  async removeTeamMember(ownerId: string, invitationId: number): Promise<void> {
    await db.update(teamMembers)
      .set({ removedAt: new Date(), status: 'removed' })
      .where(and(
        eq(teamMembers.ownerId, ownerId),
        eq(teamMembers.id, invitationId)
      ));
  }

  async rejectTeamInvitation(ownerId: string, userEmail: string): Promise<void> {
    await db.update(teamMembers)
      .set({ removedAt: new Date(), status: 'removed' })
      .where(and(
        eq(teamMembers.ownerId, ownerId),
        eq(teamMembers.invitedEmail, userEmail),
        eq(teamMembers.status, 'pending')
      ));
  }

  async getOwnerForMember(memberId: string): Promise<string | null> {
    const [result] = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.memberId, memberId),
        eq(teamMembers.status, 'active'),
        isNull(teamMembers.removedAt)
      ));
    
    return result?.ownerId || null;
  }

  async getPendingInvitations(email: string): Promise<(TeamMember & { owner: User })[]> {
    const result = await db.select({
      teamMember: teamMembers,
      owner: users
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.ownerId, users.id))
    .where(and(
      eq(teamMembers.invitedEmail, email),
      eq(teamMembers.status, 'pending'),
      isNull(teamMembers.removedAt)
    ));
    
    return result.map(r => ({ ...r.teamMember, owner: r.owner }));
  }

  // Admin: Subscription Plans Management
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).orderBy(desc(subscriptionPlans.createdAt));
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [created] = await db.insert(subscriptionPlans).values(plan).returning();
    return created;
  }

  async updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan> {
    const [updated] = await db.update(subscriptionPlans)
      .set(plan)
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return updated;
  }

  async deleteSubscriptionPlan(id: number): Promise<void> {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }

  // Admin: Discount Codes Management
  async getAllDiscountCodes(): Promise<DiscountCode[]> {
    return await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
  }

  async getDiscountCode(id: number): Promise<DiscountCode | undefined> {
    const [code] = await db.select().from(discountCodes).where(eq(discountCodes.id, id));
    return code;
  }

  async getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
    const [result] = await db.select().from(discountCodes).where(eq(discountCodes.code, code));
    return result;
  }

  async createDiscountCode(code: InsertDiscountCode): Promise<DiscountCode> {
    const [created] = await db.insert(discountCodes).values(code).returning();
    return created;
  }

  async updateDiscountCode(id: number, code: Partial<InsertDiscountCode>): Promise<DiscountCode> {
    const [updated] = await db.update(discountCodes)
      .set(code)
      .where(eq(discountCodes.id, id))
      .returning();
    return updated;
  }

  async deleteDiscountCode(id: number): Promise<void> {
    await db.delete(discountCodes).where(eq(discountCodes.id, id));
  }

  async incrementDiscountCodeUsage(id: number): Promise<void> {
    await db.update(discountCodes)
      .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
      .where(eq(discountCodes.id, id));
  }
}

export const storage = new DatabaseStorage();
