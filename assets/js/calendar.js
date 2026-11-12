/* Calendar rendering and medication controls for the active patient. */
const state = { viewYear: 0, viewMonth: 0, selectedDate: null };
const element = CarePulseUI.element;

function formatLongDate(iso) {
  return CarePulse.parseDate(iso).toLocaleDateString(undefined, {
    weekday: "long", month: "short", day: "numeric", year: "numeric"
  });
}

function renderCalendar() {
  const firstDay = new Date(state.viewYear, state.viewMonth, 1);
  const monthName = firstDay.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  CarePulseUI.setText("calMonth", monthName);
  CarePulseUI.setText("monthLabel", monthName);
  document.getElementById("monthPicker").value = CarePulse.dateISO(firstDay).slice(0, 7);
  const logs = new Map();
  CarePulse.patientRecords("logs").forEach(log => {
    logs.set(log.date, Math.max(log.severity, logs.get(log.date) || 0));
  });
  const grid = document.getElementById("calendarGrid");
  grid.replaceChildren();
  const days = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();
  const first = firstDay.getDay();
  const cellCount = Math.ceil((first + days) / 7) * 7;
  let loggedDays = 0;
  for (let index = 0; index < cellCount; index += 1) {
    const day = index - first + 1;
    if (day < 1 || day > days) {
      const blank = element("div", "cal-cell empty");
      blank.setAttribute("aria-hidden", "true");
      grid.appendChild(blank);
      continue;
    }
    const date = CarePulse.dateISO(new Date(state.viewYear, state.viewMonth, day));
    const severity = logs.get(date);
    const band = CarePulse.severityBand(severity);
    const label = severity ? severity + " " + (band.key === "sev" ? "Severe" : band.label) : "Unlogged";
    const cell = CarePulseUI.button("", "cal-cell");
    cell.dataset.date = date;
    cell.classList.toggle("future", date > CarePulse.dateISO());
    cell.classList.toggle("today", date === CarePulse.dateISO());
    cell.classList.toggle("selected", date === state.selectedDate);
    cell.setAttribute("aria-pressed", String(date === state.selectedDate));
    if (severity) { cell.classList.add("has-" + band.key); loggedDays += 1; }
    cell.setAttribute("aria-label", formatLongDate(date) + " — " + label);
    cell.append(element("span", "day-num", day), element("span", "badge " + band.key, label));
    grid.appendChild(cell);
  }
  CarePulseUI.setText("monthlyCount", "Monthly Logged: " + loggedDays);
}

function renderDailyRecords() {
  const date = state.selectedDate;
  const logs = CarePulse.patientRecords("logs").filter(log => log.date === date);
  const severity = logs.length ? Math.max(...logs.map(log => log.severity)) : null;
  const band = CarePulse.severityBand(severity);
  CarePulseUI.setText("drDate", formatLongDate(date));
  CarePulseUI.setText("drBy", logs.length + " symptom entries");
  CarePulseUI.setText("drSeverityLabel", band.label);
  
  const score = document.getElementById("drSeverityScore");
  score.className = "severity-score " + band.key;
  score.replaceChildren(document.createTextNode(String(severity ?? "–")), element("small", "", "/10"));
  
  const entries = document.getElementById("drSymptoms");
  entries.replaceChildren();
  
  if (!logs.length) {
    entries.appendChild(element("p", "muted small", "No symptom entries for this date."));
  }
  
  logs.forEach(log => {
    const entry = element("div", "day-entry");
    
    // Format the timestamp
    const timeStr = log.updatedAt 
        ? new Date(log.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "";

    // Create a header container for severity + timestamp
    const header = element("div", "log-header");
    header.append(element("strong", "", log.severity + "/10 · " + (log.loggedBy?.role || "Recorded entry")));
    if (timeStr) {
        header.append(element("span", "muted small log-time", " • " + timeStr));
    }

    const edit = element("a", "link-btn", "View / Edit Log");
    edit.href = "dailylog.html?id=" + encodeURIComponent(log.id);
    
    const remove = CarePulseUI.button("Delete Log", "link-btn danger");
    remove.dataset.deleteLog = log.id;
    
    // NEW: Wrap the actions in a flex container so they aren't touching
    const actionsContainer = element("div", "log-actions");
    actionsContainer.append(edit, remove);

    entry.append(
      header,
      element("p", "", log.symptoms.join(", ")),
      element("p", "", "Triggers: " + (log.triggers.join(", ") || "None reported")),
      element("p", "observation-note", log.notes || ""), 
      actionsContainer // Append the container instead of individual buttons
    );
    entries.appendChild(entry);
  });

  const add = document.getElementById("drEdit");
  add.textContent = "＋ Add Log";
  add.href = "dailylog.html?date=" + date;
  add.hidden = date > CarePulse.dateISO();
}

function renderMeds() {
  const data = CarePulse.read();
  const date = state.selectedDate;
  const medications = CarePulse.patientRecords("medications", data).filter(med => CarePulse.scheduleOn(med, date));
  const intakes = CarePulse.patientRecords("intakes", data);
  const list = document.getElementById("medList");
  CarePulseUI.setText("medCount", medications.length + " medications · " + date);
  list.replaceChildren();
  if (!medications.length) list.appendChild(element("li", "med-empty muted small", "No medications scheduled for this date."));
  medications.forEach(med => {
    const schedule = CarePulse.scheduleOn(med, date);
    const item = element("li", "med-item");
    const info = element("div", "med-info");
    info.append(element("span", "med-name", med.name),
      element("span", "med-schedule muted small", schedule.dosage + " · " + schedule.frequency + " dose(s)/day · " + schedule.schedule));
    const doses = element("div", "dose-list");
    for (let dose = 0; dose < schedule.frequency; dose += 1) {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.medication = med.id;
      checkbox.dataset.dose = dose;
      checkbox.checked = intakes.some(intake => intake.medicationId === med.id && intake.date === date && intake.dose === dose);
      checkbox.disabled = date > CarePulse.dateISO();
      label.append(checkbox, document.createTextNode(" Dose " + (dose + 1) + " taken"));
      doses.appendChild(label);
    }
    info.appendChild(doses);
    if (med.endDate) info.appendChild(element("small", "", "Regimen ended"));
    else {
      const edit = CarePulseUI.button("Edit Medication", "link-btn");
      edit.dataset.editMed = med.id;
      const remove = CarePulseUI.button("Delete Medication", "link-btn danger");
      remove.dataset.removeMed = med.id;
      info.append(edit, remove);
    }
    item.appendChild(info);
    list.appendChild(item);
  });
}

let editingMedicationId = null;

function openMedicationForm(medication) {
  const form = document.getElementById("medAddForm");
  form.reset();
  editingMedicationId = medication?.id || null;
  const schedule = medication?.changes.at(-1);
  document.getElementById("medName").value = medication?.name || "";
  document.getElementById("medDosage").value = schedule?.dosage || "";
  document.getElementById("medFrequency").value = schedule?.frequency || 1;
  document.getElementById("medSchedule").value = schedule?.schedule || "";
  const start = document.getElementById("medStartDate");
  start.value = medication?.startDate || state.selectedDate;
  start.disabled = Boolean(medication);
  form.hidden = false;
  document.getElementById("medName").focus();
}

function refreshCalendar() {
  renderCalendar();
  renderDailyRecords();
  renderMeds();
}

function changeMonth(delta) {
  const date = new Date(state.viewYear, state.viewMonth + delta, 1);
  if (date.getFullYear() < 100 || date.getFullYear() > 9999) return;
  state.viewYear = date.getFullYear();
  state.viewMonth = date.getMonth();
  renderCalendar();
}

function goToToday() {
  const today = new Date();
  state.viewYear = today.getFullYear();
  state.viewMonth = today.getMonth();
  state.selectedDate = CarePulse.dateISO();
  refreshCalendar();
}

function selectDate(iso) {
  state.selectedDate = iso;
  refreshCalendar();
}

CarePulse.onReady(() => {
  const today = new Date();
  state.viewYear = today.getFullYear();
  state.viewMonth = today.getMonth();
  state.selectedDate = CarePulse.dateISO();
  
  document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
  document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
  document.getElementById("btnToday").addEventListener("click", goToToday);
  document.getElementById("monthPicker").addEventListener("change", event => {
    if (!/^\d{4}-\d{2}$/.test(event.target.value)) return;
    const [year, month] = event.target.value.split("-").map(Number);
    if (year < 100 || year > 9999 || month < 1 || month > 12) return;
    state.viewYear = year;
    state.viewMonth = month - 1;
    renderCalendar();
  });
  
  document.getElementById("calendarGrid").addEventListener("click", event => {
    const cell = event.target.closest("[data-date]");
    if (cell) CarePulse.run(() => selectDate(cell.dataset.date));
  });
  
  document.getElementById("drSymptoms").addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-log]");
    if (button && await showCustomModal("Delete Log", "Permanently delete this symptom entry?", true)) {
      CarePulse.run(() => CarePulse.deleteLog(button.dataset.deleteLog));
    }
  });
  
  document.getElementById("drCollapse").addEventListener("click", () => {
    const card = document.querySelector(".daily-card");
    card.classList.toggle("collapsed");
    document.getElementById("drCollapse").textContent = card.classList.contains("collapsed") ? "+" : "−";
  });
  
  const form = document.getElementById("medAddForm");
  document.getElementById("btnAddMed").addEventListener("click", () => openMedicationForm());
  document.getElementById("medCancel").addEventListener("click", () => {
    form.hidden = true;
    form.reset();
    editingMedicationId = null;
  });
  
  form.addEventListener("submit", event => {
    event.preventDefault();
    CarePulse.run(() => {
      CarePulse.saveMedication({
        id: editingMedicationId, name: document.getElementById("medName").value,
        dosage: document.getElementById("medDosage").value,
        frequency: Number(document.getElementById("medFrequency").value),
        schedule: document.getElementById("medSchedule").value,
        startDate: document.getElementById("medStartDate").value
      });
      form.hidden = true;
      editingMedicationId = null;
      CarePulse.feedback("Medication saved. Schedule changes apply from today; earlier dates keep their original schedule.");
    });
  });
  
  document.getElementById("medList").addEventListener("change", event => {
    const input = event.target.closest("[data-dose]");
    if (input) {
      CarePulse.run(() => CarePulse.markTaken(input.dataset.medication, state.selectedDate, Number(input.dataset.dose), input.checked));
      CarePulse.run(renderMeds);
    }
  });
  
  document.getElementById("medList").addEventListener("click", async event => {
    const edit = event.target.closest("[data-edit-med]");
    if (edit) CarePulse.run(() => openMedicationForm(CarePulse.patientRecords("medications").find(med => med.id === edit.dataset.editMed)));
    const remove = event.target.closest("[data-remove-med]");
    if (remove && await showCustomModal("Delete Medication", "End this regimen? Recorded doses and earlier history will remain available.", true)) {
      CarePulse.run(() => {
        CarePulse.deleteMedication(remove.dataset.removeMed);
        form.hidden = true;
      });
    }
  });
  
  refreshCalendar();
  CarePulse.onChange(refreshCalendar);
});