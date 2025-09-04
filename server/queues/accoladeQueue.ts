import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
  host: "127.0.0.1", // or "localhost"
  port: 24325,       // mapped port from docker-compose
});

export const accoladeQueue = new Queue("accolade-queue", { connection });
