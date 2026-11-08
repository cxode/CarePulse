/* Analytics uses the same summaries as the doctor report. */
function processAnalytics() {
  const days = Number(document.getElementById("analyticsRange").value);
  const range = CarePulse.period(days);
  const summary = CarePulseInsights.summarize(range.start, range.end);
  const logs = summary.logs;
  document.getElementById("summaryBannerText").textContent = `${logs.length} symptom entries · ${summary.severeDates.length} severe flare-up days · ${range.start} to ${range.end}`;
  document.getElementById("avgSeverity").textContent = summary.average === null ? "—" : summary.average.toFixed(1);
  document.getElementById("avgSeverityLabel").textContent = summary.average === null ? "No data" : CarePulse.severityBand(summary.average).label;
  document.getElementById("daysPeriodLabel").textContent = days;
  document.getElementById("severeDays").textContent = summary.severeDates.length;
  const loggedDays = new Set(logs.map(log => log.date)).size;
  document.getElementById("severePercent").textContent = `${loggedDays ? Math.round(summary.severeDates.length / loggedDays * 100) : 0}% of logged days`;
  document.getElementById("medAdherence").textContent = `${summary.adherence.taken}/${summary.adherence.expected}`;
  document.getElementById("medAdherenceLabel").textContent = summary.adherence.percent === null ? "No scheduled doses" : `${summary.adherence.percent}% completed`;
  const trigger = summary.triggers[0];
  document.getElementById("topTrigger").textContent = trigger?.name || "—";
  document.getElementById("topTriggerSub").textContent = trigger ? `Reported ${trigger.count} times` : "No trigger data";
  renderSeverityTrend(logs);
  renderFrequencyChart("symptomsChartArea", summary.symptoms, logs.length);
  renderFrequencyChart("triggerChartArea", summary.triggers, logs.length);
  const notes = document.getElementById("notesChartArea");
  notes.classList.remove("empty-state");
  notes.replaceChildren();
  summary.observations.forEach(group => {
    const section = CarePulseUI.element("section", "observation-group");
    section.appendChild(CarePulseUI.element("strong", "", group.role + ": " + group.logs.length + " entries"));
    const entries = group.logs.filter(log => log.notes);
    entries.forEach(log => {
      const note = CarePulseUI.element("p", "observation-note");
      note.append(CarePulseUI.element("small", "", log.date), document.createElement("br"), document.createTextNode(log.notes));
      section.appendChild(note);
    });
    if (!entries.length) section.appendChild(CarePulseUI.element("p", "muted small", "No notes recorded."));
    notes.appendChild(section);
  });
}

// SVG elements require their namespace; HTML uses document.createElement.
function chartElement(tag, attributes, text) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderSeverityTrend(logs) {
  const area = document.getElementById("severityChartArea");
  area.replaceChildren();
  area.classList.toggle("empty-state", !logs.length);
  if (!logs.length) {
    area.appendChild(CarePulseUI.element("p", "muted", "No severity data in this period."));
    return;
  }
  const byDate = new Map();
  logs.forEach(log => {
    if (!byDate.has(log.date)) byDate.set(log.date, []);
    byDate.get(log.date).push(log.severity);
  });
  const days = [...byDate].map(([date, values]) => ({ date, severity: values.reduce((sum, value) => sum + value, 0) / values.length }));
  const dates = CarePulse.datesBetween(days[0].date, days.at(-1).date);
  const svg = chartElement("svg", {
    role: "img", "aria-label": "Daily average severity from " + days[0].date + " to " + days.at(-1).date,
    class: "trend-chart-svg", viewBox: "0 0 400 200"
  });
  svg.append(chartElement("line", { x1: 30, y1: 170, x2: 370, y2: 170, stroke: "#e5e7eb" }),
    chartElement("line", { x1: 30, y1: 30, x2: 30, y2: 170, stroke: "#e5e7eb" }),
    chartElement("text", { x: 5, y: 34, class: "chart-axis-label" }, "10"),
    chartElement("text", { x: 5, y: 174, class: "chart-axis-label" }, "1"));
  const points = days.map(day => ({
    ...day, x: dates.length === 1 ? 200 : 30 + dates.indexOf(day.date) * 340 / (dates.length - 1),
    y: 170 - (day.severity - 1) * 140 / 9
  }));
  svg.appendChild(chartElement("polyline", {
    points: points.map(point => point.x + "," + point.y).join(" "), fill: "none", stroke: "#cbd5e1", "stroke-width": 2
  }));
  points.forEach(point => {
    const dot = chartElement("circle", { cx: point.x, cy: point.y, r: 4, fill: point.severity >= 7 ? "#ef4444" : "#0f766e" });
    dot.appendChild(chartElement("title", {}, point.date + ": " + point.severity.toFixed(1) + "/10"));
    svg.appendChild(dot);
  });
  svg.appendChild(chartElement("text", { x: days.length === 1 ? 200 : 30, y: 196, "text-anchor": days.length === 1 ? "middle" : "start", class: "chart-axis-label" }, days[0].date));
  if (days.length > 1) svg.appendChild(chartElement("text", { x: 370, y: 196, "text-anchor": "end", class: "chart-axis-label" }, days.at(-1).date));
  area.appendChild(svg);
}

function renderFrequencyChart(id, frequencies, total) {
  const area = document.getElementById(id);
  area.replaceChildren();
  area.classList.toggle("empty-state", !frequencies.length);
  if (!frequencies.length) area.appendChild(CarePulseUI.element("p", "muted", "No records in this period."));
  frequencies.forEach(item => {
    const percent = Math.round(item.count / total * 100);
    const row = CarePulseUI.element("div", "symptom-bar-row");
    const label = CarePulseUI.element("div", "symptom-label-row");
    label.append(CarePulseUI.element("span", "", item.name),
      CarePulseUI.element("span", "", percent + "% (" + item.count + "/" + total + ")"));
    const track = CarePulseUI.element("div", "bar-track");
    const fill = CarePulseUI.element("div", "bar-fill");
    fill.style.width = percent + "%";
    track.appendChild(fill);
    row.append(label, track);
    area.appendChild(row);
  });
}

CarePulse.onReady(() => {
  processAnalytics();
  document.getElementById("analyticsRange").addEventListener("change", () => CarePulse.run(processAnalytics));
  CarePulse.onChange(processAnalytics);
});
