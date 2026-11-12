CarePulse.onReady(data => {
  const form = document.getElementById("profileForm");
  const caregiverMode = data.role === "Caregiver";
  const caregiverName = document.getElementById("caregiverName");
  const relationship = document.getElementById("relationship");
  const caregiverSection = document.getElementById("caregiverSection");
  const title = document.querySelector(".page-heading h1");
  const roleHeading = document.querySelector(".form-heading h2");

  if (title) {
    title.textContent = caregiverMode ? "Create a Patient & Caregiver Profile" : "Create a Patient Profile";
  }
  if (roleHeading) {
    roleHeading.textContent = caregiverMode ? "Patient & Caregiver Details" : "Patient Details";
  }

  document.getElementById("birthDate").max = CarePulse.dateISO();
  caregiverSection.classList.toggle("visible", caregiverMode);
  caregiverSection.hidden = !caregiverMode;
  caregiverName.required = caregiverMode;
  relationship.required = caregiverMode;

  const optionalTag = caregiverSection.querySelector(".optional-tag");
  if (optionalTag) {
    optionalTag.textContent = caregiverMode ? "REQUIRED" : "OPTIONAL";
  }

  ["patientName", "caregiverName"].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener("input", () => {
      input.setCustomValidity("");
      if (input.value && !CarePulse.validName(input.value)) {
        input.setCustomValidity("Enter a first and last name.");
      }
    });
  });

  form.addEventListener("submit", event => {
    event.preventDefault();

    CarePulse.run(() => {
      const notes = document.getElementById("additionalNotes").value.trim();
      const patient = {
        id: CarePulse.id(),
        role: data.role,
        name: CarePulse.normalizeName(document.getElementById("patientName").value),
        birthDate: document.getElementById("birthDate").value,
        gender: document.getElementById("gender")?.value || "",
        condition: document.getElementById("condition").value.trim(),
        additionalNotes: notes,
        notes,
        caregiverName: caregiverMode ? CarePulse.normalizeName(caregiverName.value) : "",
        relationship: caregiverMode ? relationship.value : "",
        createdAt: new Date().toISOString()
      };

      CarePulse.validateProfile(patient, data.role);
      CarePulse.savePatients([patient]);
      location.href = "pages/dailylog.html";
    });
  });
}, false);