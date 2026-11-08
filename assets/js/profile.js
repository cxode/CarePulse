CarePulse.onReady(data => {
  const form = document.getElementById("profileForm");
  const patient = CarePulse.activePatient(data);
  const feedback = document.getElementById("profileFeedback");
  const caregiverSection = document.getElementById("caregiverSection");
  const caregiverName = document.getElementById("caregiverName");
  const relationship = document.getElementById("relationship");

  document.getElementById("patientName").value = patient.name || "";
  document.getElementById("birthDate").value = patient.birthDate || "";
  document.getElementById("condition").value = patient.condition || "";
  document.getElementById("additionalNotes").value = patient.additionalNotes || "";
  caregiverName.value = patient.caregiverName || "";
  relationship.value = patient.relationship || "";
  document.getElementById("birthDate").max = CarePulse.dateISO();

  const caregiverMode = data.role === "Caregiver";
  caregiverSection.hidden = !caregiverMode;
  caregiverName.required = caregiverMode;
  relationship.required = caregiverMode;

  ["patientName", "caregiverName"].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      input.setCustomValidity(input.value && !CarePulse.validName(input.value)
        ? "Enter a first and last name."
        : "");
    });
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    CarePulse.run(() => {
      const updatedPatient = {
        ...patient,
        name: CarePulse.normalizeName(document.getElementById("patientName").value),
        birthDate: document.getElementById("birthDate").value,
        condition: document.getElementById("condition").value.trim(),
        additionalNotes: document.getElementById("additionalNotes").value.trim(),
        caregiverName: CarePulse.normalizeName(caregiverName.value),
        relationship: relationship.value,
        updatedAt: new Date().toISOString()
      };

      CarePulse.savePatients([updatedPatient], patient.id);
      location.href = "dailylog.html";
    }, feedback);
  });
});
