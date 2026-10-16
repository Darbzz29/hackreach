const mongoose = require("mongoose");
const College = require("../models/College");

const demo = { phone: /^9000\d{6}$/, email: /^coordinator\d+@example\.com$/ };

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/HackReach");
  const count = await College.countDocuments(demo);
  if (process.argv.includes("--yes")) {
    const r = await College.updateMany(demo, { $set: { coordinatorName: "", phone: "", email: "" } });
    console.log("Cleared demo contact details for", r.modifiedCount, "colleges");
  } else {
    console.log(count, "colleges still have demo details. Run with --yes to clear them.");
  }
  await mongoose.disconnect();
})();
