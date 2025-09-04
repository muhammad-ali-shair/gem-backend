import { accoladeProgress, gemAccolades } from "@shared/schema";
import { storage } from "server/storage";

export async function handleStreakAccolade({
  userId,
  accoladeDef,
  progress,
  target,
  label,
}: {
  userId: number;
  accoladeDef: typeof gemAccolades.$inferSelect;
  progress?: typeof accoladeProgress.$inferSelect;
  target: number;
  label: string;
}) {
  const today = new Date().toDateString(); // normalize

  if (progress?.completed) {
    return { message: `${label} accolade already unlocked` };
  }

  let newProgress = 1;
  let completed = false;

  if (progress) {
    const lastVisit = new Date(progress.updatedAt).toDateString();

    if (lastVisit === today) {
      // Already counted today
      return { progress: progress.progress, target };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastVisit === yesterday.toDateString()) {
      // Continue streak
      newProgress = progress.progress + 1;
    } else {
      // Reset streak
      newProgress = 1;
    }

    if (newProgress >= target) {
      completed = true;
    }
  }

  // Update progress
  await storage.updateAccoladeProgress({
    userId,
    accoladeId: accoladeDef.id,
    progress: newProgress,
    target,
    completed,
  });

  if (completed) {
    return await storage.createAccolade({
      userId,
      accoladeType: accoladeDef.symbol,
      level: accoladeDef.level,
      multiplier: accoladeDef.pointsBonus ?? 1,
    });
  }

  return { progress: newProgress, target };
}
