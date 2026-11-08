/* =========================================
   CAREPULSE TEMPLATE
   ========================================= */

function hydrateShell() {
  const data = CarePulse.read();
  const patient = { ...CarePulse.activePatient(data), role: data.role };
  const initial = patient.name.charAt(0).toUpperCase();
  const mode = `${patient.role} recording locally`;
  CarePulseUI.setText("userInitial", initial);
  CarePulseUI.setText("userName", patient.name);
  CarePulseUI.setText("userRole", patient.role === "Caregiver" ? "Managed by Caregiver" : patient.role);
  CarePulseUI.setText("localModeText", mode);
  CarePulseUI.setText("nextAppt", patient.appointment
    ? `Next: ${new Date(patient.appointment).toLocaleString([], { hour: "numeric", minute: "2-digit", weekday: "short" })}`
    : "No appointment set");
  CarePulseUI.setText("topInitial", initial);
  CarePulseUI.setText("topRole", patient.role);
  CarePulseUI.setText("topMode", mode);
}

function markActiveNav() {
  const current = location.pathname.split("/").pop();
  document.querySelectorAll(".nav-item").forEach(link => link.classList.toggle("active", link.getAttribute("href") === current));
}

let pendingModal = null;

function showCustomModal(title, message, showCancel = false) {
  if (pendingModal) return pendingModal;
  pendingModal = new Promise(resolve => {
    const dialog = document.createElement("dialog");
    dialog.className = "cp-modal-overlay";
    dialog.setAttribute("aria-label", title);
    const box = CarePulseUI.element("div", "cp-modal-box");
    const actions = CarePulseUI.element("div", "cp-modal-actions");
    if (showCancel) {
      const cancel = CarePulseUI.button("Cancel", "cp-modal-btn cancel");
      cancel.addEventListener("click", () => dialog.close("cancel"));
      actions.appendChild(cancel);
    }
    const confirm = CarePulseUI.button(showCancel ? "OK" : "Got it", "cp-modal-btn confirm");
    confirm.addEventListener("click", () => dialog.close("confirm"));
    actions.appendChild(confirm);
    box.append(CarePulseUI.element("h2", "cp-modal-title", title),
      CarePulseUI.element("p", "cp-modal-message", message), actions);
    dialog.appendChild(box);
    document.body.appendChild(dialog);
    dialog.addEventListener("close", () => {
      const accepted = dialog.returnValue === "confirm";
      dialog.remove();
      pendingModal = null;
      resolve(accepted);
    }, { once: true });
    dialog.showModal();
  });
  return pendingModal;
}

function setupLogout() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    if (await showCustomModal("Return to Welcome", "Your records will stay in this browser. Return to the welcome screen?", true)) {
      CarePulse.run(() => {
        CarePulse.endSession();
        location.href = "../login.html";
      });
    }
  });
}

CarePulse.onReady(data => {
  hydrateShell();
  markActiveNav();
  setupLogout();
  const controls = document.createElement("div");
  controls.className = "patient-controls";
  const patientLabel = CarePulseUI.element("label", "", "Active patient");
  patientLabel.htmlFor = "activePatient";
  const patientSelect = document.createElement("select");
  patientSelect.id = "activePatient";
  data.patients.forEach(patient => {
    const option = CarePulseUI.element("option", "", patient.name);
    option.value = patient.id;
    patientSelect.appendChild(option);
  });
  const roleLabel = CarePulseUI.element("label", "", "Recording mode");
  roleLabel.htmlFor = "activeMode";
  const roleSelect = document.createElement("select");
  roleSelect.id = "activeMode";
  ["Patient", "Caregiver"].forEach(role => roleSelect.appendChild(CarePulseUI.element("option", "", role)));
  controls.append(patientLabel, patientSelect, roleLabel, roleSelect);
  document.querySelector(".local-mode").before(controls);
  patientSelect.value = data.activePatientId;
  roleSelect.value = data.role;
  patientSelect.addEventListener("change", () => CarePulse.run(() => {
    CarePulse.selectPatient(patientSelect.value);
    // Remove log IDs and dates from the previous patient context.
    location.href = CarePulse.cleanPageURL();
  }));
  roleSelect.addEventListener("change", () => CarePulse.run(() => {
    CarePulse.setRole(roleSelect.value);
    location.reload();
  }));
  document.querySelector(".btn-flare")?.addEventListener("click", () => {
    location.href = "dailylog.html?new=1";
  });
  CarePulse.onChange(hydrateShell);
});
