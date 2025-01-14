// content.js

// Constants for class names and selectors
const TOGGLE_BUTTON_CLASS = 'toggle-password-custom-button';
const PASSWORD_FIELD_SELECTOR = 'input[type="password"], input[type="text"][data-password="true"]';

// Variables to store extension settings
let extensionEnabled = true;
let showPasswordsByDefault = false;

// Function to toggle password visibility
function togglePasswordVisibility(field, button) {
  if (field.type === 'password') {
    field.type = 'text';
    button.textContent = 'Hide';
  } else {
    field.type = 'password';
    button.textContent = 'Show';
  }
}

// Function to remove existing toggle-password buttons
function removeExistingToggleButtons() {
  const existingButtons = document.querySelectorAll('.toggle-password');
  existingButtons.forEach((button) => {
    button.remove();
  });
}

// Function to add a custom toggle button to a password field
function addCustomToggleButton(field) {
  // Check if our custom toggle button already exists
  if (
    field.nextSibling &&
    field.nextSibling.classList &&
    field.nextSibling.classList.contains(TOGGLE_BUTTON_CLASS)
  ) {
    return;
  }

  // Remove existing toggle-password buttons added by the website
  removeExistingToggleButtons();

  // Set password visibility based on the setting
  field.type = showPasswordsByDefault ? 'text' : 'password';

  // Mark the field to identify that it's being managed by the extension
  field.dataset.password = 'true';

  // Create the toggle button
  const toggleButton = document.createElement('button');
  toggleButton.textContent = showPasswordsByDefault ? 'Hide' : 'Show';
  toggleButton.type = 'button';
  toggleButton.classList.add(TOGGLE_BUTTON_CLASS);

  // Event listener to toggle password visibility
  toggleButton.addEventListener('click', () => {
    togglePasswordVisibility(field, toggleButton);
  });

  // Insert the toggle button after the password field
  field.parentNode.insertBefore(toggleButton, field.nextSibling);
}

// Function to add custom toggle buttons to all password fields
function addCustomToggleButtons() {
  const passwordFields = document.querySelectorAll(PASSWORD_FIELD_SELECTOR);

  passwordFields.forEach((field) => {
    addCustomToggleButton(field);
  });
}

// Function to remove custom toggle buttons
function removeCustomToggleButtons() {
  const toggleButtons = document.querySelectorAll(`.${TOGGLE_BUTTON_CLASS}`);
  toggleButtons.forEach((button) => {
    const inputField = button.previousSibling;
    if (inputField && inputField.tagName === 'INPUT') {
      inputField.type = 'password';
      delete inputField.dataset.password; // Remove the custom data attribute
    }
    button.remove();
  });
}

function injectStylesheet() {
  if (!document.getElementById('toggle-password-styles')) {
    const styleElement = document.createElement('link');
    styleElement.id = 'toggle-password-styles';
    styleElement.rel = 'stylesheet';
    styleElement.href = chrome.runtime.getURL('content.css');
    document.head.appendChild(styleElement);
  }
}

// Initialize the extension based on the stored settings
function init() {
  injectStylesheet();
  chrome.storage.sync.get(['extensionEnabled', 'showPasswordsByDefault'], (result) => {
    extensionEnabled = result.extensionEnabled !== false; // Default to true
    showPasswordsByDefault = result.showPasswordsByDefault === true; // Default to false

    if (extensionEnabled) {
      addCustomToggleButtons();
    } else {
      removeCustomToggleButtons();
    }
  });
}

// Observe DOM changes to handle dynamically added password fields
const observer = new MutationObserver((mutations) => {
  if (!extensionEnabled) {
    return;
  }

  mutations.forEach((mutation) => {
    // Handle added nodes
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches && node.matches('input')) {
          if (
            node.type === 'password' ||
            (node.type === 'text' && node.dataset.password === 'true')
          ) {
            addCustomToggleButton(node);
          }
        } else {
          const passwordFields = node.querySelectorAll(PASSWORD_FIELD_SELECTOR);
          if (passwordFields.length > 0) {
            passwordFields.forEach((field) => {
              addCustomToggleButton(field);
            });
          }
        }
      }
    });

    // Handle attribute changes (e.g., type changes to 'password')
    if (
      mutation.type === 'attributes' &&
      mutation.attributeName === 'type' &&
      mutation.target.tagName === 'INPUT'
    ) {
      if (
        mutation.target.type === 'password' ||
        (mutation.target.type === 'text' && mutation.target.dataset.password === 'true')
      ) {
        addCustomToggleButton(mutation.target);
      }
    }
  });
});

// Start observing the document body for changes
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['type'],
});

// Listen for messages from the popup to update settings
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'update') {
    const previousEnabledState = extensionEnabled;

    extensionEnabled = request.extensionEnabled !== false;
    showPasswordsByDefault = request.showPasswordsByDefault === true;

    if (extensionEnabled) {
      addCustomToggleButtons();
    } else {
      removeCustomToggleButtons();
    }
  }
});

// Run the initialization
init();
