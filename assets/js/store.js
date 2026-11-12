/* Shared browser storage and domain rules. Page scripts only handle their own UI. */
const CarePulse = (() => {
  const STORAGE_KEY = "carepulse:data";
  const roles = ["Patient", "Caregiver"];

  function dateISO(date = new Date()) {
    return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function parseDate(value) {
    return new Date(`${value}T00:00:00`);
  }

  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && dateISO(parseDate(value)) === value;
  }

  function datesBetween(start, end) {
    if (!validDate(start) || !validDate(end)) throw new Error("Choose valid start and end dates.");
    const dates = [];
    for (const date = parseDate(start); dateISO(date) <= end; date.setDate(date.getDate() + 1)) {
      dates.push(dateISO(date));
    }
    return dates;
  }

  function period(days) {
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    return { start: dateISO(start), end: dateISO() };
  }

  function readJSON(key, fallback) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  }

  function id() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function normalizeName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function validName(value) {
    return /^[\p{L}]+(?:[ .'-][\p{L}]+)*\s+[\p{L}]+(?:[ .'-][\p{L}]+)*$/u.test(normalizeName(value));
  }

  function validateProfile(profile, role) {
    const notesValue = typeof profile.additionalNotes === "string" ? profile.additionalNotes : typeof profile.notes === "string" ? profile.notes : "";
    if (profile.additionalNotes == null && profile.notes != null) profile.additionalNotes = profile.notes;
    if (profile.notes == null && profile.additionalNotes != null) profile.notes = profile.additionalNotes;
    profile.additionalNotes = String(profile.additionalNotes ?? profile.notes ?? "").trim();
    profile.notes = profile.additionalNotes;
    if (!validName(profile.name)) throw new Error("Enter the patient's first and last name.");
    if (!validDate(profile.birthDate) || profile.birthDate > dateISO()) throw new Error("Enter a valid date of birth that is not in the future.");
    if (!profile.condition.trim()) throw new Error("Enter a diagnosed condition.");
    if (profile.caregiverName && !validName(profile.caregiverName)) throw new Error("Enter the caregiver's first and last name.");
    if ((role === "Caregiver" || profile.caregiverName) && (!profile.caregiverName || !profile.relationship)) {
      throw new Error("Enter the caregiver's name and relationship.");
    }
    if (typeof notesValue !== "string") throw new Error("Patient notes must be saved as text.");
  }

  function severityBand(severity) {
    if (severity == null) return { key: "empty", label: "No log" };
    if (severity < 4) return { key: "mild", label: "Mild" };
    if (severity < 7) return { key: "mod", label: "Moderate" };
    return { key: "sev", label: "Severe / Acute Flare" };
  }

  function migrateLegacyData() {
    const profiles = readJSON("carepulse:profiles", {});
    const single = readJSON("carepulse:profile", {});
    const oldLogs = readJSON("carepulse:logs", {});
    const oldMeds = readJSON("carepulse:medications", []);
    const data = { version: 1, patients: [], logs: [], medications: [], intakes: [], activePatientId: "", role: "Patient", loggedIn: false };
    const sourceProfiles = Object.values(profiles);
    if (single.name) sourceProfiles.push(single);
    sourceProfiles.forEach(profile => {
      const patients = profile.patients?.length ? profile.patients : [profile];
      patients.forEach(patient => {
        if (!patient.name) return;
        const existing = data.patients.find(p => p.name === patient.name && p.birthDate === patient.birthDate);
        if (existing) {
          if (profile.caregiverName) Object.assign(existing, { caregiverName: profile.caregiverName, relationship: profile.relationship });
        } else {
          data.patients.push({ ...profile, ...patient, patients: undefined, id: id() });
        }
      });
    });
    const legacyLogs = Array.isArray(oldLogs) ? oldLogs : Object.entries(oldLogs).map(([date, log]) => ({ ...log, date }));
    let owner = data.patients.length === 1 ? data.patients[0] : null;
    if (!owner && (legacyLogs.length || oldMeds.length)) {
      owner = { id: id(), name: "Recovered Records", birthDate: "", condition: "Update this profile to identify the owner of these older records." };
      data.patients.push(owner);
    }
    data.logs = legacyLogs.map(log => ({
      ...log, id: id(), patientId: owner.id, severity: Number(log.severity),
      symptoms: log.symptoms || [], triggers: log.triggers || [],
      notes: log.notes || "", medication: typeof log.medication === "string" ? log.medication : ""
    }));
    data.medications = oldMeds.map(med => ({
      ...med, id: med.id || id(), patientId: owner.id,
      startDate: med.startDate || dateISO(),
      changes: [{ date: med.startDate || dateISO(), dosage: med.dosage || "", frequency: 1, schedule: med.schedule || "Daily" }]
    }));
    data.activePatientId = data.patients[0]?.id || "";
    try {
      const oldRole = sessionStorage.getItem("carepulse:activeRole");
      if (roles.includes(oldRole)) data.role = oldRole;
    } catch { /* Some browsers disable session storage for local files. */ }
    return data;
  }

  function validateData(data) {
    const record = value => value && typeof value === "object" && !Array.isArray(value);
    const textList = value => Array.isArray(value) && value.every(item => typeof item === "string");
    const identity = value => record(value) && typeof value.id === "string" && value.id.length > 0;
    const invalid = () => { throw new Error("Saved CarePulse data has an invalid format. Export it from Data & Privacy before clearing it."); };
    if (!record(data) || data.version !== 1 || !roles.includes(data.role) ||
      !["patients", "logs", "medications", "intakes"].every(key => Array.isArray(data[key]))) invalid();
    for (const key of ["patients", "logs", "medications"]) {
      if (!data[key].every(identity) || new Set(data[key].map(item => item.id)).size !== data[key].length) invalid();
    }
    
    // FIXED: Enforce that every patient must have a valid role saved on them
    if (!data.patients.every(patient => typeof patient.name === "string" && patient.name.trim() && roles.includes(patient.role))) invalid();

    const patientExists = item => data.patients.some(patient => patient.id === item.patientId);
    if (!data.logs.every(log => patientExists(log) && validDate(log.date) && Number.isInteger(log.severity) &&
      log.severity >= 1 && log.severity <= 10 && textList(log.symptoms) && textList(log.triggers) &&
      (!log.loggedBy || (record(log.loggedBy) && typeof log.loggedBy.role === "string")))) invalid();
    if (!data.medications.every(med => patientExists(med) && typeof med.name === "string" && validDate(med.startDate) &&
      (!med.endDate || validDate(med.endDate)) && Array.isArray(med.changes) && med.changes.length &&
      med.changes.every(change => record(change) && validDate(change.date) && Number.isInteger(change.frequency) && change.frequency >= 1 && change.frequency <= 4))) invalid();
    if (!data.intakes.every(intake => record(intake) && patientExists(intake) && validDate(intake.date) &&
      Number.isInteger(intake.dose) && intake.dose >= 0 && data.medications.some(med => med.id === intake.medicationId && med.patientId === intake.patientId))) invalid();
  }

  function read() {
    const raw = localStorage.getItem(STORAGE_KEY);
    let data;
    try { data = raw === null ? migrateLegacyData() : JSON.parse(raw); }
    catch { throw new Error("Saved CarePulse data could not be read. Use Data & Privacy to export it before clearing it."); }
    validateData(data);
    if (raw === null && (data.patients.length || data.logs.length || data.medications.length)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    return data;
  }

  function update(change) {
    const data = read();
    change(data);
    validateData(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event("carepulse:change"));
  }

  function activePatient(data = read()) {
    return data.patients.find(patient => patient.id === data.activePatientId);
  }

  function selectPatient(patientId) {
    update(data => {
      if (!data.patients.some(patient => patient.id === patientId)) throw new Error("Select a saved patient.");
      data.activePatientId = patientId;
    });
  }

  function setRole(role) {
    if (!roles.includes(role)) throw new Error("Select Patient or Caregiver mode.");
    update(data => { data.role = role; });
  }

  function startSession(role) {
    if (!roles.includes(role)) throw new Error("Select Patient or Caregiver mode.");
    update(data => {
      // FIXED: Find a patient that matches the requested role, NOT just the first one.
      const patient = data.patients.find(p => p.role === role);
      if (!patient) throw new Error(`No ${role} profile found. Please create one.`);
      data.activePatientId = patient.id;
      data.role = role;
      data.loggedIn = true;
    });
  }

  function endSession() {
    // This safely flips the flag without deleting the profiles array.
    update(data => { data.loggedIn = false; });
  }

  function clearLocalData() {
    const localKeys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith("carepulse:")) localKeys.push(key);
    }
    localKeys.forEach(key => localStorage.removeItem(key));

    const sessionKeys = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (key && key.startsWith("carepulse:")) sessionKeys.push(key);
    }
    sessionKeys.forEach(key => sessionStorage.removeItem(key));
    sessionStorage.removeItem("carePulseSelectedRole");
  }

  function patientRecords(key, data = read()) {
    return data[key].filter(record => record.patientId === data.activePatientId);
  }

  function savePatients(patients, activeId) {
    update(data => {
      patients.forEach(patient => {
        // FIXED: Ensure the role is saved inside the patient object
        patient.role = patient.role || data.role;
        validateProfile(patient, data.role);
        const index = data.patients.findIndex(item => item.id === patient.id);
        if (index < 0) data.patients.push(patient);
        else data.patients[index] = patient;
      });
      data.activePatientId = activeId || patients[0].id;
      data.loggedIn = true;
    });
  }

  function saveLog(log) {
    update(data => {
      const patient = activePatient(data);
      if (!patient) throw new Error("Select a patient first.");
      if (!validDate(log.date) || log.date > dateISO() || (patient.birthDate && log.date < patient.birthDate)) throw new Error("Choose a log date between the patient's birth date and today.");
      if (!Number.isInteger(log.severity) || log.severity < 1 || log.severity > 10) throw new Error("Select a severity from 1 to 10.");
      if (!Array.isArray(log.symptoms) || !log.symptoms.length || log.symptoms.some(value => typeof value !== "string" || !value.trim())) throw new Error("Select at least one symptom and describe any custom symptom.");
      if (!Array.isArray(log.triggers || []) || (log.triggers || []).some(value => typeof value !== "string")) throw new Error("Choose valid triggers.");
      const index = data.logs.findIndex(item => item.id === log.id && item.patientId === patient.id);
      if (log.id && index < 0) throw new Error("This log is no longer available for this patient.");
      const record = {
        ...log, id: log.id || id(), patientId: patient.id,
        symptoms: [...new Set(log.symptoms.map(value => value.trim()))], triggers: [...new Set(log.triggers || [])],
        notes: String(log.notes || ""), medication: String(log.medication || ""),
        loggedBy: { role: data.role, name: data.role === "Caregiver" ? patient.caregiverName || "" : patient.name },
        updatedAt: new Date().toISOString()
      };
      if (index < 0) data.logs.push(record);
      else data.logs[index] = record;
    });
  }

  function deleteLog(logId) {
    update(data => { data.logs = data.logs.filter(log => log.id !== logId || log.patientId !== data.activePatientId); });
  }

  function scheduleOn(medication, date) {
    if (date < medication.startDate || (medication.endDate && date >= medication.endDate)) return null;
    return [...medication.changes].reverse().find(change => change.date <= date) || null;
  }

  function saveMedication(medication) {
    update(data => {
      if (!activePatient(data)) throw new Error("Select a patient first.");
      if (!medication.name.trim() || !medication.dosage.trim()) throw new Error("Enter a medication name and dosage.");
      if (!Number.isInteger(medication.frequency) || medication.frequency < 1 || medication.frequency > 4) throw new Error("Select one to four doses per day.");
      if (!validDate(medication.startDate)) throw new Error("Select a medication start date.");
      const existing = data.medications.find(med => med.id === medication.id && med.patientId === data.activePatientId);
      const change = { date: existing ? dateISO() : medication.startDate, dosage: medication.dosage.trim(), frequency: medication.frequency, schedule: medication.schedule.trim() };
      if (existing) {
        if (existing.endDate) throw new Error("This medication regimen has ended. Add a new regimen to restart it.");
        const prior = scheduleOn(existing, dateISO());
        const hasIntake = data.intakes.some(intake => intake.medicationId === existing.id && intake.date === dateISO());
        if (hasIntake && prior && (prior.frequency !== change.frequency || prior.dosage !== change.dosage)) {
          throw new Error("Unmark today's doses before changing the dosage or frequency.");
        }
        existing.name = medication.name.trim();
        change.date = existing.startDate > dateISO() ? existing.startDate : dateISO();
        existing.changes = existing.changes.filter(item => item.date < change.date).concat(change);
      } else {
        if (medication.id) throw new Error("This medication is no longer available.");
        data.medications.push({ id: id(), patientId: data.activePatientId, name: medication.name.trim(), startDate: medication.startDate, changes: [change] });
      }
    });
  }

  function deleteMedication(medicationId) {
    update(data => {
      const med = patientRecords("medications", data).find(item => item.id === medicationId);
      if (med && !med.endDate) {
        const end = new Date();
        if (data.intakes.some(intake => intake.medicationId === med.id && intake.date === dateISO())) end.setDate(end.getDate() + 1);
        med.endDate = dateISO(end);
      }
    });
  }

  function markTaken(medicationId, date, dose, taken) {
    update(data => {
      const med = patientRecords("medications", data).find(item => item.id === medicationId);
      const schedule = med && scheduleOn(med, date);
      if (!validDate(date) || date > dateISO() || !schedule || !Number.isInteger(dose) || dose < 0 || dose >= schedule.frequency) throw new Error("This dose cannot be recorded for the selected date.");
      data.intakes = data.intakes.filter(item => !(item.medicationId === medicationId && item.date === date && item.dose === dose));
      if (taken) data.intakes.push({ patientId: data.activePatientId, medicationId, date, dose });
    });
  }

  function cleanPageURL() {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    return url.href;
  }

  function feedback(message, target = document.getElementById("appFeedback"), state = "success") {
    if (!target) {
      target = document.createElement("p");
      target.id = "appFeedback";
      target.setAttribute("role", "status");
      target.setAttribute("aria-live", "polite");
      (document.querySelector("main") || document.body).prepend(target);
    }
    target.textContent = message;
    target.dataset.state = state;
  }

  function run(action, target) {
    try { return action(); }
    catch (error) { feedback(error.message, target, "error"); }
  }

  function onReady(action, needsPatient = true) {
    document.addEventListener("DOMContentLoaded", () => {
      try {
        const data = read();
        if (needsPatient && (!activePatient(data) || data.loggedIn !== true)) {
          location.replace("../login.html");
          return;
        }
        action(data);
      } catch (error) {
        feedback(error.message, undefined, "error");
        if (!document.getElementById("recoverDataLink") && !location.pathname.endsWith("datapriv.html")) {
          const link = document.createElement("a");
          link.id = "recoverDataLink";
          link.textContent = "Open Data & Privacy to export or clear saved data";
          link.href = needsPatient ? "datapriv.html" : "pages/datapriv.html";
          document.getElementById("appFeedback").append(document.createElement("br"), link);
        }
      }
    });
  }

  function onChange(action) {
    window.addEventListener("carepulse:change", () => run(action));
  }

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY || event.key === null) location.reload();
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) location.reload();
  });

  
  return { read, update, id, dateISO, parseDate, validDate, datesBetween, period, normalizeName, validName, validateProfile, severityBand, activePatient, selectPatient, setRole, startSession, endSession, clearLocalData, patientRecords, savePatients, saveLog, deleteLog, scheduleOn, saveMedication, deleteMedication, markTaken, cleanPageURL, feedback, run, onReady, onChange };
})();
