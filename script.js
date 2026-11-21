const KEY = "studyStreak.sessions";
let sessions = load();

const $ = (id) => document.getElementById(id);

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(sessions)); }
  catch { $("msg").textContent = "Could not save. Browser storage may be blocked."; }
}

// Date helpers (local time, format YYYY-MM-DD)
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function studiedDays() {
  return new Set(sessions.map((s) => s.date));
}

function currentStreak() {
  const days = studiedDays();
  let i = days.has(dateKey(new Date())) ? 0 : 1; // today not logged yet? start from yesterday
  let count = 0;
  while (days.has(dateKey(daysAgo(i)))) { count++; i++; }
  return count;
}

function bestStreak() {
  const sorted = [...studiedDays()].sort();
  let best = 0, run = 0, prev = null;
  for (const k of sorted) {
    const d = new Date(k + "T00:00:00");
    if (prev && (d - prev) / 86400000 === 1) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

function addSession() {
  const subject = $("subject").value.trim();
  const minutes = Number($("minutes").value);
  if (!subject) { $("msg").textContent = "Enter a subject."; return; }
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) {
    $("msg").textContent = "Minutes must be a whole number from 1 to 720."; return;
  }
  $("msg").textContent = "";
  sessions.push({ id: Date.now(), date: dateKey(new Date()), subject, minutes });
  save();
  $("subject").value = "";
  render();
  const streakEl = $("streak"); // small pop when the streak updates
  streakEl.classList.remove("bump"); void streakEl.offsetWidth; streakEl.classList.add("bump");
}

function removeSession(id) {
  sessions = sessions.filter((s) => s.id !== id);
  save();
  render();
}

function prettyDate(d) {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function renderChain() {
  const chain = $("chain");
  chain.innerHTML = "";
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    const mins = sessions.filter((s) => s.date === dateKey(d)).reduce((a, s) => a + s.minutes, 0);
    const cell = document.createElement("div");
    cell.className = "cell";
    if (mins) cell.classList.add("done");
    if (i === 0) cell.classList.add("today");
    cell.dataset.tip = `${prettyDate(d)}\n${mins ? mins + " min studied" : "No session"}`;
    cell.tabIndex = -1; // lets a tap show the tooltip on touch screens
    chain.appendChild(cell);
  }
}

function renderChart() {
  const chart = $("chart");
  chart.innerHTML = "";
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    const list = sessions.filter((s) => s.date === dateKey(d));
    days.push({ d, list, sum: list.reduce((a, s) => a + s.minutes, 0) });
  }
  const max = Math.max(60, ...days.map((t) => t.sum));
  for (const t of days) {
    const h = Math.round((t.sum / max) * 110);
    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";
    wrap.tabIndex = 0; // keyboard users can focus a bar to see its tooltip
    wrap.style.setProperty("--h", Math.max(h, 2) + "px");
    const lines = t.list.slice(0, 4).map((s) => `${s.subject}: ${s.minutes} min`);
    if (t.list.length > 4) lines.push(`+${t.list.length - 4} more`);
    wrap.dataset.tip = [prettyDate(t.d), t.sum ? `${t.sum} min total` : "No session", ...lines].join("\n");
    const val = document.createElement("span");
    val.className = "bar-val";
    val.textContent = t.sum;
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = "0px"; // bars grow from zero
    const label = document.createElement("span");
    label.textContent = t.d.toLocaleDateString(undefined, { weekday: "short" });
    wrap.append(val, bar, label);
    chart.appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.height = h + "px"; }));
  }
}

function renderHistory() {
  const list = $("history");
  list.innerHTML = "";
  if (sessions.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No sessions yet. Add your first one above.";
    list.appendChild(li);
    return;
  }
  [...sessions].reverse().slice(0, 20).forEach((s) => {
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = `${s.date}: ${s.subject}, ${s.minutes} min`;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "del";
    del.textContent = "Delete";
    del.setAttribute("aria-label", `Delete ${s.subject} session from ${s.date}`);
    del.addEventListener("click", () => removeSession(s.id));
    li.append(text, del);
    list.appendChild(li);
  });
}

function render() {
  $("streak").textContent = currentStreak();
  $("best").textContent = bestStreak();
  renderChain();
  renderChart();
  renderHistory();
}

$("add").addEventListener("click", addSession);
$("subject").addEventListener("keydown", (e) => { if (e.key === "Enter") addSession(); });
render();
