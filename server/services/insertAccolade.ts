import {
  accoladeProgress, 
  accoladeRecords,
  accolades,
  gemAccolades,
  insertAccoladeSchema,
  referrals,
  User,
  users,
} from "@shared/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "server/db";
import { storage } from "server/storage";
import { handleSerialCreator } from "./singleAccolads/handleSerialCreator";
import { handleStreakAccolade } from "./singleAccolads/handleStreakAccolade";

// case "genesis_member": {
//   // Check if user is among first 10
//   const users = await db.select().from(User).limit(10);
//   const isGenesis = users.some(u => u.id === userId);

//   if (!isGenesis) return { error: "User not in top 10" };

//   const accoladeData = {
//       userId,
//       accoladeType: accoladeDef.symbol,
//       level: accoladeDef.level,
//       points: accoladeDef.pointsBonus,
//       multiplier: accoladeDef.pointsBonus ?? 1,
//   };
//   return await storage.createAccolade(accoladeData);
//   }
//   break;

// --- helpers ---
// async function updateProgress(userId: number, accoladeId: number, progress: number) {
//   return await storage.updateAccoladeProgress({
//     userId,
//     accoladeId,
//     progress,
//   });
// }

// --- main logic ---
export const insertAccolade = async (
  user: User,
  symbol: string,
  Current_progress: number = 0
) => {
  const userId = user.id;
  console.log({userId})
  // 1. Fetch accolade definition
  const [accoladeDef] = await db
    .select()
    .from(gemAccolades)
    .where(eq(gemAccolades.symbol, symbol));

  if (!accoladeDef) {
    return { error: "Accolade not found" };
  }

  // Check progress for this accolade
  const [progress] = await db
    .select()
    .from(accoladeProgress)
    .where(
      and(
        eq(accoladeProgress.userId, userId),
        eq(accoladeProgress.accoladeId, accoladeDef.id)
      )
    );

  const accoladeId = accoladeDef.id;

  switch (symbol) {
    case "token_creator": {
      if (!progress?.completed) {
        await storage.updateAccoladeProgress({
          userId,
          accoladeId: accoladeDef.id,
          progress: 1,
          target: 1,
          completed: true,
        });

        await storage.createAccolade({
          userId,
          accoladeType: accoladeDef.symbol,
          level: accoladeDef.level,
          multiplier: accoladeDef.pointsBonus ?? 1,
        });
      }

      // 🎯 Always update serial_creator too
      await handleSerialCreator(userId);

      return { message: "Accolade(s) updated" };
    }

     
    case "first_funding": {
      if (progress?.completed) {
        return { message: "First Funder already unlocked", progress };
      }

      // Mark as completed on first deposit trigger
      await storage.updateAccoladeProgress({
        userId,
        accoladeId: accoladeDef.id,
        progress: 1,
        target: 1,
        completed: true,
      });

      // Award accolade
      return await storage.createAccolade({
        userId,
        accoladeType: accoladeDef.symbol,
        level: accoladeDef.level,
        multiplier: accoladeDef.pointsBonus ?? 1,
      });
    }

    case "presale_participant":
    case "launch_master": {
      if (progress?.completed) {
        return { message: `${symbol} already unlocked`, progress };
      }

      // Mark as completed on first deposit trigger on launch_master and presale_participant
      await storage.updateAccoladeProgress({
        userId,
        accoladeId: accoladeDef.id,
        progress: 1,
        target: 1,
        completed: true,
      });

      // Award accolade
      return await storage.createAccolade({
        userId,
        accoladeType: accoladeDef.symbol,
        level: accoladeDef.level,
        multiplier: accoladeDef.pointsBonus ?? 1,
      });
    }

    case "daily_visitor": {
      return handleStreakAccolade({
        userId,
        accoladeDef,
        progress,
        target: 7,
        label: "Daily Visitor",
      });
    }

    case "platform_devotee": {
      return handleStreakAccolade({
        userId,
        accoladeDef,
        progress,
        target: 100,
        label: "Platform Devotee",
      });
    }


    case "funding_veteran": {
      // Check progress first

      if (progress?.completed) {
        return { message: "Already unlocked", progress: progress.progress };
      }

      const totalFunded = Number(Current_progress ?? 0);

      // Get current global record
      const [record] = await db
        .select()
        .from(accoladeRecords)
        .where(eq(accoladeRecords.recordType, "highest_funding_stable"))
        .limit(1);

      const currentRecord = record ? Number(record.value) : 0;

      // If user beats the record
      if (totalFunded > currentRecord) {
        // Update global record
        await upsertAccoladeRecord({
          accoladeId: progress.id,
          recordType: "highest_funding_stable",
          value: totalFunded,
        });

        // Mark progress completed
        await storage.updateAccoladeProgress({
          userId,
          accoladeId: accoladeDef.id,
          progress: totalFunded,
          target: totalFunded, // target = current top
          completed: true,
        });

        // Award accolade
        return await storage.createAccolade({
          userId,
          accoladeType: accoladeDef.symbol,
          level: accoladeDef.level,
          multiplier: accoladeDef.pointsBonus ?? 1,
        });
      }

      // If user didn’t beat the record → update progress only
      await storage.updateAccoladeProgress({
        userId,
        accoladeId: accoladeDef.id,
        progress: totalFunded,
        target: currentRecord,
        completed: false,
      });

      return {
        message: "Not top funder yet",
        progress: totalFunded,
        target: currentRecord,
      };
    }

    case "serial_creator": {
      // Fetch current progress
      if (progress?.completed) {
        return { message: "Already unlocked", progress: progress.progress };
      }

      const newProgress = Current_progress;

      // Update progress
      await storage.updateAccoladeProgress({
        userId,
        accoladeId: accoladeDef.id,
        progress: newProgress,
        target: 5,
        completed: newProgress >= 5,
      });

      // If threshold reached → award accolade
      if (newProgress >= 5 && !progress?.completed) {
        return await storage.createAccolade({
          userId,
          accoladeType: accoladeDef.symbol,
          level: accoladeDef.level,
          multiplier: accoladeDef.pointsBonus ?? 1,
        });
      }

      return {
        message: "Keep creating tokens",
        progress: newProgress,
        target: 5,
      };
    }

    case "consistent_user": { 
       return handleStreakAccolade({
        userId,
        accoladeDef,
        progress,
        target: 30,
        label: "Consistent User",
      });
    }

    case "influencer": { 

      if (progress?.completed) { 
        return { message: "Already unlocked", progress: progress.progress };
      }


      const newProgress = (progress?.progress ?? 0) + 1; // each referral = +1

      // Update progress
      await storage.updateAccoladeProgress({
        userId,
        accoladeId: accoladeDef.id,
        progress: newProgress,
        target: 20,
        completed: newProgress >= 20,
      });

      // If threshold reached → award accolade
      if (newProgress >= 20 && !progress?.completed) { 
        return await storage.createAccolade({
          userId,
          accoladeType: accoladeDef.symbol,
          level: accoladeDef.level,
          multiplier: accoladeDef.pointsBonus ?? 1,
        });
      }

      return {
        message: "Keep referring friends!",
        progress: newProgress,
        target: 20,
      };
    }

    // case "referrer": {
    //   // Get count of paid referrals from DB
    //   const { count } = await db
    //     .select({ count: sql<number>`COUNT(*)` })
    //     .from(referrals)
    //     .innerJoin(users, eq(referrals.referrerId, users.id))
    //     .where(and(eq(referrals.referrerId, userId), eq(users.isPaidUser, true)))
    //     .then(rows => rows[0]);

    //   const newProgress = count ?? 0; // number of successful referrals
    //   const target = 5;

    //   // Update progress in storage
    //   await storage.updateAccoladeProgress({
    //     userId,
    //     accoladeId: accoladeDef.id,
    //     progress: newProgress,
    //     target,
    //     completed: newProgress >= target,
    //   });

    //   // If threshold reached → award accolade
    //   if (newProgress >= target && !progress?.completed) {
    //     return await storage.createAccolade({
    //       userId,
    //       accoladeType: accoladeDef.symbol,
    //       level: accoladeDef.level,
    //       multiplier: accoladeDef.pointsBonus ?? 1,
    //     });
    //   }

    //   return {
    //     message:
    //       newProgress >= target
    //         ? "Accolade unlocked!"
    //         : "Keep referring friends who invest in Gemlaunch projects!",
    //     progress: newProgress,
    //     target,
    //   };
    // }

    case "referrer": {
      // Step 1: Find the referrer of this user (if any)
      const [refRecord] = await db
        .select({ referrerId: referrals.referrerId })
        .from(referrals)
        .where(eq(referrals.refereeId, userId)); // userId is referee here

      if (!refRecord) {
        return {
          message: "You don't have a referrer linked.",
          progress: 0,
          target: 5,
        };
      }

      const referrerId = refRecord.referrerId;

      // Step 2: Count how many paid users this referrer has
      const { count } = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(referrals)
        .innerJoin(users, eq(referrals.refereeId, users.id))
        .where(and(eq(referrals.referrerId, referrerId), eq(users.isPaidUser, true)))
        .then(rows => rows[0]);

      const newProgress = count ?? 0;
      const target = 5;

      // Step 3: Update progress for the REFERRER, not the referee
      await storage.updateAccoladeProgress({
        userId: referrerId,              
        accoladeId: accoladeDef.id,
        progress: newProgress,
        target,
        completed: newProgress >= target,
      });

      // Step 4: Award accolade if completed
      if (newProgress >= target && !progress?.completed) {
        return await storage.createAccolade({
          userId: referrerId,            
          accoladeType: accoladeDef.symbol,
          level: accoladeDef.level,
          multiplier: accoladeDef.pointsBonus ?? 1,
        });
      }

      return {
        message:
          newProgress >= target
            ? "Accolade unlocked for your referrer!"
            : "Keep referring friends who invest in Gemlaunch projects!",
        progress: newProgress,
        target,
      };
    }



    default:
      return { error: "No logic implemented for this accolade" };
  }
};
export const insertAccoladeInAccolade = async (
  user: User,
  symbol: string,
  Current_progress: number = 0
) => {
  const userId = user.id;

  // 1. Get accolade definition
  const [accoladeDef] = await db
    .select()
    .from(gemAccolades)
    .where(eq(gemAccolades.symbol, symbol));

  if (!accoladeDef) {
    return { error: "Accolade not found" };
  }
  console.log({accoladeDef})
  // 2. Check if user already has it
  const [existing] = await db
    .select()
    .from(accolades)
    .where(
      and(
        eq(accolades.userId, userId),
        eq(accolades.accoladeType, accoladeDef.symbol)
      )
    );

  if (existing) {
    return { message: "Already unlocked", accolade: existing };
  }

  // 3. Insert new accolade
  const [newAccolade] = await db
  .insert(accolades)
  .values({
    userId,
    accoladeType: accoladeDef.symbol,
    level: accoladeDef.level,
    multiplier: accoladeDef.pointsBonus ?? 1,
    unlockedAt: new Date().toISOString(), 
    points: accoladeDef.pointsBonus ?? 0
  })
  .returning();

  // updating the users total_Points
  await storage.updateUserPoints(user.id , accoladeDef.pointsBonus ?? 0);
  console.log({newAccolade});
  return { message: "Accolade created", accolade: newAccolade };
};
async function grantAccolade(
  userId: number,
  accoladeDef: typeof gemAccolades.$inferSelect
) {
  const accoladeData = {
    userId,
    accoladeType: accoladeDef.symbol,
    level: accoladeDef.level,
    multiplier: accoladeDef.pointsBonus ?? 1,
    unlockedAt: new Date().toISOString(),
  };
  return await storage.createAccolade(accoladeData);
}

async function upsertAccoladeRecord({
  accoladeId,
  recordType,
  value,
}: {
  accoladeId: number;
  recordType: string;
  value: number;
}) {
  const existing = await db
    .select()
    .from(accoladeRecords)
    .where(eq(accoladeRecords.recordType, recordType));

  if (existing.length > 0) {
    // Update existing record
    return await db
      .update(accoladeRecords)
      .set({
        value: String(value),
        updatedAt: new Date(),
      })
      .where(eq(accoladeRecords.recordType, recordType))
      .returning();
  } else {
    // Create new record
    return await db
      .insert(accoladeRecords)
      .values({
        // accoladeId,
        recordType,
        value: String(value),
      })
      .returning();
  }
}
