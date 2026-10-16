const GOAL = 400;
const PAGE_SIZE = 25;
const STATUSES = ["Not contacted", "Called", "Interested", "Flyer sent", "Registered", "Declined"];
const OUTCOMES = ["No answer", "Spoke to coordinator", "Call back later", "Wrong number", "Not interested"];
const COLORS = ["#a3adbd", "#3f7ad9", "#d99a1e", "#8a63c9", "#2a9d6b", "#d1544f"];
const $ = (id) => document.getElementById(id);
let all = [];
let current = null;
let page = 1;

const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

const dateVal = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function followUpCell(d) {
  if (!d) return '<span class="sub">None set</span>';
  const date = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const text = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return date < today ? `<span class="overdue">${text} (overdue)</span>` : text;
}

function renderSummary() {
  const counts = STATUSES.map((s) => all.filter((c) => c.status === s).length);
  const contacted = all.length - counts[0];
  const pct = all.length ? Math.round((contacted / all.length) * 100) : 0;
  $("total").textContent = all.length;
  $("goalText").textContent = "colleges in the list. " + contacted + " contacted (" + pct + "%)";
  const base = Math.max(all.length, 1);
  $("pipeline").innerHTML = counts
    .map((n, i) => (i === 0 || !n ? "" : `<div style="width:${(n / base) * 100}%;background:${COLORS[i]}" title="${STATUSES[i]}: ${n}"></div>`))
    .join("");
  $("legend").innerHTML = STATUSES
    .map((s, i) => `<button type="button" class="seg ${$("fStatus").value === s ? "active" : ""}" data-status="${s}"><b class="${counts[i] ? "" : "zero"}">${counts[i]}</b><span class="dot" style="--c:${COLORS[i]}"></span>${s}</button>`)
    .join("");
}

function renderFilters() {
  const keep = $("fState").value;
  const states = [...new Set(all.map((c) => c.state))].sort();
  $("fState").innerHTML = '<option value="">All states</option>' +
    states.map((s) => `<option ${s === keep ? "selected" : ""}>${esc(s)}</option>`).join("");
}

function filtered() {
  const q = $("search").value.trim().toLowerCase();
  const st = $("fState").value;
  const sts = $("fStatus").value;
  return all.filter((c) =>
    (!st || c.state === st) &&
    (!sts || c.status === sts) &&
    (!q || [c.name, c.city, c.coordinatorName].join(" ").toLowerCase().includes(q))
  );
}

function renderRows() {
  const list = filtered();
  const pages = Math.max(Math.ceil(list.length / PAGE_SIZE), 1);
  if (page > pages) page = pages;
  const start = (page - 1) * PAGE_SIZE;
  const view = list.slice(start, start + PAGE_SIZE);

  const filtering = $("search").value.trim() || $("fState").value || $("fStatus").value;
  $("empty").style.display = list.length ? "none" : "block";
  $("pager").style.display = list.length ? "flex" : "none";
  $("emptyText").textContent = filtering
    ? "No colleges match your search. Try clearing a filter."
    : "Add your first college or import a CSV to start tracking outreach.";
  $("emptyAdd").style.display = filtering ? "none" : "inline-block";

  $("range").textContent = list.length
    ? "Showing " + (start + 1) + "-" + (start + view.length) + " of " + list.length
    : "";
  $("prev").disabled = page <= 1;
  $("next").disabled = page >= pages;

  $("rows").innerHTML = view.map((c) => {
    const i = Math.max(STATUSES.indexOf(c.status), 0);
    const contact = [
      c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : "",
      c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""
    ].filter(Boolean).join("<br>");
    const options = STATUSES.map((s) => `<option ${s === c.status ? "selected" : ""}>${s}</option>`).join("");
    return `
      <tr>
        <td><a href="#" class="name open-college" data-id="${c._id}">${esc(c.name)}</a><span class="sub">${esc(c.city) || "No city"}</span></td>
        <td>${esc(c.state)}</td>
        <td>${esc(c.coordinatorName) || '<span class="sub">Not added</span>'}</td>
        <td>${contact || '<span class="sub">Not added</span>'}</td>
        <td><select class="status-select" style="--c:${COLORS[i]}" data-id="${c._id}">${options}</select></td>
      </tr>`;
  }).join("");
}

function applyFilters() { page = 1; renderSummary(); renderRows(); }

function replaceCollege(updated) {
  const i = all.findIndex((c) => c._id === updated._id);
  if (i >= 0) all[i] = updated;
  renderSummary();
  renderRows();
}

async function load() {
  const res = await fetch("/api/colleges");
  all = await res.json();
  renderSummary();
  renderFilters();
  renderRows();
  $("heroStates").textContent = new Set(all.map((c) => c.state)).size;
}

function fillDetail() {
  $("cTitle").textContent = current.name;
  $("cSub").textContent = [current.city, current.state].filter(Boolean).join(", ");
  const f = $("editForm");
  f.coordinatorName.value = current.coordinatorName || "";
  f.phone.value = current.phone || "";
  f.email.value = current.email || "";
  f.city.value = current.city || "";
  f.nextFollowUp.value = dateVal(current.nextFollowUp);
  const calls = current.calls || [];
  $("history").innerHTML = calls.length
    ? calls.slice().reverse().map((c) =>
        `<li><b>${esc(c.outcome)}</b><small>${new Date(c.calledAt).toLocaleString("en-IN")}</small>${c.note ? esc(c.note) : ""}</li>`
      ).join("")
    : '<li style="color:var(--muted)">No calls logged yet.</li>';
}

$("fStatus").innerHTML += STATUSES.map((s) => `<option>${s}</option>`).join("");
$("outcome").innerHTML = OUTCOMES.map((o) => `<option>${o}</option>`).join("");
$("search").addEventListener("input", applyFilters);
$("fState").addEventListener("change", applyFilters);
$("fStatus").addEventListener("change", applyFilters);
$("prev").addEventListener("click", () => { page--; renderRows(); });
$("next").addEventListener("click", () => { page++; renderRows(); });

$("legend").addEventListener("click", (e) => {
  const b = e.target.closest(".seg");
  if (!b) return;
  $("fStatus").value = $("fStatus").value === b.dataset.status ? "" : b.dataset.status;
  applyFilters();
});

$("rows").addEventListener("change", async (e) => {
  if (!e.target.classList.contains("status-select")) return;
  const res = await fetch("/api/colleges/" + e.target.dataset.id, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: e.target.value })
  });
  if (res.ok) { replaceCollege(await res.json()); toast("Status updated"); }
  else { toast("Couldn't update status"); load(); }
});

$("rows").addEventListener("click", (e) => {
  const link = e.target.closest(".open-college");
  if (!link) return;
  e.preventDefault();
  current = all.find((c) => c._id === link.dataset.id);
  if (!current) return;
  fillDetail();
  $("dlg2").showModal();
});
$("closeDetail").addEventListener("click", () => $("dlg2").close());

$("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const res = await fetch("/api/colleges/" + current._id, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinatorName: f.coordinatorName.value,
      phone: f.phone.value,
      email: f.email.value,
      city: f.city.value,
      nextFollowUp: f.nextFollowUp.value || null
    })
  });
  const data = await res.json();
  if (res.ok) { current = data; replaceCollege(data); fillDetail(); toast("Details saved"); }
  else toast("Couldn't save: " + data.error);
});

$("callForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const res = await fetch("/api/colleges/" + current._id + "/calls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      outcome: f.outcome.value,
      note: f.note.value,
      nextFollowUp: f.callBack.value || undefined
    })
  });
  const data = await res.json();
  if (res.ok) { f.note.value = ""; f.callBack.value = ""; current = data; replaceCollege(data); fillDetail(); toast("Call logged"); }
  else toast("Couldn't log call: " + data.error);
});

const openAdd = () => { $("err").textContent = ""; $("dlg").showModal(); };
$("openAdd").addEventListener("click", openAdd);
$("emptyAdd").addEventListener("click", openAdd);
$("closeAdd").addEventListener("click", () => $("dlg").close());
$("cancelAdd").addEventListener("click", () => $("dlg").close());

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("err").textContent = "";
  const body = Object.fromEntries(new FormData($("form")));
  const res = await fetch("/api/colleges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (res.ok) {
    $("form").reset();
    $("dlg").close();
    toast("College saved");
    load();
  } else {
    $("err").textContent = "Couldn't save: " + (await res.json()).error;
  }
});

load();




// ===== App shell: views, KPIs, state dashboard =====
const VIEWS = {
  dashboard: { title: "Dashboard", sub: "Outreach progress across every state" },
  colleges: { title: "Colleges", sub: "Search, call and track each college" },
  callist: { title: "Call list", sub: "Colleges due for a follow-up call today or earlier" },
};

function show(name) {
  if (!VIEWS[name]) name = "dashboard";
  Object.keys(VIEWS).forEach((v) => {
    $("view-" + v).hidden = v !== name;
    $("nav-" + v).classList.toggle("active", v === name);
  });
  $("pageTitle").textContent = VIEWS[name].title;
  $("pageSub").textContent = VIEWS[name].sub;
  history.replaceState(null, "", "#" + name);
}

document.querySelectorAll("[data-view]").forEach((a) =>
  a.addEventListener("click", (e) => { e.preventDefault(); show(a.dataset.view); })
);

function updateKpis() {
  $("kpiTotal").textContent = all.length;
  $("kpiContacted").textContent = all.filter((c) => c.status !== "Not contacted").length;
  $("kpiRegistered").textContent = all.filter((c) => c.status === "Registered").length;
  $("heroStates").textContent = new Set(all.map((c) => c.state)).size;
  $("navCount").textContent = all.length;
}

const _renderSummary = renderSummary;
renderSummary = function () { _renderSummary(); updateKpis(); };

async function loadStates() {
  const res = await fetch("/api/colleges/stats/by-state");
  if (!res.ok) return;
  const rows = await res.json();
  $("stateCount").textContent = rows.length + " states";
  $("stateList").innerHTML = rows.map((r) => {
    const pct = r.total ? Math.round((r.contacted / r.total) * 100) : 0;
    return `<button type="button" class="state-row" data-state="${esc(r.state)}">
      <span>${esc(r.state)}</span>
      <span class="state-bar"><i style="width:${pct}%"></i></span>
      <span class="state-num"><b>${r.contacted}</b> / ${r.total}</span>
    </button>`;
  }).join("");
}

const _replaceCollege = replaceCollege;
replaceCollege = function (u) { _replaceCollege(u); loadStates(); };
const _load = load;
load = async function () { await _load(); loadStates(); };

$("legend").addEventListener("click", (e) => { if (e.target.closest(".seg")) show("colleges"); });
$("stateList").addEventListener("click", (e) => {
  const row = e.target.closest(".state-row");
  if (!row) return;
  $("fState").value = row.dataset.state;
  applyFilters();
  show("colleges");
});

loadStates();
show((location.hash || "#dashboard").slice(1));

// ===== Export CSV =====
$("exportBtn").addEventListener("click", () => {
  const p = new URLSearchParams();
  if ($("fState").value) p.set("state", $("fState").value);
  if ($("fStatus").value) p.set("status", $("fStatus").value);
  window.location = "/api/colleges/export.csv?" + p.toString();
});

// ===== Message templates =====
const who = (c) => c.coordinatorName || "Sir/Madam";
const TEMPLATES = {
  "First message (WhatsApp)": (c) =>
    `Hello ${who(c)},\n\nI'm reaching out on behalf of our hackathon team. We are organising an intercollege hackathon and would love for students from ${c.name} to take part.\n\nCould I share the flyer with you so your club can pass it on to students?\n\nThank you!`,
  "Flyer follow-up (WhatsApp)": (c) =>
    `Hello ${who(c)},\n\nThank you for speaking with us. As discussed, here is the flyer for our intercollege hackathon. It would be great if you could share it with the students and clubs at ${c.name}.\n\nPlease let us know if your students have any questions about registration.`,
  "Email invitation": (c) =>
    `Subject: Intercollege hackathon invitation for ${c.name}\n\nDear ${who(c)},\n\nWe are organising an intercollege hackathon and we would like to invite students from ${c.name} to participate.\n\nWe have attached the event flyer. We would be grateful if you could share it with your student community and club members.\n\nPlease reply to this email if you need any further details.\n\nRegards,\nHackathon Team`
};

$("tpl").innerHTML = Object.keys(TEMPLATES).map((k) => `<option>${k}</option>`).join("");

function setTemplate() {
  if (!current) return;
  $("tplText").value = TEMPLATES[$("tpl").value](current);
}

const _fillDetail = fillDetail;
fillDetail = function () { _fillDetail(); setTemplate(); };
$("tpl").addEventListener("change", setTemplate);
$("copyTpl").addEventListener("click", () => {
  navigator.clipboard.writeText($("tplText").value).then(() => toast("Message copied"));
});




// ===== Call list =====
async function loadDue() {
  const res = await fetch("/api/colleges/due");
  if (!res.ok) return;
  const rows = await res.json();
  $("navDue").textContent = rows.length;
  $("dueList").innerHTML = rows.length
    ? rows.map((c) => `
        <div class="due-row">
          <div><a href="#" class="name open-college" data-id="${c._id}">${esc(c.name)}</a><span class="sub">${esc([c.city, c.state].filter(Boolean).join(", "))}</span></div>
          <div>${esc(c.coordinatorName) || '<span class="sub">No coordinator</span>'}</div>
          <div>${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '<span class="sub">No phone</span>'}</div>
          <div>${followUpCell(c.nextFollowUp)}</div>
        </div>`).join("")
    : '<div class="due-empty">Nothing due today. Set a follow-up date in a college panel, or log a call with a call-back date.</div>';
}

$("dueList").addEventListener("click", (e) => {
  const link = e.target.closest(".open-college");
  if (!link) return;
  e.preventDefault();
  current = all.find((c) => c._id === link.dataset.id);
  if (!current) return;
  fillDetail();
  $("dlg2").showModal();
});

const _replaceCollege2 = replaceCollege;
replaceCollege = function (u) { _replaceCollege2(u); loadDue(); };

loadDue();

