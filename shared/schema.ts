import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./models/auth";

export * from "./models/auth";

export const screenGroups = pgTable("screen_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mediaGroups = pgTable("media_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  pricePerScreen: integer("price_per_screen").notNull().default(50), // سعر الشاشة الواحدة بالريال
  minScreens: integer("min_screens").default(1), // الحد الأدنى للشاشات
  maxScreens: integer("max_screens"), // الحد الأقصى للشاشات (null = غير محدود)
  discountPercentage: integer("discount_percentage").default(0), // نسبة الخصم
  features: text("features"), // المميزات (JSON)
  isActive: boolean("is_active").default(true), // هل الخطة فعالة؟
  isDefault: boolean("is_default").default(false), // الخطة الافتراضية
  createdAt: timestamp("created_at").defaultNow(),
});

// أكواد الخصم
export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // كود الخصم
  description: text("description"), // وصف الخصم
  discountType: text("discount_type").notNull().default("percentage"), // percentage, fixed
  discountValue: integer("discount_value").notNull(), // قيمة الخصم (نسبة أو مبلغ ثابت)
  minScreens: integer("min_screens").default(1), // الحد الأدنى للشاشات للاستفادة
  maxUses: integer("max_uses"), // الحد الأقصى للاستخدام (null = غير محدود)
  usedCount: integer("used_count").default(0), // عدد مرات الاستخدام
  validFrom: timestamp("valid_from").defaultNow(), // تاريخ بداية الصلاحية
  validUntil: timestamp("valid_until"), // تاريخ انتهاء الصلاحية (null = دائم)
  isActive: boolean("is_active").default(true), // هل الكود فعال؟
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id), // Nullable for custom plans
  maxScreens: integer("max_screens").notNull().default(2),
  status: text("status").notNull(), // active, expired, trialing
  currentPeriodEnd: timestamp("current_period_end"),
  subscriptionType: text("subscription_type").notNull().default("plan"), // plan, custom
  durationYears: integer("duration_years").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// اشتراكات مستقلة - كل اشتراك يحدد عدد الشاشات ومدة الاشتراك
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  screenCount: integer("screen_count").notNull().default(1),
  durationYears: integer("duration_years").notNull().default(1),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"), // active, expired
  pricePerScreen: integer("price_per_screen").default(50),
  totalPrice: integer("total_price").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const screens = pgTable("screens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  status: text("status").default("offline"), // online, offline
  orientation: text("orientation").default("landscape"), // landscape (عرضي), portrait (طولي)
  lastHeartbeat: timestamp("last_heartbeat"), // آخر نبضة من المشغّل
  groupId: integer("group_id").references(() => screenGroups.id),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // image, video
  url: text("url").notNull(),
  duration: integer("duration").default(10), // seconds, default for images
  groupId: integer("group_id").references(() => mediaGroups.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  screenId: integer("screen_id").references(() => screens.id),
  screenGroupId: integer("screen_group_id").references(() => screenGroups.id),
  mediaItemId: integer("media_item_id").references(() => mediaItems.id),
  mediaGroupId: integer("media_group_id").references(() => mediaGroups.id),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration").default(10),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// رموز تفعيل الشاشات - تُستخدم لمرة واحدة لربط جهاز بشاشة
export const screenActivationCodes = pgTable("screen_activation_codes", {
  id: serial("id").primaryKey(),
  screenId: integer("screen_id").references(() => screens.id).notNull(),
  code: text("code").notNull(), // رمز من 6 أحرف
  expiresAt: timestamp("expires_at").notNull(), // ينتهي بعد ساعة
  usedAt: timestamp("used_at"), // null إذا لم يُستخدم بعد
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  pollingToken: text("polling_token"), // UUID for secure device token retrieval
});

// ربط الأجهزة بالشاشات - كل جهاز مرتبط بشاشة واحدة
export const screenDeviceBindings = pgTable("screen_device_bindings", {
  id: serial("id").primaryKey(),
  screenId: integer("screen_id").references(() => screens.id).notNull(),
  deviceToken: text("device_token").notNull().unique(), // token فريد للجهاز
  deviceInfo: text("device_info"), // معلومات الجهاز (اختياري)
  activatedAt: timestamp("activated_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  revokedAt: timestamp("revoked_at"), // null = فعال
});

// طلبات ربط الأجهزة المعلقة - عندما يمسح المدير QR الجهاز
export const pendingDeviceBindings = pgTable("pending_device_bindings", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(), // رقم تعريف الجهاز من QR
  screenId: integer("screen_id").references(() => screens.id).notNull(),
  deviceToken: text("device_token").notNull(), // token للجهاز بعد التفعيل
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  claimedAt: timestamp("claimed_at"), // عندما يستلم الجهاز الربط
});

// المدراء - Super Admin للتحكم الكامل بالنظام
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  role: text("role").notNull().default("super_admin"), // super_admin, admin
  permissions: text("permissions").array(), // صلاحيات إضافية
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// سجل نشاطات المدراء
export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: serial("id").primaryKey(),
  adminId: varchar("admin_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // user_created, subscription_added, screen_added, etc.
  targetType: text("target_type"), // user, subscription, screen, etc.
  targetId: text("target_id"), // ID of the target
  details: text("details"), // JSON string with additional details
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// الفواتير
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }), // رقم الفاتورة التسلسلي
  subscriptionId: integer("subscription_id").references(() => subscriptions.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(), // المبلغ الإجمالي بالريال (للتوافق مع القديم)
  baseAmount: integer("base_amount"), // المبلغ الأساسي قبل الضريبة
  taxRate: integer("tax_rate").default(10), // نسبة الضريبة (10%)
  taxAmount: integer("tax_amount"), // مبلغ الضريبة
  status: text("status").notNull().default("pending"), // pending, paid, cancelled
  paymentMethod: text("payment_method"), // cash, bank_transfer, online
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id), // المدير الذي أنشأ الفاتورة
  createdAt: timestamp("created_at").defaultNow(),
});

// أعضاء الفريق - موظفين تحت الشركة
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  ownerId: varchar("owner_id").references(() => users.id).notNull(), // مالك الشركة
  memberId: varchar("member_id").references(() => users.id), // الموظف - null أثناء الانتظار
  role: text("role").notNull().default("member"), // owner, member
  status: text("status").notNull().default("pending"), // pending, active, removed
  invitedEmail: text("invited_email").notNull(), // البريد المدعو - مطلوب للتحقق
  invitedName: text("invited_name").notNull().default(""), // اسم الشخص المدعو
  permission: text("permission").notNull().default("viewer"), // viewer, editor, manager - صلاحيات العضو
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at"), // تاريخ القبول
  removedAt: timestamp("removed_at"), // تاريخ الإزالة
});

// Relations
export const screenGroupsRelations = relations(screenGroups, ({ many }) => ({
  screens: many(screens),
  schedules: many(schedules),
}));

export const mediaGroupsRelations = relations(mediaGroups, ({ many }) => ({
  mediaItems: many(mediaItems),
  schedules: many(schedules),
}));

export const screensRelations = relations(screens, ({ one, many }) => ({
  user: one(users, {
    fields: [screens.userId],
    references: [users.id],
  }),
  group: one(screenGroups, {
    fields: [screens.groupId],
    references: [screenGroups.id],
  }),
  schedules: many(schedules),
}));

export const mediaItemsRelations = relations(mediaItems, ({ one, many }) => ({
  user: one(users, {
    fields: [mediaItems.userId],
    references: [users.id],
  }),
  group: one(mediaGroups, {
    fields: [mediaItems.groupId],
    references: [mediaGroups.id],
  }),
  schedules: many(schedules),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  screen: one(screens, {
    fields: [schedules.screenId],
    references: [screens.id],
  }),
  screenGroup: one(screenGroups, {
    fields: [schedules.screenGroupId],
    references: [screenGroups.id],
  }),
  mediaItem: one(mediaItems, {
    fields: [schedules.mediaItemId],
    references: [mediaItems.id],
  }),
  mediaGroup: one(mediaGroups, {
    fields: [schedules.mediaGroupId],
    references: [mediaGroups.id],
  }),
}));

// Schemas
export const insertScreenGroupSchema = createInsertSchema(screenGroups).omit({ id: true, createdAt: true });
export const insertMediaGroupSchema = createInsertSchema(mediaGroups).omit({ id: true, createdAt: true });
export const insertScreenSchema = createInsertSchema(screens).omit({ id: true, createdAt: true, status: true });
export const insertMediaItemSchema = createInsertSchema(mediaItems).omit({ id: true, createdAt: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true });

// Subscription schema
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, startDate: true, status: true });

// Device binding schemas
export const insertActivationCodeSchema = createInsertSchema(screenActivationCodes).omit({ id: true, createdAt: true, usedAt: true });
export const insertDeviceBindingSchema = createInsertSchema(screenDeviceBindings).omit({ id: true, activatedAt: true, lastSeenAt: true, revokedAt: true });

// Admin schemas
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLogs).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, paidAt: true });

// Subscription plans and discount codes schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
export const insertDiscountCodeSchema = createInsertSchema(discountCodes).omit({ id: true, createdAt: true, usedCount: true });

// Team member schema
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, invitedAt: true, joinedAt: true, removedAt: true });

// System settings table - for admin-configurable settings
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ id: true, updatedAt: true });

// Types
export type ScreenGroup = typeof screenGroups.$inferSelect;
export type MediaGroup = typeof mediaGroups.$inferSelect;
export type Screen = typeof screens.$inferSelect;
export type MediaItem = typeof mediaItems.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type DiscountCode = typeof discountCodes.$inferSelect;
export type ScreenActivationCode = typeof screenActivationCodes.$inferSelect;
export type ScreenDeviceBinding = typeof screenDeviceBindings.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertScreenGroup = z.infer<typeof insertScreenGroupSchema>;
export type InsertMediaGroup = z.infer<typeof insertMediaGroupSchema>;
export type InsertScreen = z.infer<typeof insertScreenSchema>;
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertActivationCode = z.infer<typeof insertActivationCodeSchema>;
export type InsertDeviceBinding = z.infer<typeof insertDeviceBindingSchema>;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
