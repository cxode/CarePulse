CarePulse.onReady(data => {
  const form = document.getElementById("profileForm");
  const patient = CarePulse.activePatient(data);
  const feedback = document.getElementById("profileFeedback");
  const caregiverSection = document.getElementById("caregiverSection");
  const caregiverName = document.getElementById("caregiverName");
  const relationship = document.getElementById("relationship");
  const caregiverSectionTag = document.getElementById("caregiverSectionTag");

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
      if (caregiverMode) {
        CarePulse.feedback("Patient profile and caregiver information updated.", feedback);
      } else {
        location.href = "dailylog.html";
      }
    }, feedback);
  });

  const deleteAccountButton = document.getElementById("deleteAccountBtn");
  deleteAccountButton.addEventListener("click", async () => {
    const confirmed = await showCustomModal(
      "Delete your account?",
      "This permanently removes all CarePulse profiles, symptom logs and medication records saved in this browser, for both Patient and Caregiver modes. This cannot be undone. Export a backup from Data & Privacy first if you may need these records.",
      true
    );
    if (!confirmed) return;

    deleteAccountButton.disabled = true;
    try {
      CarePulse.clearLocalData();
      location.replace("../login.html");
    } catch (error) {
      console.error("Could not delete the CarePulse account.", error);
      CarePulse.feedback("Account deletion failed. Check browser storage permissions and try again.", feedback, "error");
      deleteAccountButton.disabled = false;
    }
  });
});
