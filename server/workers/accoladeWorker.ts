import { Worker } from "bullmq";
import IORedis from "ioredis";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:24325", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const worker = new Worker(
  "accolade-queue",
  async (job) => {
    console.log("Worker got job:", job.name, job.data);

    const { user, accolade } = job.data;

    return new Promise((resolve, reject) => {
      const child = fork(path.join(__dirname, "insertAccoladeProcess.js"));

      child.send({ user, accolade });

      child.on("message", (msg: any) => {
        if (msg.success) resolve(msg);
        else reject(new Error(msg.error));
        child.kill();
      });

      child.on("error", reject);
    });
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed:`, job.returnvalue);
});

worker.on("failed", (job:any, err) => {
  console.error(`❌ Job ${job.id} failed:`, err);
});

worker.on("error", (err) => {
  console.error("Worker connection error:", err);
});
