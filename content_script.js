;(function() {
  const host = window.location.host;

  // 1) On your dev site, pick up the postMessage and save it:
  if (host === "localhost:3000") {
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const msg = event.data || {};
      if (msg.source === "civicecho" && msg.type === "CIVICECHO_SAVE") {
        chrome.storage.local.set({ civicechoData: msg.payload }, () => {
          console.log("CivicEcho data saved:", msg.payload);
        });
      }
    });
    return; // stop here on localhost pages
  }

  // 2) On any rep site, autofill using stored data:
  if (host.endsWith(".house.gov") || host.endsWith(".senate.gov")) {
    chrome.storage.local.get("civicechoData", ({ civicechoData }) => {
      if (!civicechoData) return;

      // Example for Morgan Griffith's form — you'll need to adapt selectors per site!
      const { userName, street, city, state, zipCode, emailOutput } = civicechoData;

      // Fill “Your Name”
      const nameInput = document.querySelector('input[name="your-name"], input[name="name"], input#name');
      if (nameInput) nameInput.value = userName;

      // Fill Address fields if present
      const streetInput = document.querySelector('input[name="street-address"]');
      if (streetInput) streetInput.value = street;
      const cityInput = document.querySelector('input[name="city"]');
      if (cityInput) cityInput.value = city;
      const stateInput = document.querySelector('input[name="state"]');
      if (stateInput) stateInput.value = state;
      const zipInput = document.querySelector('input[name="zip"]');
      if (zipInput) zipInput.value = zipCode;

      // Fill message textarea
      const msgArea = document.querySelector('textarea[name="comments"], textarea[name="message"], textarea#message');
      if (msgArea) msgArea.value = emailOutput;

      console.log("CivicEcho autofill complete");
    });
  }
})();
