/* =========================================================
   CarePulse — Analytics & Trends
   ========================================================= */

const STORE_LOGS = "carepulse:logs";
const STORE_MEDS = "carepulse:medications";
const STORE_PROFILE = "carepulse:profile";
const LOOKBACK_DAYS = 30;

function safeParse(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function getPastNDates(n) {
  const dates = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]); // YYYY-MM-DD
  }
  return dates; // Returns newest to oldest
}

function processAnalytics() {
  const logsRaw = safeParse(localStorage.getItem(STORE_LOGS), {});
  const meds = safeParse(localStorage.getItem(STORE_MEDS), []);
  const past30 = getPastNDates(LOOKBACK_DAYS);
  
  // Collect logs within timeframe
  const activeLogs = past30.map(date => {
    if (logsRaw[date]) return { date, ...logsRaw[date] };
    return null;
  }).filter(Boolean);

  const totalLogged = activeLogs.length;

  // --- 1. Handover Summary ---
  const totalSymptomLogs = activeLogs.reduce((sum, log) => sum + (log.symptoms?.length || 0), 0);
  const severeLogs = activeLogs.filter(log => log.severity >= 7);
  const severeCount = severeLogs.length;
  
  document.getElementById("summaryBannerText").textContent = 
    totalLogged === 0 
      ? "No symptom logs recorded in the last 30 days." 
      : `${totalSymptomLogs} symptom log${totalSymptomLogs !== 1 ? 's' : ''} in selected period — ${severeCount} severe flare-up${severeCount !== 1 ? 's' : ''}.`;

  // --- 2. KPIs ---
  // Avg Severity
  const avgSeverityEl = document.getElementById("avgSeverity");
  const avgLabelEl = document.getElementById("avgSeverityLabel");
  if (totalLogged > 0) {
    const avg = activeLogs.reduce((sum, log) => sum + (log.severity || 0), 0) / totalLogged;
    avgSeverityEl.textContent = avg.toFixed(1);
    if (avg <= 3)      avgLabelEl.textContent = "Mild Interference";
    else if (avg <= 6) avgLabelEl.textContent = "Moderate Interference";
    else               avgLabelEl.textContent = "Severe Interference";
  } else {
    avgSeverityEl.textContent = "0.0";
    avgLabelEl.textContent = "No data";
  }

  // Severe Days
  document.getElementById("daysPeriodLabel").textContent = LOOKBACK_DAYS;
  document.getElementById("severeDays").textContent = severeCount;
  document.getElementById("severePercent").textContent = 
    totalLogged > 0 ? `${Math.round((severeCount / totalLogged) * 100)}% of logs` : "0% of logs";

  // Med Adherence
  const adherenceEl = document.getElementById("medAdherence");
  const adherenceSub = document.getElementById("medAdherenceLabel");
  if (totalLogged > 0 && meds.length > 0) {
    let taken = 0;
    let expected = totalLogged * meds.length;
    activeLogs.forEach(log => {
      if (Array.isArray(log.medications)) {
        taken += log.medications.filter(m => m.taken).length;
      }
    });
    adherenceEl.textContent = `${taken}/${expected}`;
    adherenceSub.textContent = `${Math.round((taken / expected) * 100)}% completed`;
  } else {
    adherenceEl.textContent = "--";
    adherenceSub.textContent = meds.length === 0 ? "No medications setup" : "Awaiting schedule";
  }

  // Top Trigger
  const triggerCounts = {};
  activeLogs.forEach(log => {
    if (Array.isArray(log.triggers)) {
      log.triggers.forEach(t => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; });
    }
  });
  const topTrigger = Object.keys(triggerCounts).sort((a,b) => triggerCounts[b] - triggerCounts[a])[0];
  if (topTrigger) {
    document.getElementById("topTrigger").textContent = topTrigger;
    document.getElementById("topTriggerSub").textContent = `Reported ${triggerCounts[topTrigger]} times`;
  } else {
    document.getElementById("topTrigger").textContent = "--";
    document.getElementById("topTriggerSub").textContent = "No trigger data";
  }

  // --- 3. Charts ---
  renderSeverityTrend(activeLogs);
  renderSymptomsChart(activeLogs, totalLogged);
}

function renderSeverityTrend(logs) {
  const area = document.getElementById("severityChartArea");
  if (logs.length === 0) {
    area.innerHTML = `
      <div class="empty-content">
        <span class="empty-icon">∿</span>
        <strong>Awaiting records</strong>
        <span class="muted small">No severity data yet.</span>
      </div>`;
    area.classList.add("empty-state");
    return;
  }
  
  area.classList.remove("empty-state");
  
  // Reverse logs so it's oldest to newest
  const sortedLogs = [...logs].reverse();
  
  // Create a basic SVG line chart
  const width = 400;
  const height = 200;
  const padding = 30;
  
  const xStep = (width - padding * 2) / Math.max(sortedLogs.length - 1, 1);
  const yStep = (height - padding * 2) / 9; // 1 to 10 scale

  let points = "";
  let circles = "";
  
  sortedLogs.forEach((log, i) => {
    const x = padding + (i * xStep);
    // Y is inverted (0 is top)
    const y = height - padding - ((log.severity - 1) * yStep);
    points += `${x},${y} `;
    const color = log.severity >= 7 ? "#ef4444" : "#0f766e";
    circles += `<circle cx="${x}" cy="${y}" r="4" fill="${color}" />`;
  });

  const svg = `
    <svg class="trend-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="#e5e7eb" stroke-width="1" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height-padding}" stroke="#e5e7eb" stroke-width="1" />
      
      <text x="5" y="${padding+4}" class="chart-axis-label">10</text>
      <text x="5" y="${height-padding+4}" class="chart-axis-label">1</text>
      
      <polyline points="${points.trim()}" fill="none" stroke="#cbd5e1" stroke-width="2" />
      
      ${circles}
    </svg>
  `;
  
  area.innerHTML = svg;
}

function renderSymptomsChart(logs, totalLogged) {
  const area = document.getElementById("symptomsChartArea");
  
  const symptomCounts = {};
  logs.forEach(log => {
    if (Array.isArray(log.symptoms)) {
      log.symptoms.forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
    }
  });

  const sortedSymptoms = Object.keys(symptomCounts)
    .map(name => ({ name, count: symptomCounts[name] }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 5); // top 5

  if (sortedSymptoms.length === 0) {
    area.innerHTML = `
      <div class="empty-content">
        <span class="empty-icon">▤</span>
        <strong>Awaiting records</strong>
        <span class="muted small">No symptoms logged yet.</span>
      </div>`;
    area.classList.add("empty-state");
    return;
  }

  area.classList.remove("empty-state");
  area.innerHTML = "";

  sortedSymptoms.forEach(sym => {
    const pct = Math.round((sym.count / totalLogged) * 100);
    area.innerHTML += `
      <div class="symptom-bar-row">
        <div class="symptom-label-row">
          <span class="symptom-name">${escapeHtml(sym.name)}</span>
          <span class="symptom-count">${pct}% (${sym.count}/${totalLogged})</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  processAnalytics();

  // --- Dynamic Observation Title based on Role ---
  const profile = safeParse(localStorage.getItem(STORE_PROFILE), {});
  // Default to "Patient" if no role exists, and make case-insensitive
  const userRole = (profile.role || "Patient").toLowerCase(); 
  
  const obsTitleEl = document.getElementById("obsTitle");
  if (obsTitleEl) {
    if (userRole === "patient") {
      obsTitleEl.textContent = "Patient Observations";
    } else {
      obsTitleEl.textContent = "Patient & Caregiver Observations";
    }
  }
});