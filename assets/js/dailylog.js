CarePulse.onReady(data => {
  const patient = CarePulse.activePatient(data);
  const form = document.getElementById("daily-log-form");
  const dateInput = document.getElementById("logDate");
  const feedback = document.getElementById("logFeedback");
  const details = document.getElementById("logDetails");
  const params = new URLSearchParams(location.search);
  let editingId = null;
  const element = CarePulseUI.element;
  const customSymptom = document.getElementById("customSymptom");

  dateInput.max = CarePulse.dateISO();
  dateInput.min = patient.birthDate || "";
  document.querySelector(".caregiver-note").textContent = `Recording for ${patient.name}`;
  document.querySelector(".profile-line strong").textContent = patient.name;
  document.querySelector(".profile-line .avatar").textContent = patient.name.charAt(0).toUpperCase();

  function updateSelections() {
    ["symptoms", "triggers"].forEach(name => {
      const count = form.querySelectorAll(`input[name="${name}"]:checked`).length;
      form.querySelector(`input[name="${name}"]`).closest("section").querySelector(".tag").textContent = `${count} selected`;
    });
    const customSelected = form.querySelector('[name="symptoms"][value="Custom Symptom"]').checked;
    customSymptom.hidden = !customSelected;
    customSymptom.required = customSelected;
    const severity = form.querySelector('[name="severity"]:checked');
    document.getElementById("severityStatus").textContent = severity ? `${severity.value}/10 · ${CarePulse.severityBand(Number(severity.value)).label}` : "Select a severity level";
  }

  function resetForm(date = CarePulse.dateISO()) {
    editingId = null;
    form.reset();
    dateInput.value = CarePulse.validDate(date) && date <= CarePulse.dateISO() ? date : CarePulse.dateISO();
    document.getElementById("saveLogBtn").textContent = "Save Daily Log";
    details.hidden = true;
    updateSelections();
  }

  function getLog(id) {
    const log = CarePulse.patientRecords("logs").find(item => item.id === id);
    if (!log) throw new Error("This log is no longer available for this patient.");
    return log;
  }

  function editLog(id) {
    const log = getLog(id);
    resetForm(log.date);
    editingId = log.id;
    form.querySelector(`[name="severity"][value="${Number(log.severity)}"]`).checked = true;
    ["symptoms", "triggers"].forEach(name => {
      (log[name] || []).forEach(value => {
        let input = [...form.querySelectorAll(`[name="${name}"]`)].find(item => item.value === value);
        if (!input) {
          const label = document.createElement("label");
          input = document.createElement("input");
          input.type = "checkbox";
          input.name = name;
          input.value = value;
          const text = document.createElement("span");
          text.textContent = value;
          label.append(input, text);
          form.querySelector(`[name="${name}"]`).parentElement.parentElement.appendChild(label);
        }
        input.checked = true;
      });
    });
    form.elements.notes.value = log.notes || "";
    form.elements.medication.value = log.medication || "";
    document.getElementById("saveLogBtn").textContent = "Update Log";
    updateSelections();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function viewLog(id) {
    const log = getLog(id);
    details.hidden = false;
    const author = log.loggedBy || {};
    const edit = CarePulseUI.button("Edit Log");
    edit.dataset.editLog = log.id;
    const remove = CarePulseUI.button("Delete Log");
    remove.dataset.deleteLog = log.id;
    details.replaceChildren(
      element("h3", "", log.date + " · " + log.severity + "/10"),
      element("p", "", "Recorded by " + (author.role || "Unknown") + (author.name ? " · " + author.name : "")),
      element("p", "", "Symptoms: " + log.symptoms.join(", ")),
      element("p", "", "Triggers: " + (log.triggers.join(", ") || "None reported")),
      element("p", "", "Medication note: " + (log.medication || "None")),
      element("p", "observation-note", log.notes || "No notes"), edit, remove
    );
    details.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function refreshDashboard() {
    const logs = CarePulse.patientRecords("logs").sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    const average = logs.length ? (logs.reduce((sum, log) => sum + Number(log.severity), 0) / logs.length).toFixed(1) : "—";
    document.getElementById("logSummary").textContent = `${logs.length} entries · Average severity ${average}/10 · ${logs.filter(log => log.severity >= 7).length} severe entries`;
    const list = document.getElementById("savedLogs");
    list.replaceChildren();
    if (!logs.length) list.appendChild(element("p", "muted", "No symptom entries saved for this patient."));
    logs.forEach(log => {
      const button = CarePulseUI.button("", "saved-log");
      button.dataset.viewLog = log.id;
      button.append(element("strong", "", log.date + " · " + log.severity + "/10"),
        element("span", "", log.symptoms.join(", ")),
        element("small", "", log.loggedBy?.role || "Recorded entry"));
      list.appendChild(button);
    });
  }

  form.addEventListener("change", updateSelections);
  form.addEventListener("submit", event => {
    event.preventDefault();
    CarePulse.run(() => {
      const values = new FormData(form);
      const prior = editingId ? getLog(editingId) : {};
      CarePulse.saveLog({
        ...prior, id: editingId, date: dateInput.value, severity: Number(values.get("severity")),
        symptoms: values.getAll("symptoms").map(value => value === "Custom Symptom" ? customSymptom.value.trim() : value), triggers: values.getAll("triggers"),
        medication: values.get("medication").trim(), notes: values.get("notes").trim()
      });
      resetForm();
      history.replaceState(null, "", CarePulse.cleanPageURL());
      CarePulse.feedback("Log saved.", feedback);
    }, feedback);
  });
  document.getElementById("cancelLogBtn").addEventListener("click", () => {
    resetForm();
    history.replaceState(null, "", CarePulse.cleanPageURL());
    CarePulse.feedback("Unsaved changes discarded.", feedback);
  });
  document.getElementById("newLogBtn").addEventListener("click", () => {
    resetForm();
    history.replaceState(null, "", CarePulse.cleanPageURL());
    CarePulse.feedback("Ready to log another flare.", feedback);
    dateInput.focus();
  });
  document.getElementById("logHistory").addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.viewLog) CarePulse.run(() => viewLog(button.dataset.viewLog), feedback);
    if (button.dataset.editLog) CarePulse.run(() => editLog(button.dataset.editLog), feedback);
    if (button.dataset.deleteLog && await showCustomModal("Delete Log", "Permanently delete this symptom entry?", true)) {
      CarePulse.run(() => {
        CarePulse.deleteLog(button.dataset.deleteLog);
        resetForm();
        history.replaceState(null, "", CarePulse.cleanPageURL());
        CarePulse.feedback("Log deleted.", feedback);
      }, feedback);
    }
  });
  resetForm(params.get("date") || CarePulse.dateISO());
  refreshDashboard();
  if (params.get("id")) CarePulse.run(() => editLog(params.get("id")), feedback);
  CarePulse.onChange(refreshDashboard);
});
