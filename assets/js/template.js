/* =========================================================
   CarePulse shared shell — no predefined user.
   Everything comes from localStorage, with simple fallbacks.
   ========================================================= */

// ---- simple fallback variables (edit if you want) ----
const FALLBACK_NAME = "";
const FALLBACK_ROLE = "";
const FALLBACK_MODE = "";        // e.g. "Caregiver recording locally"
const FALLBACK_NEXT = "No appointment set";
// -----------------------------------------------------

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

  const name = p.name || FALLBACK_NAME || "—";
  const role = p.role || FALLBACK_ROLE || "—";
  const mode = FALLBACK_MODE
            || (p.role === "Caregiver"
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
  setText("userRole",    role);
  setText("localModeText", mode);
  setText("nextAppt",    next);
  setText("topInitial",  initial);
  setText("topRole",     role);
  setText("topMode",     mode);
}

// 3) tiny helper — keeps callers short
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// 4) auto-highlight the current nav item
function markActiveNav() {
  const current = location.pathname.split("/").pop() || "calendar.html";
  document.querySelectorAll(".nav-item").forEach(a => {
    if (a.getAttribute("href") === current) a.classList.add("active");
  });
}

// 5) simple page guard — bounce to create-profile if no profile
function requireProfile() {
  const p = readProfile();
  if (!p.name) location.replace("../create-profile.html");
}

// run
document.addEventListener("DOMContentLoaded", () => {
  hydrateShell();
  markActiveNav();
  // requireProfile();   // uncomment when you want the guard active
});