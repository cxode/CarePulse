/* =========================================
   CAREPULSE TEMPLATE (Sidebar, Topbar, Logout)
   ========================================= */

// ---- simple fallback variables ----
const FALLBACK_MODE = "";        
const FALLBACK_NEXT = "No appointment set";

// 1) read profile from localStorage (safe)
function readProfile() {
  try {
    return JSON.parse(localStorage.getItem("carepulse:profile")) || {};
  } catch {
    return {};
  }
}

// 2) hydrate the sidebar + topbar
function hydrateShell() {
  const p = readProfile();

  const name = p.name || "—";
  const role = p.role || "—";
  const mode = FALLBACK_MODE || (p.role === "Caregiver"
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

// 3) tiny helper
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// 4) auto-highlight the current nav item
function markActiveNav() {
  const current = location.pathname.split("/").pop() || "calendar.html";
  document.querySelectorAll(".nav-item").forEach(a => {
    if (a.getAttribute("href") === current) a.classList.add("active");
    else a.classList.remove("active");
  });
}

// 5) Page guard — bounce to create-profile if no profile
function requireProfile() {
  const p = readProfile();
  const currentPage = location.pathname.split("/").pop();

  if (!p.name && currentPage !== "create-profile.html") {
    location.replace("../create-profile.html");
  }
}

// 6) Logout logic
function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // 1. Ask for confirmation (optional, but good practice)
      if (confirm("Are you sure you want to log out? Your locally saved data will remain on this device.")) {
        // 2. Remove the active session/profile key
        localStorage.removeItem("carepulse:profile");
        
        // 3. Clear session storage just in case
        sessionStorage.clear();
        
        // 4. Redirect back to login page (adjust path if necessary)
        window.location.href = "../login.html"; 
      }
    });
  }
}

// run on page load
document.addEventListener("DOMContentLoaded", () => {
  requireProfile(); 
  hydrateShell();   
  markActiveNav();
  setupLogout(); // Initialize the logout button
});