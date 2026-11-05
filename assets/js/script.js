document.addEventListener("DOMContentLoaded", function () {

    const PROFILE_KEY = "carePulsePatientProfile";

    const accessButtons = document.querySelectorAll(".access-button");
    const profileStatus = document.getElementById("profileStatus");

    // Check if a patient profile exists
    const savedProfile = localStorage.getItem(PROFILE_KEY);

    if (savedProfile) {
        try {
            const profile = JSON.parse(savedProfile);

            if (profile && profile.patientName) {
                profileStatus.textContent =
                    "Patient profile saved: " + profile.patientName;
            } else {
                profileStatus.textContent =
                    "No patient profiles saved on this device.";
            }

        } catch (error) {
            profileStatus.textContent =
                "No patient profiles saved on this device.";
        }

    } else {
        profileStatus.textContent =
            "No patient profiles saved on this device.";
    }


    // Handle Patient and Caregiver access
    accessButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const selectedRole = button.dataset.role;

            // Save selected role
            sessionStorage.setItem(
                "carePulseSelectedRole",
                selectedRole
            );

            // Check if a profile exists
            const profile = localStorage.getItem(PROFILE_KEY);

            if (!profile) {

                // Redirect to profile creation
                window.location.href = "create-profile.html";

            } else {

                // Redirect to the daily log
                window.location.href = "pages/dailylog.html";

            }

        });

    });

});
// Example of what your submit button should do:
document.getElementById("your-form-id").addEventListener("submit", function(e) {
  e.preventDefault(); // Stop page reload

  // 1. Get the values from your inputs (change these IDs to match your HTML)
  const userNameInput = document.getElementById("name").value;
  const userRoleInput = document.getElementById("role").value; // e.g., "Patient" or "Caregiver"

  // 2. Create the data object
  const profileData = {
    name: userNameInput,
    role: userRoleInput
  };

  // 3. Save it to localStorage with the correct key
  localStorage.setItem("carepulse:profile", JSON.stringify(profileData));

  // 4. Redirect to the main page
  window.location.href = "pages/dailylog.html"; 
});