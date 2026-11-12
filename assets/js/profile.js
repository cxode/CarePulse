CarePulse.onReady(data => {
  const form = document.getElementById("profileForm");
  const patient = CarePulse.activePatient(data);
  const feedback = document.getElementById("profileFeedback");
  const caregiverSection = document.getElementById("caregiverSection");
  const caregiverName = document.getElementById("caregiverName");
  const relationship = document.getElementById("relationship");
  const caregiverSectionTag = document.getElementById("caregiverSectionTag");

  const savedNotes = patient.notes ?? patient.additionalNotes ?? "";
  document.getElementById("patientName").value = patient.name || "";
  document.getElementById("birthDate").value = patient.birthDate || "";
  document.getElementById("condition").value = patient.condition || "";
  document.getElementById("additionalNotes").value = savedNotes;
  caregiverName.value = patient.caregiverName || "";
  relationship.value = patient.relationship || "";
  document.getElementById("birthDate").max = CarePulse.dateISO();

  const caregiverMode = data.role === "Caregiver";
  caregiverSection.classList.toggle("visible", caregiverMode);
  caregiverSection.hidden = !caregiverMode;
  caregiverName.required = caregiverMode;
  relationship.required = caregiverMode;
  caregiverSectionTag.textContent = caregiverMode ? "Required for caregiver mode" : "Optional local mode";
  document.getElementById("saveProfileLabel").textContent = caregiverMode
    ? "Update Caregiver Information"
    : "Save Profile & Start Logging";

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
      const notes = document.getElementById("additionalNotes").value.trim();
      const updatedPatient = {
        ...patient,
        name: CarePulse.normalizeName(document.getElementById("patientName").value),
        birthDate: document.getElementById("birthDate").value,
        condition: document.getElementById("condition").value.trim(),
        additionalNotes: notes,
        notes,
        caregiverName: CarePulse.normalizeName(caregiverName.value),
        relationship: relationship.value,
        updatedAt: new Date().toISOString()
      };

      CarePulse.validateProfile(updatedPatient, data.role);
      CarePulse.savePatients([updatedPatient], patient.id);
      if (caregiverMode) {
        CarePulse.feedback("Patient profile and caregiver information updated.", feedback);
      } else {
        location.href = "dailylog.html";
      }
    }, feedback);
  });

  const deleteAccountButton = document.getElementById("deleteAccountBtn");
  deleteAccountButton.addEventListener("click", async () => {
    const isCaregiver = data.role === "Caregiver";
    const confirmed = await showCustomModal(
      isCaregiver ? "Delete caregiver account?" : "Delete patient account?",
      isCaregiver
        ? "This removes only the caregiver profile currently in use. The patient profile and its records stay saved on this device."
        : "This removes only the patient profile currently in use. Any caregiver profile and other saved records stay on this device.",
      true
    );
    if (!confirmed) return;

    deleteAccountButton.disabled = true;
    try {
      CarePulse.deleteCurrentRoleProfile();
      location.replace("../login.html");
    } catch (error) {
      console.error("Could not delete the current CarePulse profile.", error);
      CarePulse.feedback("Profile deletion failed. Check browser storage permissions and try again.", feedback, "error");
      deleteAccountButton.disabled = false;
    }
  });
});
