import { Worker } from "bullmq";
import IORedis from "ioredis";
import { fork } from "child_process";
import path from "path";

const connection = new IORedis({
  host: "127.0.0.1", // or "localhost"
  port: 24325,       // mapped port from docker-compose
});

// const redis = new IORedis({
//   host: "127.0.0.1",
//   port: 24325,
// });

const worker = new Worker(
  "accolade-queue",
  async (job) => {
   const { user, accolade } = job.data;
    console.log("Worker got job:", job.name, job.data);



    return new Promise((resolve, reject) => {
      const child = fork(path.join(__dirname, "insertAccoladeProcess.js")); 
      // 👆 notice `.js`, because ts-node will transpile

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

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err);
});
