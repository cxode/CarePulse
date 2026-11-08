/* Calculations shared by analytics and the printable doctor report. */
const CarePulseInsights = (() => {
  function frequency(logs, field) {
    const counts = new Map();
    logs.forEach(log => new Set(log[field] || []).forEach(name => counts.set(name, (counts.get(name) || 0) + 1)));
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  function adherence(data, start, end) {
    let expected = 0;
    let taken = 0;
    const dates = CarePulse.datesBetween(start, end > CarePulse.dateISO() ? CarePulse.dateISO() : end);
    const medications = CarePulse.patientRecords("medications", data);
    const intakes = CarePulse.patientRecords("intakes", data);
    dates.forEach(date => medications.forEach(med => {
      const schedule = CarePulse.scheduleOn(med, date);
      if (!schedule) return;
      expected += schedule.frequency;
      for (let dose = 0; dose < schedule.frequency; dose += 1) {
        if (intakes.some(item => item.medicationId === med.id && item.date === date && item.dose === dose)) taken += 1;
      }
    }));
    return { taken, expected, percent: expected ? Math.round(taken / expected * 100) : null };
  }

  function summarize(start, end) {
    const data = CarePulse.read();
    const logs = CarePulse.patientRecords("logs", data).filter(log => log.date >= start && log.date <= end).sort((a, b) => a.date.localeCompare(b.date));
    const severeDates = [...new Set(logs.filter(log => log.severity >= 7).map(log => log.date))];
    return {
      patient: CarePulse.activePatient(data), start, end, logs, severeDates,
      average: logs.length ? logs.reduce((sum, log) => sum + Number(log.severity), 0) / logs.length : null,
      triggers: frequency(logs, "triggers"), symptoms: frequency(logs, "symptoms"),
      adherence: adherence(data, start, end),
      observations: ["Patient", "Caregiver"].map(role => ({ role, logs: logs.filter(log => log.loggedBy?.role?.toLowerCase() === role.toLowerCase()) }))
    };
  }

  return { frequency, adherence, summarize };
})();
