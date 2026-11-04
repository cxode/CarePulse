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