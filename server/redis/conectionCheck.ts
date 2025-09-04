import IORedis from "ioredis";

export const redis = new IORedis({
  host: "127.0.0.1",
  port: 24325,
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});
