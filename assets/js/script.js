CarePulse.onReady(data => {
  // 1. Update status text to accurately reflect which profiles are saved
  let statusText = "No profiles saved on this device.";
  
  if (data.patients && data.patients.length > 0) {
      const hasPatient = data.patients.some(p => p.role === "Patient");
      const hasCaregiver = data.patients.some(p => p.role === "Caregiver");
      
      if (hasPatient && hasCaregiver) {
          statusText = "Saved Profiles: Patient & Caregiver";
      } else if (hasPatient) {
          statusText = "Saved Profile: Patient only";
      } else if (hasCaregiver) {
          statusText = "Saved Profile: Caregiver only";
      }
  }
  
  document.getElementById("profileStatus").textContent = statusText;

  // 2. Handle Patient and Caregiver button clicks
  document.querySelectorAll(".access-button").forEach(button => {
    // Accessibility state
    button.setAttribute("aria-pressed", String(button.dataset.role === data.role));
    
    button.addEventListener("click", () => CarePulse.run(() => {
      const roleToAccess = button.dataset.role; // "Patient" or "Caregiver"
      const allProfiles = CarePulse.read().patients || []; // Safe fallback if empty
      
      // 3. Check if a profile specifically for THIS role exists
      const profileExists = allProfiles.some(profile => profile.role === roleToAccess);

      if (profileExists) {
        // Profile matches the button clicked -> Log them in!
        CarePulse.startSession(roleToAccess);
        location.href = "pages/dailylog.html";
      } else {
        // No profile for this specific role -> Send them to create one
        CarePulse.setRole(roleToAccess);
        location.href = "create-profile.html";
      }
    }));
  });
}, false);