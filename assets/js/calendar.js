/* =========================================================
   CarePulse — Calendar & Regimen History
   Reads from localStorage. No predefined user.
   ========================================================= */

const STORE_LOGS    = "carepulse:logs";
const STORE_MEDS    = "carepulse:medications";
const STORE_PROFILE = "carepulse:profile";

const MONTHS       = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const state = {
  viewYear: 0,
  viewMonth: 0,          // 0–11
  selectedDate: null,    // "YYYY-MM-DD"
};

/* ---------- utils ---------- */
function pad2(n){ return String(n).padStart(2, "0"); }
function isoDate(y, m, d){ return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
function todayISO(){
  const t = new Date();
  return isoDate(t.getFullYear(), t.getMonth(), t.getDate());
}
function parseISO(s){
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatLongDate(iso){
  const d = parseISO(iso);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function formatMonthYear(y, m){ return `${MONTHS[m]} ${y}`; }
function daysInMonth(y, m){ return new Date(y, m + 1, 0).getDate(); }
function firstWeekday(y, m){ return new Date(y, m, 1).getDay(); }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function severityBand(sev){
  if (sev == null) return { key: "empty", long: "No Log", cell: "Unlogged" };
  if (sev <= 3)   return { key: "mild",  long: "Mild Symptoms",            cell: `${sev} Mild` };
  if (sev <= 6)   return { key: "mod",   long: "Moderate Interference",    cell: `${sev} Mod` };
  return              { key: "sev",   long: "Severe / Acute Flare",     cell: `${sev} Sev` };
}

/* ---------- storage ---------- */
function safeParse(raw, fallback){
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function loadLogs(){ return safeParse(localStorage.getItem(STORE_LOGS), {}); }
function saveLogs(v){ localStorage.setItem(STORE_LOGS, JSON.stringify(v)); }
function loadMeds(){ return safeParse(localStorage.getItem(STORE_MEDS), []); }
function saveMeds(v){ localStorage.setItem(STORE_MEDS, JSON.stringify(v)); }
function loadProfile(){ return safeParse(localStorage.getItem(STORE_PROFILE), {}); }

/* ---------- calendar rendering ---------- */
function renderCalendar(){
  const grid = document.getElementById("calendarGrid");
  document.getElementById("calMonth").textContent   = formatMonthYear(state.viewYear, state.viewMonth);
  document.getElementById("monthLabel").textContent = formatMonthYear(state.viewYear, state.viewMonth);

  const logs  = loadLogs();
  const y     = state.viewYear;
  const m     = state.viewMonth;
  const first = firstWeekday(y, m);
  const days  = daysInMonth(y, m);
  const today = todayISO();

  let html = "";

  // leading blanks
  for (let i = 0; i < first; i++) html += `<div class="cal-cell empty" aria-hidden="true"></div>`;

  // day cells
  for (let d = 1; d <= days; d++){
    const iso      = isoDate(y, m, d);
    const log      = logs[iso];
    const band     = severityBand(log ? log.severity : null);
    const isFuture = iso > today;
    const isToday  = iso === today;
    const isSel    = iso === state.selectedDate;

    const classes = ["cal-cell"];
    if (isFuture) classes.push("future");
    if (isToday)  classes.push("today");
    if (isSel)    classes.push("selected");
    if (log)      classes.push("has-" + band.key);

    html += `
      <button type="button"
              class="${classes.join(" ")}"
              data-date="${iso}"
              ${isFuture ? "disabled" : ""}
              aria-label="${formatLongDate(iso)} — ${band.cell}">
        <span class="day-num">${d}</span>
        <span class="badge ${band.key}">${band.cell}</span>
      </button>`;
  }

  // trailing blanks
  const total = first + days;
  const trailing = (7 - (total % 7)) % 7;
  for (let i = 0; i < trailing; i++) html += `<div class="cal-cell empty" aria-hidden="true"></div>`;

  grid.innerHTML = html;
  updateMonthlyCount(logs);
}

function updateMonthlyCount(logs){
  logs = logs || loadLogs();
  const y = state.viewYear;
  const m = state.viewMonth;
  const days = daysInMonth(y, m);
  let count = 0;
  for (let d = 1; d <= days; d++) if (logs[isoDate(y, m, d)]) count++;
  document.getElementById("monthlyCount").textContent = `Monthly Logged: ${count}`;
}

/* ---------- daily records panel ---------- */
function renderDailyRecords(){
  const iso = state.selectedDate;
  const drDate  = document.getElementById("drDate");
  const drBy    = document.getElementById("drBy");
  const drLabel = document.getElementById("drSeverityLabel");
  const drScore = document.getElementById("drSeverityScore");
  const drChips = document.getElementById("drSymptoms");
  const drEdit  = document.getElementById("drEdit");
  const drDel   = document.getElementById("drDelete");

  if (!iso){
    drDate.textContent  = "Select a day";
    drBy.textContent    = "—";
    drLabel.textContent = "No log";
    drScore.className   = "severity-score";
    drScore.innerHTML   = "–<small>/10</small>";
    drChips.innerHTML   = "";
    drEdit.textContent  = "＋ Add Log";
    drEdit.href         = "dailylog.html";
    drDel.hidden        = true;
    return;
  }

  const log = loadLogs()[iso];
  drDate.textContent = formatLongDate(iso);
  drDel.hidden = !log;

  if (!log){
    drBy.textContent    = "No entry recorded";
    drLabel.textContent = "Unlogged";
    drScore.className   = "severity-score";
    drScore.innerHTML   = "–<small>/10</small>";
    drChips.innerHTML   = `<span class="muted small">No symptoms logged for this day.</span>`;
    drEdit.textContent  = "＋ Add Log";
    drEdit.href         = `dailylog.html?date=${iso}`;
    return;
  }

  const band = severityBand(log.severity);
  const byRole = log.loggedBy && log.loggedBy.role ? log.loggedBy.role : "";
  const byName = log.loggedBy && log.loggedBy.name ? " · " + log.loggedBy.name : "";
  drBy.textContent = byRole ? `Logged by ${byRole}${byName}` : "Recorded entry";

  drLabel.textContent = band.long;
  drScore.className   = "severity-score " + band.key;
  drScore.innerHTML   = `${log.severity}<small>/10</small>`;

  const symptoms = Array.isArray(log.symptoms) ? log.symptoms : [];
  drChips.innerHTML = symptoms.length
    ? symptoms.map(s => `<span class="chip">${escapeHtml(s)}</span>`).join("")
    : `<span class="muted small">No symptoms logged.</span>`;

  drEdit.textContent = "✎ Edit";
  drEdit.href        = `dailylog.html?date=${iso}`;
}

/* ---------- medication list ---------- */
function renderMeds(){
  const list  = document.getElementById("medList");
  const meds  = loadMeds();
  const count = document.getElementById("medCount");

  count.textContent = meds.length
    ? `${meds.length} active · daily schedule`
    : "No medications yet";

  if (!meds.length){
    list.innerHTML = `<li class="med-empty muted small">Add your first medication to start tracking adherence.</li>`;
    return;
  }

  list.innerHTML = meds.map(m => `
    <li class="med-item">
      <div class="med-info">
        <span class="med-name">${escapeHtml(m.name)}</span>
        <span class="med-schedule muted small">${escapeHtml(m.schedule || "Daily")}</span>
      </div>
      <span class="tag active">Active</span>
      <button class="icon-btn" type="button"
              data-remove-med="${m.id}" aria-label="Remove ${escapeHtml(m.name)}">🗑</button>
    </li>
  `).join("");
}

/* ---------- actions ---------- */
function changeMonth(delta){
  let m = state.viewMonth + delta;
  let y = state.viewYear;
  if (m < 0)  { m = 11; y -= 1; }
  if (m > 11) { m = 0;  y += 1; }
  state.viewMonth = m;
  state.viewYear  = y;
  renderCalendar();
}

function goToToday(){
  const t = new Date();
  state.viewYear     = t.getFullYear();
  state.viewMonth    = t.getMonth();
  state.selectedDate = todayISO();
  renderCalendar();
  renderDailyRecords();
}

function selectDate(iso){
  state.selectedDate = iso;
  renderCalendar();
  renderDailyRecords();
}

function deleteLog(iso){
  if (!confirm("Delete the log for " + formatLongDate(iso) + "?")) return;
  const logs = loadLogs();
  delete logs[iso];
  saveLogs(logs);
  renderCalendar();
  renderDailyRecords();
}

function addMed(name, schedule){
  const meds = loadMeds();
  meds.push({ id: "m" + Date.now(), name, schedule, active: true });
  saveMeds(meds);
  renderMeds();
}

function removeMed(id){
  const meds = loadMeds();
  saveMeds(meds.filter(m => m.id !== id));
  renderMeds();
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // page guard — bounce if no profile has been created
  if (!loadProfile().name){
    location.replace("../create-profile.html");
    return;
  }

  // default view = current month, default selection = today
  const t = new Date();
  state.viewYear     = t.getFullYear();
  state.viewMonth    = t.getMonth();
  state.selectedDate = todayISO();

  // wire controls
  document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
  document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
  document.getElementById("btnToday").addEventListener("click", goToToday);

  // calendar grid (delegate)
  document.getElementById("calendarGrid").addEventListener("click", (e) => {
    const cell = e.target.closest(".cal-cell[data-date]");
    if (!cell || cell.disabled) return;
    selectDate(cell.dataset.date);
  });

  // delete from daily records
  document.getElementById("drDelete").addEventListener("click", () => {
    if (state.selectedDate) deleteLog(state.selectedDate);
  });

  // collapse toggle
  document.getElementById("drCollapse").addEventListener("click", () => {
    const card = document.querySelector(".daily-card");
    card.classList.toggle("collapsed");
    document.getElementById("drCollapse").textContent =
      card.classList.contains("collapsed") ? "+" : "−";
  });

  // add-med inline form
  const form      = document.getElementById("medAddForm");
  const nameInput = document.getElementById("medName");
  const schedInpt = document.getElementById("medSchedule");

  document.getElementById("btnAddMed").addEventListener("click", () => {
    form.hidden = false;
    nameInput.focus();
  });
  document.getElementById("medCancel").addEventListener("click", () => {
    form.hidden = true;
    form.reset();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    addMed(name, schedInpt.value.trim() || "Daily");
    form.hidden = true;
    form.reset();
  });

  // remove-med (delegate)
  document.getElementById("medList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-med]");
    if (!btn) return;
    if (confirm("Remove this medication?")) removeMed(btn.dataset.removeMed);
  });

  // first paint
  renderCalendar();
  renderDailyRecords();
  renderMeds();
});