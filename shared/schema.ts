// import { pgTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { pgTable, text, integer, real, boolean, timestamp, uniqueIndex, numeric } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { serial, varchar } from "drizzle-orm/mysql-core";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  walletAddress: text("wallet_address").notNull().unique(),
  username: text("username"),
  displayName: text("display_name"),
  avatar: text("avatar"), // Base64 compressed image or URL
  bio: text("bio"),
  twitterHandle: text("twitter_handle"),
  telegramHandle: text("telegram_handle"),
  discordHandle: text("discord_handle"),
  websiteUrl: text("website_url"),
  customReferralCode: text("custom_referral_code").unique(),
  totalPoints: integer("total_points").default(0).notNull(),
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by"),
  isInfluencer: boolean("is_influencer").default(false).notNull(),
  isMainAccount: boolean("is_main_account").default(true).notNull(),
  parentUserId: integer("parent_user_id"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export const activities = pgTable("activities", {  
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  activityType: text("activity_type").notNull(), // 'token_creation', 'fair_launch', 'presale', 'dutch_auction', 'volume_contribution', 'referral', 'social_mention', 'social_share'
  points: integer("points").notNull(),
  transactionHash: text("transaction_hash"),
  blockNumber: integer("block_number"),
  metadata: text("metadata"), // JSON string for additional activity-specific data
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  referrerId: integer("referrer_id").notNull(),
  refereeId: integer("referee_id").notNull(),
  pointsEarned: integer("points_earned").default(0).notNull(),
  isQualified: boolean("is_qualified").default(false).notNull(), // Must invest $20+ or create token/presale
  qualificationAmount: real("qualification_amount").default(0.00).notNull(), // Investment amount for qualification
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const gemAccolades = pgTable("gem_accolades", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  category: text("category"),
  level: integer("level").default(1).notNull(),
  criteria: text("criteria"),
  pointsBonus: integer("points_bonus").default(0).notNull(),
  rarity: text("rarity"),
});

export const accoladesHistory = pgTable("accolades_history", (t) => ({
  id: t.serial("id").primaryKey(),
  accoladeType: t.varchar("accolade_type", { length: 100 }).notNull(),
  accoladeName: t.varchar("accolade_name", { length: 150 }).notNull(),
  description: t.text("description"),
  userId: t.integer("user_id").notNull(),
  points: t.integer("points").default(0),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
}));


export const accolades = pgTable("accolades", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  accoladeType: text("accolade_type").notNull(), // 'launch_pioneer', 'referral_champion', 'volume_trader'
  level: integer("level").default(1).notNull(),
  multiplier: real("multiplier").default(0.00).notNull(),
  unlockedAt: text("unlocked_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  points: integer("points").default(0),
});

export const accoladeProgress = pgTable("accolade_progress", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  userId: integer("user_id").notNull(),                  // link to users
  accoladeId: integer("accolade_id").notNull(),          // FK to gemAccolades.id

  progress: integer("progress").default(0).notNull(),    // current progress value
  target: integer("target").notNull(),                   // target needed for completion
  completed: boolean("completed").default(false).notNull(), // has the accolade been unlocked?

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserAccolade: uniqueIndex("uq_user_accolade").on(table.userId, table.accoladeId)
}));


export const pointEarningActivities = pgTable("point_earning_activities", (t) => ({
  id: t.serial("id").primaryKey(),
  type: t.varchar("type", { length: 50 }).notNull().unique(),
  title: t.varchar("title", { length: 100 }).notNull(),
  points: t.integer("points").notNull(),
  description: t.text("description").notNull(),
  icon: t.varchar("icon", { length: 50 }).notNull(),  
  color: t.varchar("color", { length: 20 }).notNull(),
  suffix: t.varchar("suffix", { length: 50 }),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
}));

export const accoladeRecords = pgTable("accolade_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  // accoladeId: integer("accolade_id")
  //   .notNull()
  //   .references(() => gemAccolades.id),

  // Example: "highest_fund_usdc", "first_10_user", "top_50_user"
  recordType: text("record_type").notNull().unique(),

  // Value of the record (amount, rank, count, etc.)
  value: numeric("value").notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});



export const pointConfigs = pgTable("point_configs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  activityType: text("activity_type").notNull().unique(),
  basePoints: integer("base_points").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export const blockchainEvents = pgTable("blockchain_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventType: text("event_type").notNull(),
  transactionHash: text("transaction_hash").notNull(),
  blockNumber: integer("block_number").notNull(),
  userAddress: text("user_address").notNull(),
  metadata: text("metadata"), // JSON string
  processed: boolean("processed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

// Multiple wallet addresses per user for project founders
export const userWallets = pgTable("user_wallets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  walletAddress: text("wallet_address").notNull().unique(),
  label: text("label"), // "Main Wallet", "Project Alpha", "DeFi Ventures", etc.
  isPrimary: boolean("is_primary").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const userPointEarningActivities = pgTable("user_point_earning_activities", (t) => ({
  id: t.serial("id").primaryKey(),
  userId: t.integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityId: t.integer("activity_id")
    .notNull()
    .references(() => pointEarningActivities.id, { onDelete: "cascade" }),
  points: t.integer("points").notNull(),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
}));
// Relations remain the same
export const usersRelations = relations(users, ({ many, one }) => ({
  activities: many(activities),
  referralsGiven: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referee" }),
  accolades: many(accolades),
  wallets: many(userWallets),
  referrer: one(users, {
    fields: [users.referredBy],
    references: [users.id],
  }),
}));

export const userWalletsRelations = relations(userWallets, ({ one }) => ({
  user: one(users, {
    fields: [userWallets.userId],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: "referrer",
  }),
  referee: one(users, {
    fields: [referrals.refereeId],
    references: [users.id],
    relationName: "referee",
  }),
}));

export const accoladesRelations = relations(accolades, ({ one }) => ({
  user: one(users, {
    fields: [accolades.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);

export const insertActivitySchema = createInsertSchema(activities);

export const insertReferralSchema = createInsertSchema(referrals);

export const insertAccoladeSchema = createInsertSchema(accolades);

export const insertPointConfigSchema = createInsertSchema(pointConfigs);

export const insertBlockchainEventSchema = createInsertSchema(blockchainEvents);

export const insertUserWalletSchema = createInsertSchema(userWallets); 

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Accolade = typeof accolades.$inferSelect;
export type InsertAccolade = z.infer<typeof insertAccoladeSchema>;
export type PointConfig = typeof pointConfigs.$inferSelect;
export type GemAccolades = typeof gemAccolades.$inferSelect;
export type InsertPointConfig = z.infer<typeof insertPointConfigSchema>;
export type BlockchainEvent = typeof blockchainEvents.$inferSelect;
export type InsertBlockchainEvent = z.infer<typeof insertBlockchainEventSchema>;
export type UserWallet = typeof userWallets.$inferSelect;
export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;

// Activity type enum for better type safety
export type ActivityType = 
  | "token_creation"
  | "fair_launch"
  | "presale_launch" 
  | "dutch_auction"
  | "project_funding"
  | "referral_bonus"
  | "welcome_bonus"
  | "sweep_widget_task"
  | "sweep_widget_preparation";