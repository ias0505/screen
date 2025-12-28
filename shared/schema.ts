import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./models/auth";

export * from "./models/auth";

export const screens = pgTable("screens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  status: text("status").default("offline"), // online, offline
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // image, video
  url: text("url").notNull(),
  duration: integer("duration").default(10), // seconds, default for images
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  screenId: integer("screen_id").references(() => screens.id).notNull(),
  mediaItemId: integer("media_item_id").references(() => mediaItems.id).notNull(),
  startTime: timestamp("start_time"), // Optional: specific start time
  endTime: timestamp("end_time"),     // Optional: specific end time
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const screensRelations = relations(screens, ({ one, many }) => ({
  user: one(users, {
    fields: [screens.userId],
    references: [users.id],
  }),
  schedules: many(schedules),
}));

export const mediaItemsRelations = relations(mediaItems, ({ one, many }) => ({
  user: one(users, {
    fields: [mediaItems.userId],
    references: [users.id],
  }),
  schedules: many(schedules),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  screen: one(screens, {
    fields: [schedules.screenId],
    references: [screens.id],
  }),
  mediaItem: one(mediaItems, {
    fields: [schedules.mediaItemId],
    references: [mediaItems.id],
  }),
}));

// Schemas
export const insertScreenSchema = createInsertSchema(screens).omit({ id: true, createdAt: true, status: true });
export const insertMediaItemSchema = createInsertSchema(mediaItems).omit({ id: true, createdAt: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true });

// Types
export type Screen = typeof screens.$inferSelect;
export type MediaItem = typeof mediaItems.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;

export type InsertScreen = z.infer<typeof insertScreenSchema>;
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
