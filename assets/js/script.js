/* =====================================
   CAREPULSE LOGIN SCRIPT
===================================== */

// We now store an object holding BOTH profiles
const PROFILES_KEY = "carepulse:profiles";

document.addEventListener("DOMContentLoaded", function () {

    const accessButtons = document.querySelectorAll(".access-button");
    const profileStatus = document.getElementById("profileStatus");

    const savedProfilesStr = localStorage.getItem(PROFILES_KEY);
    let savedProfiles = {};

    if (savedProfilesStr) {
        try {
            savedProfiles = JSON.parse(savedProfilesStr);
        } catch (error) {
            savedProfiles = {};
        }
    }

    // Update the status text on the login page
    let statusText = [];
    if (savedProfiles.Patient && savedProfiles.Patient.name) {
        statusText.push("Patient: " + savedProfiles.Patient.name);
    }
    if (savedProfiles.Caregiver && savedProfiles.Caregiver.name) {
        statusText.push("Caregiver: " + savedProfiles.Caregiver.name);
    }

    if (statusText.length > 0) {
        profileStatus.textContent = "Saved profiles — " + statusText.join(" | ");
    } else {
        profileStatus.textContent = "No profiles saved on this device.";
    }

    // Handle Patient and Caregiver access
    accessButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const selectedRole = button.dataset.role; // "Patient" or "Caregiver"

            // Check if a profile exists FOR THIS SPECIFIC ROLE
            if (savedProfiles[selectedRole] && savedProfiles[selectedRole].name) {
                // Profile exists! Log them in.
                sessionStorage.setItem("carepulse:loggedIn", "true");
                sessionStorage.setItem("carepulse:activeRole", selectedRole); // Remember who is active
                window.location.href = "pages/dailylog.html";
            } else {
                // No profile for this role. Send to setup.
                sessionStorage.setItem("carePulseSelectedRole", selectedRole);
                window.location.href = "create-profile.html";
            }
        });
    });
});