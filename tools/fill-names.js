const mongoose = require("mongoose");
const College = require("../models/College");

const first = ["Aarav","Ananya","Rohan","Priya","Karthik","Sneha","Arjun","Divya","Rahul","Meera","Vikram","Neha","Aditya","Pooja","Siddharth","Kavya","Harsh","Ishita","Manish","Riya","Nikhil","Shruti","Varun","Anjali","Tejas","Deepika","Mohit","Swati","Akash","Lakshmi","Pranav","Nandini","Rajesh","Fatima","Gurpreet","Joseph","Sana","Ritesh","Bhavya","Yash"];
const last = ["Sharma","Reddy","Nair","Iyer","Patel","Singh","Gupta","Rao","Menon","Kulkarni","Das","Joshi","Verma","Pillai","Bose","Mehta","Naidu","Shetty","Kapoor","Chatterjee","Desai","Hegde","Mishra","Thakur","Banerjee","Khan","Fernandes","Gowda","Pandey","Saxena"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/HackReach");
  const empty = await College.find({ $or: [{ coordinatorName: "" }, { coordinatorName: null }] }).select("_id");
  const ops = empty.map((c) => ({
    updateOne: { filter: { _id: c._id }, update: { $set: { coordinatorName: pick(first) + " " + pick(last) } } }
  }));
  if (ops.length) await College.bulkWrite(ops);
  console.log("Filled demo coordinator names for", ops.length, "colleges");
  await mongoose.disconnect();
})();
