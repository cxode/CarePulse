CarePulse.onReady(data => {
  const form = document.getElementById("profileForm");
  const caregiverMode = data.role === "Caregiver";
  const caregiverName = document.getElementById("caregiverName");
  const relationship = document.getElementById("relationship");
  
  // Set the maximum date to today (HTML5 constraint)
  document.getElementById("birthDate").max = CarePulse.dateISO();
  
  // Toggle Caregiver section visibility and HTML5 `required` attributes
  document.getElementById("caregiverSection").classList.toggle("visible", caregiverMode);
  caregiverName.required = caregiverMode;
  relationship.required = caregiverMode;
  
  // Change the header text if in Caregiver mode
  if (caregiverMode) {
    document.querySelector(".page-heading h1").textContent = "Create a Patient & Caregiver Profile";
  }

  // JS Input Validation: Only check format (Regex), not emptiness.
  // The HTML `required` attribute handles empty submissions.
  ["patientName", "caregiverName"].forEach(id => {
    const input = document.getElementById(id);
    
    input.addEventListener("input", () => {
      // If the field has text AND doesn't match the name format, show custom error
      if (input.value && !CarePulse.validName(input.value)) {
        input.setCustomValidity("Enter a valid first and last name (letters only, no numbers).");
      } else {
        // If it's valid (or empty), clear the error so the form can submit
        input.setCustomValidity("");
      }
    });
  });

  // Form Submission
  form.addEventListener("submit", event => {
    event.preventDefault(); 
    
    // Note: We don't check for empty fields here because the browser's 
    // native `required` attribute already blocked the submission if they were empty.

    CarePulse.run(() => {
      const patient = {
        id: CarePulse.id(), 
        name: CarePulse.normalizeName(document.getElementById("patientName").value),
        birthDate: document.getElementById("birthDate").value,
        gender: document.getElementById("gender").value,
        condition: document.getElementById("condition").value.trim(),
        additionalNotes: document.getElementById("additionalNotes").value.trim(),
        caregiverName: CarePulse.normalizeName(caregiverName.value), 
        relationship: relationship.value,
        createdAt: new Date().toISOString()
      };
      
      CarePulse.savePatients([patient]);
      location.href = "pages/dailylog.html";
    });
  });
}, false);