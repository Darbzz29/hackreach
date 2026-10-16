const express = require("express");
const mongoose = require("mongoose");
const College = require("../models/College");

const router = express.Router();

router.get("/", async (req, res) => {
  const colleges = await College.find().sort({ state: 1, name: 1 });
  res.json(colleges);
});

router.post("/", async (req, res) => {
  try {
    const college = await College.create(req.body);
    res.status(201).json(college);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: "This college already exists in that state." });
    res.status(400).json({ error: err.message });
  }
});

router.post("/import", async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const ops = rows
      .filter((r) => r.name && r.state)
      .map((r) => ({
        updateOne: {
          filter: { name: r.name.trim(), state: r.state.trim() },
          update: {
            $setOnInsert: {
              name: r.name.trim(),
              state: r.state.trim(),
              city: r.city || "",
              coordinatorName: r.coordinatorName || "",
              phone: r.phone || "",
              email: r.email || ""
            }
          },
          upsert: true
        }
      }));
    if (!ops.length) return res.status(400).json({ error: "No valid rows to import." });
    const result = await College.bulkWrite(ops);
    res.json({ added: result.upsertedCount, alreadyExisted: ops.length - result.upsertedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Call today: follow-ups due today or overdue
router.get("/call-today", async (req, res) => {
  try {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const list = await College.find({
      nextFollowUp: { $ne: null, $lte: end },
      status: { $nin: ["Registered", "Declined"] }
    }).sort({ nextFollowUp: 1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.get("/stats/by-state", async (req, res) => {
  try {
    const stats = await College.aggregate([
      {
        $group: {
          _id: "$state",
          total: { $sum: 1 },
          contacted: { $sum: { $cond: [{ $ne: ["$status", "Not contacted"] }, 1, 0] } },
          registered: { $sum: { $cond: [{ $eq: ["$status", "Registered"] }, 1, 0] } }
        }
      },
      { $sort: { total: -1, _id: 1 } }
    ]);
    res.json(stats.map((s) => ({ state: s._id, total: s.total, contacted: s.contacted, registered: s.registered })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/export.csv", async (req, res) => {
  try {
    const filter = {};
    if (req.query.state) filter.state = req.query.state;
    if (req.query.status) filter.status = req.query.status;
    const colleges = await College.find(filter).sort({ state: 1, name: 1 }).lean();
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const head = ["College", "State", "City", "Coordinator", "Phone", "Email", "Status", "Calls logged", "Last call", "Last outcome"];
    const lines = colleges.map((c) => {
      const calls = c.calls || [];
      const last = calls.length ? calls[calls.length - 1] : null;
      return [c.name, c.state, c.city, c.coordinatorName, c.phone, c.email, c.status, calls.length,
        last ? new Date(last.calledAt).toISOString().slice(0, 10) : "", last ? last.outcome : ""].map(q).join(",");
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=hackreach-colleges.csv");
    res.send("\uFEFF" + [head.map(q).join(",")].concat(lines).join("\r\n"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/due", async (req, res) => {
  try {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const due = await College.find({ nextFollowUp: { $ne: null, $lte: endOfToday } })
      .sort({ nextFollowUp: 1 })
      .lean();
    res.json(due);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.patch("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid college id." });
  }
  const allowed = ["status", "city", "coordinatorName", "phone", "email", "nextFollowUp"];
  const changes = {};
  for (const key of allowed) {
    if (key in req.body) changes[key] = req.body[key];
  }
  try {
    const college = await College.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!college) return res.status(404).json({ error: "College not found." });
    res.json(college);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/calls", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid college id." });
  }
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ error: "College not found." });
    college.calls.push({ outcome: req.body.outcome, note: req.body.note });
    if (college.status === "Not contacted") college.status = "Called";
    if (req.body.nextFollowUp) college.nextFollowUp = req.body.nextFollowUp;
    await college.save();
    res.status(201).json(college);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;





