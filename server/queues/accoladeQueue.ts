import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:24325");

export const accoladeQueue = new Queue("accolade-queue", { connection });
