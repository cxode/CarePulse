function loadDoctorReport() {
  const range = CarePulse.period(Number(document.getElementById("reportPeriod").value));
  const report = CarePulseInsights.summarize(range.start, range.end);
  const patient = report.patient;
  const element = CarePulseUI.element;
  const setText = CarePulseUI.setText;
  setText("reportGenerated", "Generated " + new Date().toLocaleString());
  setText("reportPatient", patient.name);
  setText("reportBirthDate", "Date of birth: " + (patient.birthDate || "Not provided"));
  setText("reportCondition", patient.condition || "No conditions listed");
  setText("reportDates", range.start + " to " + range.end);
  setText("reportTotal", report.logs.length);
  setText("reportAverage", report.average === null ? "—" : report.average.toFixed(1) + "/10");
  setText("reportSevere", report.severeDates.length);
  setText("reportAdherence", report.adherence.percent === null ? "—" : report.adherence.percent + "%");
  setText("reportDoseCount", report.adherence.taken + "/" + report.adherence.expected + " scheduled doses taken");
  const history = document.getElementById("reportHistory");
  history.replaceChildren();
  report.logs.forEach(log => {
    const row = document.createElement("tr");
    const author = log.loggedBy || {};
    [log.date, log.severity + "/10", log.symptoms.join(", "),
      (author.role || "Unknown") + (author.name ? " · " + author.name : "")]
      .forEach(value => row.appendChild(element("td", "", value)));
    history.appendChild(row);
  });
  if (!report.logs.length) {
    const row = document.createElement("tr");
    const cell = element("td", "empty", "No symptom entries in this period.");
    cell.colSpan = 4;
    row.appendChild(cell);
    history.appendChild(row);
  }
  renderReportList("reportTriggers", report.triggers.map(item => item.name + ": " + item.count + " entries"), "No triggers reported.");
  renderReportList("reportSevereDates", report.severeDates, "No severe flare-ups recorded.");
  const notes = document.getElementById("reportNotes");
  notes.replaceChildren();
  report.logs.filter(log => log.notes || log.medication).forEach(log => {
    const note = element("div", "report-observation");
    note.appendChild(element("strong", "", log.date + " · " + (log.loggedBy?.role || "Recorded entry")));
    if (log.notes) note.appendChild(element("p", "observation-note", log.notes));
    if (log.medication) note.appendChild(element("p", "", "Medication note: " + log.medication));
    notes.appendChild(note);
  });
  if (!notes.childElementCount) notes.appendChild(element("p", "empty", "No notes recorded."));
}

function renderReportList(id, items, emptyMessage) {
  const container = document.getElementById(id);
  container.replaceChildren();
  if (!items.length) {
    container.appendChild(CarePulseUI.element("p", "empty", emptyMessage));
    return;
  }
  const list = document.createElement("ul");
  items.forEach(item => list.appendChild(CarePulseUI.element("li", "", item)));
  container.appendChild(list);
}

CarePulse.onReady(() => {
  loadDoctorReport();
  document.getElementById("reportPeriod").addEventListener("change", () => CarePulse.run(loadDoctorReport));
  document.getElementById("printReportBtn").addEventListener("click", () => CarePulse.run(() => {
    loadDoctorReport();
    window.print();
  }));
  CarePulse.onChange(loadDoctorReport);
});
