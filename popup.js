// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const toggleExtension = document.getElementById('toggle-extension');
    const showPasswords = document.getElementById('show-passwords');
  
    // Get the current state from storage
    chrome.storage.sync.get(['extensionEnabled', 'showPasswordsByDefault'], (result) => {
      toggleExtension.checked = result.extensionEnabled !== false;
      showPasswords.checked = result.showPasswordsByDefault !== false;
    });
  
    // Function to update the content script with new settings
    function updateContentScript() {
      const isEnabled = toggleExtension.checked;
      const showByDefault = showPasswords.checked;
  
      // Save settings to storage
      chrome.storage.sync.set({
        extensionEnabled: isEnabled,
        showPasswordsByDefault: showByDefault,
      });
  
      // Send a message to the content script to update the UI
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'update',
            extensionEnabled: isEnabled,
            showPasswordsByDefault: showByDefault,
          });
        }
      });
    }
  
    // Event listeners for checkbox changes
    toggleExtension.addEventListener('change', updateContentScript);
    showPasswords.addEventListener('change', updateContentScript);
  });
  