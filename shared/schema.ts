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
  maxScreens: integer("max_screens").notNull(),
  price: integer("price").notNull(), // in cents or currency units
  description: text("description"),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: text("status").notNull(), // active, expired, trialing
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const screens = pgTable("screens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  status: text("status").default("offline"), // online, offline
  groupId: integer("group_id").references(() => screenGroups.id),
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
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1),
  createdAt: timestamp("created_at").defaultNow(),
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

// Types
export type ScreenGroup = typeof screenGroups.$inferSelect;
export type MediaGroup = typeof mediaGroups.$inferSelect;
export type Screen = typeof screens.$inferSelect;
export type MediaItem = typeof mediaItems.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;

export type InsertScreenGroup = z.infer<typeof insertScreenGroupSchema>;
export type InsertMediaGroup = z.infer<typeof insertMediaGroupSchema>;
export type InsertScreen = z.infer<typeof insertScreenSchema>;
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
