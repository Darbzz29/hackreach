const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, db: mongoose.connection.name });
});

app.use("/api/colleges", require("./routes/colleges"));

mongoose
  .connect("mongodb://127.0.0.1:27017/HackReach")
  .then(() => {
    console.log("MongoDB connected");
    app.listen(3000, () => console.log("Running at http://localhost:3000"));
  })
  .catch((err) => {
    console.error("MongoDB error:", err.message);
    process.exit(1);
  });

