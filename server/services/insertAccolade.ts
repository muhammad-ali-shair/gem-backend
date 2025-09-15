import {
  accoladeProgress, 
  accoladeRecords,
  accolades,
  gemAccolades,
  insertAccoladeSchema,
  User,
  users,
} from "@shared/schema";
import { and, asc, eq } from "drizzle-orm";
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

    case "genesis_member":
    case "gemlaunch_pioneer":
    case "early_adopter":
    case "user_join_rank" :  {  // user_join_rank is maked by me.
      // if (progress?.completed) {  
      //   return { message: `${symbol} already unlocked`, progress };
      // }

      // Fetch global rank record
      let [record] = await db
        .select()
        .from(accoladeRecords)
        .where(eq(accoladeRecords.recordType, "user_join_rank"));

      if (!record) {
        // create if missing
        [record] = await db
          .insert(accoladeRecords)
          .values({ recordType: "user_join_rank", value: "0" })
          .returning();
      }

      const currentRank =(parseInt(record.value) + 1).toString(); // next user’s placement

      // Update global counter
      await db
        .update(accoladeRecords)
        .set({ value: currentRank, updatedAt: new Date() })
        .where(eq(accoladeRecords.id, record.id));

      // Decide what accolades this rank gets
      const unlocked: any[] = [];

      if (parseInt(currentRank) <= 10) {
        unlocked.push("genesis_member");
        unlocked.push("gemlaunch_pioneer");
        unlocked.push("early_adopter");
      } else if (parseInt(currentRank) <= 50) {
        unlocked.push("gemlaunch_pioneer");
        unlocked.push("early_adopter");
      } else if (parseInt(currentRank) <= 1000) {
        unlocked.push("early_adopter");
      }

      if (unlocked.length === 0) {
        return { message: "User not in first 1000, no accolade awarded" };
      }

      // Award accolades to user
      const results = [];
      for (const accoladeType of unlocked) {
        results.push(
          await storage.createAccolade({
            userId,
            accoladeType,
            level: 1,
            multiplier: accoladeDef.pointsBonus ?? 1,
          })
        );
      }

      return { rank: currentRank, unlocked: results };
    }


    case "launch_master":
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
      if (progress?.completed) {
        return { message: "Already unlocked", progress: progress.progress };
      }

      const today = new Date();
      const lastUpdated = progress?.updatedAt
        ? new Date(progress.updatedAt)
        : null;

      let newProgress = progress?.progress ?? 0;

      if (!lastUpdated) {
        // First ever visit → start streak
        newProgress = 1;
      } else {
        const diffDays = Math.floor(
          (today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          // Consecutive day → increase streak
          newProgress += 1;
        } else if (diffDays > 1) {
          // Missed a day → reset streak
          newProgress = 1;
        }
        // if diffDays === 0 → same day visit, don’t increment
      }

      // Update progress in DB
      await storage.updateAccoladeProgress({
        userId,
        accoladeId: accoladeDef.id,
        progress: newProgress,
        target: 30,
        completed: newProgress >= 30,
      });

      // If threshold reached → award accolade
      if (newProgress >= 30 && !progress?.completed) {
        return await storage.createAccolade({
          userId,
          accoladeType: accoladeDef.symbol,
          level: accoladeDef.level,
          multiplier: accoladeDef.pointsBonus ?? 1,
        });
      }

      return {
        message: "Keep visiting daily",
        progress: newProgress,
        target: 30,
      };
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

    default:
      return { error: "No logic implemented for this accolade" };
  }
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
