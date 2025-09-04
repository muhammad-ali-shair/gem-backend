import { accoladeProgress, gemAccolades } from "@shared/schema";
import { and, eq} from "drizzle-orm";
import { db } from "server/db";
import { storage } from "server/storage";

export async function handleSerialCreator(userId: number) {
  const [serialDef] = await db
    .select()
    .from(gemAccolades)
    .where(eq(gemAccolades.symbol, "serial_creator"));

  if (!serialDef) return;

  const [progress] = await db
    .select()
    .from(accoladeProgress)
    .where( 
      and(
        eq(accoladeProgress.userId, userId),
        eq(accoladeProgress.accoladeId, serialDef.id)
      )
    );

  const newProgress = (progress?.progress ?? 0) + 1;

  // update progress
  await storage.updateAccoladeProgress({
    userId,
    accoladeId: serialDef.id,
    progress: newProgress,
    target: 5,
    completed: newProgress >= 5,
  });

  if (newProgress >= 5 && !progress?.completed) {
    await storage.createAccolade({
      userId,
      accoladeType: serialDef.symbol,
      level: serialDef.level,
      multiplier: serialDef.pointsBonus ?? 1,
    });
  }
}
