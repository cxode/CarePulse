/* =========================================
   CAREPULSE TEMPLATE
   ========================================= */

function hydrateShell() {
  const data = CarePulse.read();
  const active = CarePulse.activePatient(data) || {}; // Safety check
  const patient = { ...active, role: data.role || "—" };
  
  // Safety check for the name to prevent crashes
  const name = patient.name || "—";
  const initial = name !== "—" ? name.charAt(0).toUpperCase() : "–";
  const mode = `${patient.role} recording locally`;

  CarePulseUI.setText("userInitial", initial);
  CarePulseUI.setText("userName", name);
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
        CarePulse.endSession(); // Make sure this ONLY clears the session, not the patients array!
        location.href = "../login.html";
      });
    }
  });
}

CarePulse.onReady(() => {
  hydrateShell();
  markActiveNav();
  setupLogout();
  
  document.querySelector(".btn-flare")?.addEventListener("click", () => {
    location.href = "dailylog.html?new=1";
  });
  
  CarePulse.onChange(hydrateShell);
});
