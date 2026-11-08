const PROFILE_STORE_KEY = "carepulse:profiles";
const ACTIVE_ROLE_KEY = "carepulse:activeRole";
let additionalPatientId = 0;

function readSavedProfiles() {
  const raw = localStorage.getItem(PROFILE_STORE_KEY);
  if (!raw) return {};
  const profiles = JSON.parse(raw);
  if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) {
    throw new Error("Saved profile data has an invalid format.");
  }
  return profiles;
}

function normalizeFullName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidFullName(value) {
  return /^[\p{L}]+(?:[ .'-][\p{L}]+)*\s+[\p{L}]+(?:[ .'-][\p{L}]+)*$/u.test(normalizeFullName(value));
}

function setProfileFeedback(message, state) {
  const feedback = document.getElementById("profileFeedback");
  feedback.textContent = message;
  if (state) feedback.dataset.state = state;
  else delete feedback.dataset.state;
}

function makePatientCard(patient = {}) {
  const fragment = document.getElementById("patientTemplate").content.cloneNode(true);
  const card = fragment.querySelector("[data-patient-card]");
  const nameInput = card.querySelector("[data-patient-name]");
  const birthInput = card.querySelector("[data-patient-birth-date]");
  const conditionInput = card.querySelector("[data-patient-condition]");
  const patientNumber = ++additionalPatientId;
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  nameInput.id = `additionalPatientName${patientNumber}`;
  card.querySelector("label").htmlFor = nameInput.id;
  birthInput.id = `additionalPatientBirthDate${patientNumber}`;
  card.querySelectorAll("label")[1].htmlFor = birthInput.id;
  conditionInput.id = `additionalPatientCondition${patientNumber}`;
  card.querySelectorAll("label")[2].htmlFor = conditionInput.id;
  nameInput.name = "additionalPatientName";
  birthInput.name = "additionalPatientBirthDate";
  birthInput.max = localToday;
  conditionInput.name = "additionalPatientCondition";
  nameInput.value = patient.name || "";
  birthInput.value = patient.birthDate || "";
  conditionInput.value = patient.condition || "";
  card.querySelector("[data-remove-patient]").addEventListener("click", () => card.remove());
  return fragment;
}

function fillProfileForm(profile) {
  document.getElementById("patientName").value = profile.name || "";
  document.getElementById("birthDate").value = profile.birthDate || "";
  document.getElementById("condition").value = profile.condition || "";
  document.getElementById("caregiverName").value = profile.caregiverName || "";
  document.getElementById("relationship").value = profile.relationship || "";

  const patients = Array.isArray(profile.patients) ? profile.patients : [];
  patients.slice(1).forEach((patient) => {
    document.getElementById("additionalPatients").appendChild(makePatientCard(patient));
  });
}

function collectPatients() {
  const patients = [{
    name: normalizeFullName(document.getElementById("patientName").value),
    birthDate: document.getElementById("birthDate").value,
    condition: document.getElementById("condition").value.trim()
  }];

  document.querySelectorAll("[data-patient-card]").forEach((card) => {
    patients.push({
      name: normalizeFullName(card.querySelector("[data-patient-name]").value),
      birthDate: card.querySelector("[data-patient-birth-date]").value,
      condition: card.querySelector("[data-patient-condition]").value.trim()
    });
  });
  return patients;
}

function validatePatients(patients) {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  for (const patient of patients) {
    if (!isValidFullName(patient.name)) {
      setProfileFeedback("Enter each patient's first and last name using letters only.", "error");
      return false;
    }
    if (!patient.birthDate || patient.birthDate > localToday) {
      setProfileFeedback("Enter a valid date of birth for each patient.", "error");
      return false;
    }
    if (!patient.condition) {
      setProfileFeedback("Enter at least one diagnosed condition for each patient.", "error");
      return false;
    }
  }
  return true;
}

function saveProfile(event) {
  event.preventDefault();
  setProfileFeedback("");

  const patients = collectPatients();
  if (!validatePatients(patients)) return;

  const caregiverNameValue = document.getElementById("caregiverName").value.trim();
  if (caregiverNameValue && !isValidFullName(caregiverNameValue)) {
    setProfileFeedback("Enter the caregiver's first and last name.", "error");
    document.getElementById("caregiverName").focus();
    return;
  }

  try {
    const role = sessionStorage.getItem(ACTIVE_ROLE_KEY) || "Patient";
    const existing = readSavedProfiles();
    const priorProfile = existing[role] && typeof existing[role] === "object" ? existing[role] : {};
    const primaryPatient = patients[0];
    const profile = {
      ...priorProfile,
      ...primaryPatient,
      role,
      caregiverName: caregiverNameValue,
      relationship: document.getElementById("relationship").value,
      patients,
      updatedAt: new Date().toISOString()
    };

    existing[role] = profile;
    localStorage.setItem(PROFILE_STORE_KEY, JSON.stringify(existing));
    sessionStorage.setItem("carepulse:loggedIn", "true");
    sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
    window.location.href = "dailylog.html";
  } catch (error) {
    console.error("Could not save CarePulse profile.", error);
    setProfileFeedback("The profile could not be saved. Check browser storage permissions and try again.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profileForm");
  const birthDateInput = document.getElementById("birthDate");
  const today = new Date();
  birthDateInput.max = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  try {
    const role = sessionStorage.getItem(ACTIVE_ROLE_KEY) || "Patient";
    const profiles = readSavedProfiles();
    const profile = profiles[role];
    if (profile && typeof profile === "object") fillProfileForm(profile);
  } catch (error) {
    console.error("Could not load CarePulse profile.", error);
    setProfileFeedback("Saved profile data could not be read. Export your data before replacing it.", "error");
  }

  form.addEventListener("submit", saveProfile);
});
