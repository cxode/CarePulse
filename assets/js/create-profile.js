/* =====================================
   CAREPULSE CREATE PROFILE
===================================== */

// 1. FIXED: Use the exact key that template.js expects
const PROFILE_KEY = "carepulse:profile";

// GET ELEMENTS
const profileForm = document.getElementById("profileForm");
const caregiverSection = document.getElementById("caregiverSection");
const caregiverNameInput = document.getElementById("caregiverName");
const relationshipInput = document.getElementById("relationship");
const patientNameInput = document.getElementById("patientName");
const birthDateInput = document.getElementById("birthDate");

// GET SELECTED ROLE FROM LOGIN PAGE
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
    if (name === "") {
        input.setCustomValidity("");
        return;
    }
    if (!isValidFullName(name)) {
        input.setCustomValidity("Please enter a valid full name with at least a first and last name. Numbers and invalid symbols are not allowed.");
    } else {
        input.setCustomValidity("");
    }
}

// ATTACH NAME VALIDATION
[patientNameInput, caregiverNameInput].forEach(input => {
    input.addEventListener("input", () => {
        validateNameInput(input);
    });
});

// =====================================
// CAREGIVER FIELD VISIBILITY
// =====================================
function updateCaregiverFields() {
    if (selectedRole === "Caregiver") {
        caregiverSection.classList.add("visible");
        caregiverNameInput.required = true;
        relationshipInput.required = true;
    } else {
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

    // GET FORM VALUES
    const patientName = patientNameInput.value.trim();
    const birthDate = birthDateInput.value;
    const gender = document.getElementById("gender").value;
    const condition = document.getElementById("condition").value.trim();
    const additionalNotes = document.getElementById("additionalNotes").value.trim();
    const caregiverName = caregiverNameInput.value.trim();
    const relationship = relationshipInput.value;

    // =====================================
    // VALIDATIONS
    // =====================================
    if (!isValidFullName(patientName)) {
        patientNameInput.setCustomValidity("Please enter a valid patient full name with at least a first and last name.");
        patientNameInput.reportValidity();
        return;
    } else {
        patientNameInput.setCustomValidity("");
    }

    if (selectedRole === "Caregiver") {
        if (!isValidFullName(caregiverName)) {
            caregiverNameInput.setCustomValidity("Please enter a valid caregiver full name with at least a first and last name.");
            caregiverNameInput.reportValidity();
            return;
        } else {
            caregiverNameInput.setCustomValidity("");
        }
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

    // =====================================
    // CREATE PROFILE OBJECT
    // =====================================
    // 2. FIXED: Map the variables to what template.js expects (name, role)
    const patientProfile = {
        name: patientName.replace(/\s+/g, " "), // template.js expects "name"
        role: selectedRole,                     // template.js expects "role"
        
        // Keep the rest of your data intact
        birthDate: birthDate,
        gender: gender,
        condition: condition,
        additionalNotes: additionalNotes,
        caregiverName: selectedRole === "Caregiver" ? caregiverName.replace(/\s+/g, " ") : "",
        relationship: selectedRole === "Caregiver" ? relationship : "",
        createdAt: new Date().toISOString()
    };

    // =====================================
    // SAVE TO LOCAL STORAGE
    // =====================================
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(patientProfile));
        alert("Patient profile created successfully!");
        // GO TO DAILY LOG PAGE
        window.location.href = "pages/dailylog.html";
    } catch (error) {
        console.error("Profile saving error:", error);
        alert("Unable to save the profile. Please check your browser storage settings.");
    }
});

// =====================================
// INITIALIZE PAGE
// =====================================
document.addEventListener("DOMContentLoaded", function () {
    updateCaregiverFields();
});