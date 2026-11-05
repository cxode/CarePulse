/* =====================================
   CAREPULSE CREATE PROFILE
===================================== */

const PROFILES_KEY = "carepulse:profiles";

// =====================================
// CUSTOM MODAL FUNCTION (For this page)
// =====================================
function showCustomModal(title, message, showCancel = false) {
  return new Promise((resolve) => {
    if (document.querySelector('.cp-modal-overlay')) return; 
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

// GET ELEMENTS
const profileForm = document.getElementById("profileForm");
const caregiverSection = document.getElementById("caregiverSection");
const caregiverNameInput = document.getElementById("caregiverName");
const relationshipInput = document.getElementById("relationship");
const patientNameInput = document.getElementById("patientName");
const birthDateInput = document.getElementById("birthDate");

// GET SELECTED ROLE
let selectedRole = sessionStorage.getItem("carePulseSelectedRole") || "Patient";

// =====================================
// FULL NAME VALIDATION
// =====================================
function isValidFullName(name) {
    const trimmedName = name.trim().replace(/\s+/g, " ");
    const fullNamePattern = /^[\p{L}]+(?:[ .'-][\p{L}]+)*\s+[\p{L}]+(?:[ .'-][\p{L}]+)*$/u;
    return fullNamePattern.test(trimmedName);
}

function validateNameInput(input) {
    const name = input.value.trim();
    if (name === "") { input.setCustomValidity(""); return; }
    if (!isValidFullName(name)) {
        input.setCustomValidity("Please enter a valid full name with at least a first and last name. Numbers and invalid symbols are not allowed.");
    } else {
        input.setCustomValidity("");
    }
}

[patientNameInput, caregiverNameInput].forEach(input => {
    input.addEventListener("input", () => validateNameInput(input));
});

// =====================================
// DYNAMIC UI & CAREGIVER FIELD VISIBILITY
// =====================================
function updateCaregiverFields() {
    if (selectedRole === "Caregiver") {
        // 1. Show the caregiver fields
        caregiverSection.classList.add("visible");
        caregiverNameInput.required = true;
        relationshipInput.required = true;

        // 2. Change the page text to match the Caregiver flow
        document.querySelector(".page-heading h1").textContent = "Create a Caregiver Profile";
        document.querySelector(".form-heading h2").textContent = "Patient & Caregiver Details";
        document.querySelector(".form-heading p").textContent = "Enter the patient's information and your caregiver details below.";
        
    } else {
        // Hide fields for Patient
        caregiverSection.classList.remove("visible");
        caregiverNameInput.required = false;
        relationshipInput.required = false;
        caregiverNameInput.value = "";
        relationshipInput.value = "";
        caregiverNameInput.setCustomValidity("");
    }
}

// =====================================
// DATE VALIDATION
// =====================================
const today = new Date();
const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
birthDateInput.max = localToday;

// =====================================
// FORM SUBMISSION
// =====================================
profileForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const patientName = patientNameInput.value.trim();
    const birthDate = birthDateInput.value;
    const gender = document.getElementById("gender").value;
    const condition = document.getElementById("condition").value.trim();
    const additionalNotes = document.getElementById("additionalNotes").value.trim();
    const caregiverName = caregiverNameInput.value.trim();
    const relationship = relationshipInput.value;

    // VALIDATIONS
    if (!isValidFullName(patientName)) {
        patientNameInput.setCustomValidity("Please enter a valid patient full name.");
        patientNameInput.reportValidity();
        return;
    } else { patientNameInput.setCustomValidity(""); }

    if (selectedRole === "Caregiver") {
        if (!isValidFullName(caregiverName)) {
            caregiverNameInput.setCustomValidity("Please enter a valid caregiver full name.");
            caregiverNameInput.reportValidity();
            return;
        } else { caregiverNameInput.setCustomValidity(""); }
    }

    if (!birthDate || !condition) {
        alert("Please complete all required patient information.");
        return;
    }

    if (birthDate > localToday) {
        alert("Date of birth cannot be in the future.");
        birthDateInput.focus();
        return;
    }

    if (selectedRole === "Caregiver" && !relationship) {
        alert("Please select the caregiver's relationship to the patient.");
        relationshipInput.focus();
        return;
    }

    // CREATE PROFILE OBJECT
    const newProfile = {
        name: patientName.replace(/\s+/g, " "), 
        role: selectedRole,
        birthDate: birthDate,
        gender: gender,
        condition: condition,
        additionalNotes: additionalNotes,
        caregiverName: selectedRole === "Caregiver" ? caregiverName.replace(/\s+/g, " ") : "",
        relationship: selectedRole === "Caregiver" ? relationship : "",
        createdAt: new Date().toISOString()
    };

    // SAVE TO LOCAL STORAGE
    try {
        let allProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY)) || {};
        allProfiles[selectedRole] = newProfile;
        localStorage.setItem(PROFILES_KEY, JSON.stringify(allProfiles));
        
        sessionStorage.setItem("carepulse:loggedIn", "true");
        sessionStorage.setItem("carepulse:activeRole", selectedRole);
        
        showCustomModal(
          "Profile Created", 
          `${selectedRole} profile created successfully! Redirecting...`, 
          false 
        ).then(() => {
          window.location.href = "pages/dailylog.html";
        });

    } catch (error) {
        console.error("Profile saving error:", error);
        alert("Unable to save the profile. Please check your browser storage settings.");
    }
});

// INITIALIZE PAGE
document.addEventListener("DOMContentLoaded", function () {
    updateCaregiverFields();
});