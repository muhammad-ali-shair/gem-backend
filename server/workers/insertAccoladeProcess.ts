import { insertAccolade } from "../services/insertAccolade";

process.on("message", async (msg: any) => {
  try {
    const { user, accolade } = msg;
    console.log('job.name 123', user);
    await insertAccolade(user, accolade);
    if (process.send) {
      process.send({ success: true });
    }
  } catch (err: any) {
    if (process.send) {
      process.send({ success: false, error: err.message });
    }
  }
});
