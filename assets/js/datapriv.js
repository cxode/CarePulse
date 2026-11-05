const CAREPULSE_STORAGE_PREFIX = "carepulse:";

function getCarePulseData() {
  const data = {};
  const keys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(CAREPULSE_STORAGE_PREFIX)) keys.push(key);
  }

  keys.sort().forEach((key) => {
    const rawValue = localStorage.getItem(key);
    try {
      data[key] = rawValue === null ? null : JSON.parse(rawValue);
    } catch {
      data[key] = rawValue;
    }
  });

  return data;
}

function setControlFeedback(message, state) {
  const feedback = document.getElementById("controlFeedback");
  feedback.textContent = message;
  feedback.dataset.state = state;
}

function exportLocalData() {
  try {
    const backup = {
      application: "CarePulse",
      exportedAt: new Date().toISOString(),
      storage: getCarePulseData()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carepulse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setControlFeedback("Your CarePulse data backup has been downloaded.", "success");
  } catch (error) {
    console.error("Could not export CarePulse data.", error);
    setControlFeedback("The data backup could not be created. Check browser storage permissions and try again.", "error");
  }
}

async function clearLocalData() {
  const confirmed = await showCustomModal(
    "Clear all local data?",
    "This permanently removes all CarePulse data saved in this browser, including profiles, symptom logs and medication records. This cannot be undone. Export a backup first if you may need these records.",
    true
  );
  if (!confirmed) return;

  const button = document.getElementById("clearDataBtn");
  button.disabled = true;
  try {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(CAREPULSE_STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    const sessionKeys = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (key && key.startsWith(CAREPULSE_STORAGE_PREFIX)) sessionKeys.push(key);
    }
    sessionKeys.forEach((key) => sessionStorage.removeItem(key));
    setControlFeedback("All CarePulse data has been removed from this browser.", "success");
    await showCustomModal(
      "Data cleared",
      "All CarePulse data has been removed from this browser. You have been signed out.",
      false
    );
    window.location.replace("../login.html");
  } catch (error) {
    console.error("Could not clear CarePulse data.", error);
    setControlFeedback("Some data could not be removed. Check browser storage permissions and try again.", "error");
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("exportDataBtn").addEventListener("click", exportLocalData);
  document.getElementById("clearDataBtn").addEventListener("click", clearLocalData);
});
