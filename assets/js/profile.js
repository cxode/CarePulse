CarePulse.onReady(data => {
  const form = document.getElementById("profileForm");
  const patient = CarePulse.activePatient(data);
  const feedback = document.getElementById("profileFeedback");
  const additionalPatients = document.getElementById("additionalPatients");
  let patientNumber = 0;

  ["patientName", "birthDate", "condition", "caregiverName", "relationship"].forEach(field => {
    document.getElementById(field).value = patient[field === "patientName" ? "name" : field] || "";
  });
  document.getElementById("birthDate").max = CarePulse.dateISO();
  document.getElementById("caregiverName").required = data.role === "Caregiver";
  document.getElementById("relationship").required = data.role === "Caregiver";

  function validateName(input) {
    input.setCustomValidity(input.value && !CarePulse.validName(input.value) ? "Enter a first and last name." : "");
  }

  ["patientName", "caregiverName"].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => validateName(input));
  });

  document.getElementById("addPatientBtn").addEventListener("click", () => {
    const fragment = document.getElementById("patientTemplate").content.cloneNode(true);
    const card = fragment.querySelector("[data-patient-card]");
    const fields = ["name", "birth-date", "condition"];
    patientNumber += 1;
    fields.forEach((field, index) => {
      const input = card.querySelector(`[data-patient-${field}]`);
      input.id = `newPatient${patientNumber}-${field}`;
      card.querySelectorAll("label")[index].htmlFor = input.id;
    });
    const nameInput = card.querySelector("[data-patient-name]");
    nameInput.addEventListener("input", () => validateName(nameInput));
    card.querySelector("[data-patient-birth-date]").max = CarePulse.dateISO();
    card.querySelector("[data-remove-patient]").addEventListener("click", () => card.remove());
    additionalPatients.appendChild(fragment);
    nameInput.focus();
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    CarePulse.run(() => {
      const caregiver = {
        caregiverName: CarePulse.normalizeName(document.getElementById("caregiverName").value),
        relationship: document.getElementById("relationship").value
      };
      const updated = {
        ...patient, ...caregiver,
        name: CarePulse.normalizeName(document.getElementById("patientName").value),
        birthDate: document.getElementById("birthDate").value,
        condition: document.getElementById("condition").value.trim(),
        updatedAt: new Date().toISOString()
      };
      const patients = [updated];
      additionalPatients.querySelectorAll("[data-patient-card]").forEach(card => {
        patients.push({
          id: CarePulse.id(), ...caregiver,
          name: CarePulse.normalizeName(card.querySelector("[data-patient-name]").value),
          birthDate: card.querySelector("[data-patient-birth-date]").value,
          condition: card.querySelector("[data-patient-condition]").value.trim(),
          createdAt: new Date().toISOString()
        });
      });
      CarePulse.savePatients(patients, patient.id);
      location.href = "dailylog.html";
    }, feedback);
  });
});
