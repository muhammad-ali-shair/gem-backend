import IORedis from "ioredis";

export const redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:24325");

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});
