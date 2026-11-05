/* =========================================
   CAREPULSE TEMPLATE
   ========================================= */

const FALLBACK_MODE = "";        
const FALLBACK_NEXT = "No appointment set";

// Read the ACTIVE profile based on who is logged in
function readProfile() {
  try {
    const allProfiles = JSON.parse(localStorage.getItem("carepulse:profiles")) || {};
    const activeRole = sessionStorage.getItem("carepulse:activeRole");
    
    // If we have an active role and a profile for it, return that specific profile
    if (activeRole && allProfiles[activeRole]) {
        return allProfiles[activeRole];
    }
    return {};
  } catch {
    return {};
  }
}

function hydrateShell() {
  const p = readProfile();

  const name = p.name || "—";
  const role = p.role || "—";
  const mode = FALLBACK_MODE || (role === "Caregiver"
                ? "Caregiver recording locally"
                : "Patient recording locally");
                
  const next = p.appointment
             ? `Next: ${new Date(p.appointment).toLocaleString([], {
                 hour: "numeric", minute: "2-digit", weekday: "short"
               })}`
             : FALLBACK_NEXT;

  const initial = name.trim().charAt(0).toUpperCase() || "–";

  setText("userInitial", initial);
  setText("userName",    name);
  setText("userRole",    role === "Caregiver" ? "Managed by Caregiver" : role);
  setText("localModeText", mode);
  setText("nextAppt",    next);
  setText("topInitial",  initial);
  setText("topRole",     role);
  setText("topMode",     mode);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function markActiveNav() {
  const current = location.pathname.split("/").pop() || "calendar.html";
  document.querySelectorAll(".nav-item").forEach(a => {
    if (a.getAttribute("href") === current) a.classList.add("active");
    else a.classList.remove("active");
  });
}

function requireProfile() {
  const isLoggedIn = sessionStorage.getItem("carepulse:loggedIn");
  const activeRole = sessionStorage.getItem("carepulse:activeRole");
  const currentPage = location.pathname.split("/").pop();

  // Guard against missing session
  if ((!isLoggedIn || !activeRole) && currentPage !== "create-profile.html" && currentPage !== "login.html") {
    location.replace("../login.html"); 
  }
}

function showCustomModal(title, message, showCancel = false) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "cp-modal-overlay";
    const box = document.createElement("div");
    box.className = "cp-modal-box";
    const h2 = document.createElement("h2");
    h2.className = "cp-modal-title"; h2.textContent = title;
    const p = document.createElement("p");
    p.className = "cp-modal-message"; p.textContent = message;
    const actions = document.createElement("div");
    actions.className = "cp-modal-actions";

    if (showCancel) {
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "cp-modal-btn cancel"; cancelBtn.textContent = "Cancel";
      cancelBtn.onclick = () => { close(); resolve(false); };
      actions.appendChild(cancelBtn);
    }

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "cp-modal-btn confirm";
    confirmBtn.textContent = showCancel ? "OK" : "Got it";
    confirmBtn.onclick = () => { close(); resolve(true); };
    actions.appendChild(confirmBtn);

    box.appendChild(h2); box.appendChild(p); box.appendChild(actions);
    overlay.appendChild(box); document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add("active"), 10);

    function close() {
      overlay.classList.remove("active");
      setTimeout(() => overlay.remove(), 200);
    }
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const isConfirmed = await showCustomModal(
        "Confirm Logout", 
        "Are you sure you want to log out? Your health data will remain securely saved on this device.", 
        true
      );

      if (isConfirmed) {
        // Clear only the ACTIVE session, leave the saved profiles alone
        sessionStorage.removeItem("carepulse:loggedIn");
        sessionStorage.removeItem("carepulse:activeRole");
        window.location.href = "../login.html"; 
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  requireProfile(); 
  hydrateShell();   
  markActiveNav();
  setupLogout();
});