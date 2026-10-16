const mongoose = require("mongoose");

const STATUSES = ["Not contacted", "Called", "Interested", "Flyer sent", "Registered", "Declined"];
const OUTCOMES = ["No answer", "Spoke to coordinator", "Call back later", "Wrong number", "Not interested"];

const callSchema = new mongoose.Schema({
  outcome: { type: String, enum: OUTCOMES, required: true },
  note: { type: String, trim: true, default: "" },
  calledAt: { type: Date, default: Date.now }
});

const collegeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    city: { type: String, trim: true, default: "" },
    coordinatorName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    status: { type: String, enum: STATUSES, default: "Not contacted" },
    nextFollowUp: { type: Date, default: null },
    calls: { type: [callSchema], default: [] }
  },
  { timestamps: true }
);

collegeSchema.index({ name: 1, state: 1 }, { unique: true });

module.exports = mongoose.model("College", collegeSchema);

