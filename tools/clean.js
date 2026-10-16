const fs = require("fs");

const [, , input, countArg] = process.argv;
const LIMIT = Number(countArg) || 400;
if (!input) { console.log("Usage: node tools\\clean.js aicte.csv 400"); process.exit(1); }

const ALIASES = {
  name: ["name", "collegename", "college", "institute", "institution", "institutename", "institutionname"],
  state: ["state", "statename"],
  city: ["city", "town", "district", "location"]
};

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
const title = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s);

const rows = parseCSV(fs.readFileSync(input, "utf8"));
const heads = rows[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
const idx = {};
for (const f in ALIASES) idx[f] = heads.findIndex((h) => ALIASES[f].includes(h));
if (idx.name < 0 || idx.state < 0) {
  console.log("Could not find name/state columns. Headings found:", rows[0].join(" | "));
  process.exit(1);
}

const seen = new Set();
const byState = {};
for (const r of rows.slice(1)) {
  const name = title(clean(r[idx.name]));
  const state = title(clean(r[idx.state]));
  const city = idx.city >= 0 ? title(clean(r[idx.city])) : "";
  if (!name || !state) continue;
  const key = (name + "|" + state).toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  (byState[state] = byState[state] || []).push({ name, state, city });
}

// Take one college from each state in turn, so all states are covered
const states = Object.keys(byState).sort();
const picked = [];
for (let round = 0; picked.length < LIMIT; round++) {
  let added = false;
  for (const s of states) {
    if (byState[s][round] && picked.length < LIMIT) { picked.push(byState[s][round]); added = true; }
  }
  if (!added) break;
}

const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
const out = ["name,state,city,coordinatorName,phone,email"]
  .concat(picked.map((c, i) => [q(c.name), q(c.state), q(c.city), '""', q("9000" + String(i + 1).padStart(6, "0")), q("coordinator" + String(i + 1).padStart(3, "0") + "@example.com")].join(",")));
fs.writeFileSync("colleges-ready.csv", out.join("\r\n"), "utf8");
console.log("Unique colleges found:", seen.size, "| States:", states.length, "| Written:", picked.length);
