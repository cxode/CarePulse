CarePulse.onReady(data => {
  const form = document.getElementById("profileForm");
  const caregiverMode = data.role === "Caregiver";
  const caregiverName = document.getElementById("caregiverName");
  const relationship = document.getElementById("relationship");
  document.getElementById("birthDate").max = CarePulse.dateISO();
  document.getElementById("caregiverSection").classList.toggle("visible", caregiverMode);
  caregiverName.required = caregiverMode;
  relationship.required = caregiverMode;
  if (caregiverMode) document.querySelector(".page-heading h1").textContent = "Create a Patient & Caregiver Profile";
  ["patientName", "caregiverName"].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => input.setCustomValidity(input.value && !CarePulse.validName(input.value) ? "Enter a first and last name." : ""));
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    CarePulse.run(() => {
      const patient = {
        id: CarePulse.id(), name: CarePulse.normalizeName(document.getElementById("patientName").value),
        birthDate: document.getElementById("birthDate").value,
        gender: document.getElementById("gender").value,
        condition: document.getElementById("condition").value.trim(),
        additionalNotes: document.getElementById("additionalNotes").value.trim(),
        caregiverName: CarePulse.normalizeName(caregiverName.value), relationship: relationship.value,
        createdAt: new Date().toISOString()
      };
      CarePulse.savePatients([patient]);
      location.href = "pages/dailylog.html";
    });
  });
}, false);
