import { 
  users, 
  activities, 
  referrals, 
  accolades, 
  pointConfigs, 
  blockchainEvents,
  userWallets,
  gemAccolades,
  type User, 
  type InsertUser,
  type Activity,
  type InsertActivity,
  type Referral,
  type InsertReferral,
  type Accolade,
  type InsertAccolade,
  type PointConfig,
  type InsertPointConfig,
  type BlockchainEvent,
  type InsertBlockchainEvent,
  type UserWallet,
  type InsertUserWallet,
  accoladeProgress,
  gemAccolades,
  GemAccolades
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, sum, count, and, inArray, or } from "drizzle-orm";
import { ACCOLADES } from "@shared/accolades";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  getUserByReferralCode(ref: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: number, points: number): Promise<void>;
  updateUserProfile(walletAddress: string, profileData: Partial<User>): Promise<User>;
  
  // User wallet operations
  getUserWallets(userId: number): Promise<UserWallet[]>;
  addUserWallet(wallet: InsertUserWallet): Promise<UserWallet>;
  removeUserWallet(walletId: number): Promise<void>;
  
  // Leaderboard operations
  getLeaderboard(limit?: number): Promise<Array<User & { rank: number }>>;
  getUserRank(userId: number): Promise<number>;
  
  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getUserActivities(userId: number, limit?: number): Promise<Activity[]>;
  getRecentActivities(limit?: number): Promise<Array<Activity & { user: User }>>;
  
  // Referral operations
  createReferral(referral: InsertReferral): Promise<Referral>;
  getUserReferrals(userId: number): Promise<Array<Referral & { referee: User }>>;
  getReferralStats(userId: number): Promise<{ count: number; totalPoints: number }>;
  getReferralLeaderboard(limit?: number): Promise<Array<{ user: User; qualifiedReferrals: number; totalReferralPoints: number; rank: number }>>;
  
  // Accolade operations
  getUserAccolades(userId: number): Promise<Accolade[]>;
  createAccolade(accolade: InsertAccolade): Promise<Accolade>;
  
  // Point config operations
  getPointConfigs(): Promise<PointConfig[]>;
  updatePointConfig(activityType: string, basePoints: number): Promise<void>;
  
  // Blockchain operations
  createBlockchainEvent(event: InsertBlockchainEvent): Promise<BlockchainEvent>;
  getUnprocessedEvents(): Promise<BlockchainEvent[]>;
  markEventProcessed(eventId: number): Promise<void>;
  
  // Admin operations
  deleteUser(userId: number): Promise<void>;
  getAllAccolades(): Promise<Array<Accolade & { user: User }>>;
  resetPioneerAccolades(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async getUserByReferralCode(ref: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(or(eq(users.customReferralCode, ref), eq(users.referralCode, ref)));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        referralCode: this.generateReferralCode(),
      })
      .returning();
    return user;
  }

  async updateUserPoints(userId: number, points: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        totalPoints: sql`${users.totalPoints} + ${points}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getLeaderboard(limit = 100): Promise<Array<User & { rank: number; accolades: Accolade[] }>> {
    // Get all users with their wallet information
    const usersWithWallets = await db
      .select({
        id: users.id,
        walletAddress: users.walletAddress,
        username: users.username,
        displayName: users.displayName,
        totalPoints: users.totalPoints,
        referralCode: users.referralCode,
        customReferralCode: users.customReferralCode,
        bio: users.bio,
        websiteUrl: users.websiteUrl,
        twitterHandle: users.twitterHandle,
        discordHandle: users.discordHandle,
        telegramHandle: users.telegramHandle,
        avatar: users.avatar,
        referredBy: users.referredBy,
        isInfluencer: users.isInfluencer,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        isMainAccount: users.isMainAccount,
        parentUserId: users.parentUserId
      }) 
      .from(users);

    // Filter to only main accounts and consolidate points from connected wallets
    const mainAccounts = usersWithWallets.filter(user => user.isMainAccount);
    const consolidatedUsers = mainAccounts.map(mainAccount => {
      // Find all connected wallets for this main account
      const connectedWallets = usersWithWallets.filter(user => 
        user.parentUserId === mainAccount.id
      );
      
      // Sum points from main account and all connected wallets
      const totalConsolidatedPoints = mainAccount.totalPoints + 
        connectedWallets.reduce((sum, wallet) => sum + wallet.totalPoints, 0);
      
      return {
        ...mainAccount,
        totalPoints: totalConsolidatedPoints
      };
    });

    // Sort by consolidated points and add rank
    const rankedUsers = consolidatedUsers
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit)
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }));
    
    // Get all accolades for these users and their connected wallets
    let userAccolades: Accolade[] = [];
    
    if (rankedUsers.length > 0) {
      const allUserIds = rankedUsers.flatMap(user => {
        const connectedWallets = usersWithWallets.filter(u => u.parentUserId === user.id);
        return [user.id, ...connectedWallets.map(w => w.id)];
      });
      
      userAccolades = await db
        .select()
        .from(accolades)
        .where(inArray(accolades.userId, allUserIds));
    }
    
    // Group accolades by main user ID (consolidate accolades from connected wallets)
    const accoladesByUser: Record<number, Accolade[]> = {};
    userAccolades.forEach(accolade => {
      // Find the main account for this accolade
      const walletUser = usersWithWallets.find(u => u.id === accolade.userId);
      const mainAccountId = walletUser?.parentUserId || walletUser?.id;
      
      if (mainAccountId) {
        if (!accoladesByUser[mainAccountId]) {
          accoladesByUser[mainAccountId] = [];
        }
        accoladesByUser[mainAccountId].push(accolade);
      }
    });
    
    // Combine users with their consolidated accolades
    return rankedUsers.map(user => ({
      ...user,
      accolades: accoladesByUser[user.id] || []
    }));
  }

  async getUserRank(userId: number): Promise<number> {
    // Get user's points
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user[0]) return 0;
    
    // Count users with more points
    const higherRanked = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.totalPoints} > ${user[0].totalPoints}`);
    
    return higherRanked[0].count + 1;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values({
        userId: activity.userId,
        activityType: activity.activityType,
        points: activity.points,
        transactionHash: activity.transactionHash || null,
        blockNumber: activity.blockNumber || null,
        metadata: activity.metadata || null
      })
      .returning();
    
    // Update user points
    await this.updateUserPoints(activity.userId, activity.points);
    
    return newActivity;
  }

   async hasTwentyAccolades(userId: number): Promise<boolean> {
    const result = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${accolades.accoladeType})`
      })
      .from(accolades)
      .where(eq(accolades.userId, userId));
  
    const count = result[0]?.count ?? 0;
    return count >= 20;
  }


  async checkAccolade(userId: number, accoladeName: string): Promise<boolean> {
    const result = await db
      .select()
      .from(accolades)
      .where(
        and(
          eq(accolades.userId, userId),
          eq(accolades.accoladeType, accoladeName)
        )
      )
      .limit(1);
  
    return result.length > 0;
  }

  async getUserActivities(userId: number, limit = 50): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async getRecentActivities(limit = 20): Promise<Array<Activity & { user: User }>> {
    const rows = await db
      .select({
        id: activities.id,
        userId: activities.userId,
        activityType: activities.activityType,
        points: activities.points,
        transactionHash: activities.transactionHash,
        blockNumber: activities.blockNumber,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
        // updatedAt: activities.updatedAt,
        user_id: users.id,
        user_walletAddress: users.walletAddress,
        user_username: users.username,
        user_displayName: users.displayName,
        user_totalPoints: users.totalPoints,
        user_referralCode: users.referralCode,
        user_customReferralCode: users.customReferralCode,
        user_bio: users.bio,
        user_websiteUrl: users.websiteUrl,
        user_twitterHandle: users.twitterHandle,
        user_discordHandle: users.discordHandle,
        user_telegramHandle: users.telegramHandle,
        user_avatar: users.avatar,
        user_referredBy: users.referredBy,
        user_isInfluencer: users.isInfluencer,
        user_createdAt: users.createdAt,
        user_updatedAt: users.updatedAt,
        user_isMainAccount: users.isMainAccount,
        user_parentUserId: users.parentUserId
      })
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      activityType: row.activityType,
      points: row.points,
      transactionHash: row.transactionHash,
      blockNumber: row.blockNumber,
      metadata: row.metadata,
      createdAt: row.createdAt,
      // updatedAt: row.updatedAt,
      user: {
        id: row.user_id,
        walletAddress: row.user_walletAddress,
        username: row.user_username,
        displayName: row.user_displayName,
        totalPoints: row.user_totalPoints,
        referralCode: row.user_referralCode,
        customReferralCode: row.user_customReferralCode,
        bio: row.user_bio,
        websiteUrl: row.user_websiteUrl,
        twitterHandle: row.user_twitterHandle,
        discordHandle: row.user_discordHandle,
        telegramHandle: row.user_telegramHandle,
        avatar: row.user_avatar,
        referredBy: row.user_referredBy,
        isInfluencer: row.user_isInfluencer,
        createdAt: row.user_createdAt,
        updatedAt: row.user_updatedAt,
        isMainAccount: row.user_isMainAccount,
        parentUserId: row.user_parentUserId
      }
    }));
  }

  //  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  //   referrerId: integer("referrer_id").notNull(),
  //   refereeId: integer("referee_id").notNull(),
  //   pointsEarned: integer("points_earned").default(0).notNull(),
  //   isQualified: boolean("is_qualified").default(false).notNull(), // Must invest $20+ or create token/presale
  //   qualificationAmount: real("qualification_amount").default(0.00).notNull(), // Investment amount for qualification
  //   createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),

  async createReferral(referral: InsertReferral): Promise<Referral> { 
    const [newReferral] = await db
      .insert(referrals)
      .values(referral)
      .returning();
    
    // Award referral points to referrer
    await this.updateUserPoints(referral.referrerId, 500);
    
    return newReferral;
  }

  async getUserReferrals(
  userId: number
    ): Promise<Array<Referral & { referee: User }>> {
  const result = await db
    .select({
      id: referrals.id,
      referrerId: referrals.referrerId,
      refereeId: referrals.refereeId,
      pointsEarned: referrals.pointsEarned,
      isQualified: referrals.isQualified, 
      qualificationAmount: referrals.qualificationAmount,
      createdAt: referrals.createdAt,
      referee_id: users.id,
      referee_walletAddress: users.walletAddress,
      referee_username: users.username,
      referee_totalPoints: users.totalPoints,
      referee_displayName: users.displayName,
      referee_avatar: users.avatar,
      referee_bio: users.bio,
      referee_twitterHandle: users.twitterHandle,
      referee_discordHandle: users.discordHandle,
      referee_telegramHandle: users.telegramHandle,
      referee_websiteUrl: users.websiteUrl,
      referee_referralCode: users.referralCode,
      referee_customReferralCode: users.customReferralCode,
      referee_referredBy: users.referredBy,
      referee_isInfluencer: users.isInfluencer,
      referee_createdAt: users.createdAt,
      referee_updatedAt: users.updatedAt,
      referee_isMainAccount: users.isMainAccount,
      referee_parentUserId: users.parentUserId
    })
    .from(referrals)
    .innerJoin(users, eq(referrals.refereeId, users.id))
    .where(eq(referrals.referrerId, userId))
    .orderBy(desc(referrals.createdAt));

  return result.map((row) => ({
    id: row.id,
    referrerId: row.referrerId,
    refereeId: row.refereeId,
    pointsEarned: row.pointsEarned,
    isQualified: row.isQualified,
    qualificationAmount: row.qualificationAmount,
    createdAt: row.createdAt,
    referee: {
      id: row.referee_id,
      walletAddress: row.referee_walletAddress,
      username: row.referee_username,
      totalPoints: row.referee_totalPoints,
      displayName: row.referee_displayName,
      avatar: row.referee_avatar,
      bio: row.referee_bio,
      twitterHandle: row.referee_twitterHandle,
      discordHandle: row.referee_discordHandle,
      telegramHandle: row.referee_telegramHandle,
      websiteUrl: row.referee_websiteUrl,
      referralCode: row.referee_referralCode,
      customReferralCode: row.referee_customReferralCode,
      referredBy: row.referee_referredBy,
      isInfluencer: row.referee_isInfluencer,
      createdAt: row.referee_createdAt,
      updatedAt: row.referee_updatedAt,
      isMainAccount: row.referee_isMainAccount,
      parentUserId: row.referee_parentUserId
    },
  }));
  }

  async getReferralStats(userId: number): Promise<{ count: number; totalPoints: number }> {
    // const { sqlite } = await import('./db');
     const result = await db
    .select({
      count: sql<number>`COUNT(*)`,
      totalPoints: sql<number>`COALESCE(SUM(${referrals.pointsEarned}), 0)`,
    })
    .from(referrals)
    .where(eq(referrals.referrerId, userId));
    
    return result[0] ?? { count: 0, totalPoints: 0 };
  }

  async getUserAccolades(userId: number): Promise<Accolade[]> {
    return await db
      .select()
      .from(accolades)
      .where(eq(accolades.userId, userId));
  }

  async createAccolade(accolade: InsertAccolade): Promise<Accolade> {
    const [newAccolade] = await db
      .insert(accolades)
      .values(accolade)
      .returning();
    return newAccolade;
  }

  async getPointConfigs(): Promise<PointConfig[]> {
    return await db
      .select()
      .from(pointConfigs)
      .where(eq(pointConfigs.isActive, true));
  }

  async getGemAccolades(): Promise<GemAccolades[]> {
    return await db
      .select()
      .from(gemAccolades);
      // .where(eq(gemAccolades.isActive, true));
  }

  async updatePointConfig(activityType: string, basePoints: number): Promise<void> {
    await db
      .update(pointConfigs)
      .set({ 
        basePoints,
        updatedAt: new Date()
      })
      .where(eq(pointConfigs.activityType, activityType));
  }

  async updateGemAccolades(activityType: string, pointsBonus: number): Promise<void> {
    await db
      .update(gemAccolades)
      .set({ 
        pointsBonus
      })
      .where(eq(gemAccolades.symbol, activityType));
  }
  

  async getReferralLeaderboard(limit = 100): Promise<Array<{ user: User; qualifiedReferrals: number; totalReferralPoints: number; rank: number }>> {
   const result = await db
    .select({
      referrerId: referrals.referrerId,
      qualifiedReferrals: sql<number>`COUNT(*)`,
      totalReferralPoints: sql<number>`SUM(${referrals.pointsEarned})`,
      id: users.id,
      walletAddress: users.walletAddress,
      username: users.username,
      totalPoints: users.totalPoints,
      referralCode: users.referralCode,
      displayName: users.displayName,
      avatar: users.avatar,
      bio: users.bio,
      twitterHandle: users.twitterHandle,
      telegramHandle: users.telegramHandle,
      discordHandle: users.discordHandle,
      websiteUrl: users.websiteUrl,
      customReferralCode: users.customReferralCode,
      referredBy: users.referredBy,
      isInfluencer: users.isInfluencer,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      isMainAccount: users.isMainAccount,
      parentUserId: users.parentUserId
    })
    .from(referrals)
    .innerJoin(users, eq(referrals.referrerId, users.id))
    .where(eq(referrals.isQualified, true))
    .groupBy(
      referrals.referrerId,
      users.id,
      users.walletAddress,
      users.username,
      users.totalPoints,
      users.referralCode,
      users.displayName,
      users.avatar,
      users.bio,
      users.twitterHandle,
      users.telegramHandle,
      users.discordHandle,
      users.websiteUrl,
      users.customReferralCode,
      users.referredBy,
      users.isInfluencer,
      users.createdAt,
      users.updatedAt,
      users.isMainAccount,
      users.parentUserId
    )
    .orderBy(
      desc(sql`COUNT(*)`),
      desc(sql`SUM(${referrals.pointsEarned})`)
    )
    .limit(limit);

  return result.map((row, index) => ({
    user: {
      id: row.id,
      walletAddress: row.walletAddress,
      username: row.username,
      totalPoints: row.totalPoints,
      referralCode: row.referralCode,
      displayName: row.displayName,
      avatar: row.avatar,
      bio: row.bio,
      twitterHandle: row.twitterHandle,
      telegramHandle: row.telegramHandle,
      discordHandle: row.discordHandle,
      websiteUrl: row.websiteUrl,
      customReferralCode: row.customReferralCode,
      referredBy: row.referredBy,
      isInfluencer: row.isInfluencer,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isMainAccount: row.isMainAccount,
      parentUserId: row.parentUserId
    },
    qualifiedReferrals: row.qualifiedReferrals,
    totalReferralPoints: Number(row.totalReferralPoints) || 0,
    rank: index + 1,
  }));
  }

  async createBlockchainEvent(event: InsertBlockchainEvent): Promise<BlockchainEvent> {
    const [newEvent] = await db
      .insert(blockchainEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async getUnprocessedEvents(): Promise<BlockchainEvent[]> {
    return await db
      .select()
      .from(blockchainEvents)
      .where(eq(blockchainEvents.processed, false))
      .orderBy(blockchainEvents.blockNumber);
  }

  async markEventProcessed(eventId: number): Promise<void> {
    await db
      .update(blockchainEvents)
      .set({ processed: true })
      .where(eq(blockchainEvents.id, eventId));
  }

  async updateUserProfile(walletAddress: string, profileData: Partial<User>): Promise<User> {
    console.log('first', walletAddress,
profileData)
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        // updatedAt: new Date(),
      })
      .where(eq(users.walletAddress, walletAddress))
      .returning();
    return user;
  }

  async getUserWallets(userId: number): Promise<UserWallet[]> {
    return await db
      .select()
      .from(userWallets)
      .where(eq(userWallets.userId, userId));
  }

  async addUserWallet(wallet: InsertUserWallet): Promise<UserWallet> {
    const [newWallet] = await db
      .insert(userWallets)
      .values(wallet)
      .returning();
    return newWallet;
  }

  async removeUserWallet(walletId: number): Promise<void> {
    await db
      .delete(userWallets)
      .where(eq(userWallets.id, walletId));
  }

  private generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  async deleteUser(userId: number): Promise<void> {
    // Delete related records first
    await db.delete(accolades).where(eq(accolades.userId, userId));
    await db.delete(activities).where(eq(activities.userId, userId));
    await db.delete(referrals).where(eq(referrals.referrerId, userId));
    await db.delete(referrals).where(eq(referrals.refereeId, userId));
    await db.delete(userWallets).where(eq(userWallets.userId, userId));
    
    // Delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  async getAllAccolades(): Promise<Array<any>> {
    const result = await db
      .select({
        accolade: accolades,
        user: users
      })
      .from(accolades)
      .innerJoin(users, eq(accolades.userId, users.id))
      .orderBy(users.createdAt);
    
    return result.map(r => ({
      ...r.accolade,
      user: r.user
    }));
  }
  async getAllAccoladesWithoutUser(): Promise<Array<any>> {
    return await db
      .select()
      .from(gemAccolades);
  }

  async resetPioneerAccolades(): Promise<void> {
    // Delete pioneer accolades manually
    await db.delete(accolades).where(eq(accolades.accoladeType, 'genesis_member'));
    await db.delete(accolades).where(eq(accolades.accoladeType, 'gemlaunch_pioneer'));
    await db.delete(accolades).where(eq(accolades.accoladeType, 'early_adopter'));

    // Get all users sorted by creation date
    const allUsers = await db.select().from(users).orderBy(users.createdAt);

    // Award pioneer accolades based on actual join order
    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      const joinOrder = i + 1;

      // Genesis Member (first 10 users)
      if (joinOrder <= 10) {
        await this.createAccolade({
          userId: user.id,
          accoladeType: 'genesis_member',
          // name: 'Genesis Member'
        });
      }

      // Gemlaunch Pioneer (first 50 users)
      if (joinOrder <= 50) {
        await this.createAccolade({
          userId: user.id,
          accoladeType: 'gemlaunch_pioneer',
          // name: 'Gemlaunch Pioneer'
        });
      }

      // Early Adopter (first 1000 users)
      if (joinOrder <= 1000) {
        await this.createAccolade({
          userId: user.id,
          accoladeType: 'early_adopter',
          // name: 'Early Adopter'
        });
      }
    }

    // Recalculate points for all users
    for (const user of allUsers) {
      const userAccolades = await this.getUserAccolades(user.id);
      const accoladeBonus = userAccolades.reduce((total, accolade) => {
        const def = ACCOLADES.find(a => a.symbol === accolade.accoladeType);
        return total + (def?.pointsBonus || 0);
      }, 0);

      // Get base points from activities
      const userActivities = await this.getUserActivities(user.id);
      const basePoints = userActivities.reduce((total, activity) => total + activity.points, 0);

      const totalPoints = basePoints + accoladeBonus;
      
      await db.update(users)
        .set({ totalPoints })
        .where(eq(users.id, user.id));
    }
  }

  async grantAccolade (userId: number, accoladeDef: any) {
  return await storage.createAccolade({
    userId,
    accoladeType: accoladeDef.symbol,
    level: accoladeDef.level,
    multiplier: accoladeDef.pointsBonus ?? 1,
  });
};

async updateAccoladeProgress({
  userId,
  accoladeId,
  progress,
  target,
  completed = false,
}: {
  userId: number;
  accoladeId: number;
  progress: number;
  target: number;
  completed: boolean;
}) {
  // Check if progress exists
  const [existing] = await db
    .select()
    .from(accoladeProgress)
    .where(
      and(
        eq(accoladeProgress.userId, userId),
        eq(accoladeProgress.accoladeId, accoladeId)
      )
    );

  if (existing) {
    // Only update if progress increased
    if (progress > existing.progress) {
      await db
        .update(accoladeProgress)
        .set({ progress , completed })
        .where(eq(accoladeProgress.id, existing.id));
    }
    return { updated: true, progress: Math.max(progress, existing.progress), target };
  }

  // Insert new row
  await db.insert(accoladeProgress).values({
    userId,
    accoladeId,
    progress,
    target,
    completed,
  });

  return { created: true, progress, target };
};


  
}

export const storage = new DatabaseStorage();
