CarePulse.onReady(data => {
  document.getElementById("profileStatus").textContent = data.patients.length ? "Choose Patient or Caregiver mode to continue." : "No patient profiles saved on this device.";

  document.querySelectorAll(".access-button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.role === data.role));
    button.addEventListener("click", () => CarePulse.run(() => {
      if (CarePulse.read().patients.length) {
        CarePulse.startSession(button.dataset.role);
        location.href = "pages/dailylog.html";
      } else {
        CarePulse.setRole(button.dataset.role);
        location.href = "create-profile.html";
      }
    }));
  });
}, false);
