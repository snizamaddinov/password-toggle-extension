// content.js

const TOGGLE_BUTTON_CLASS = 'toggle-password-custom-button';
const PASSWORD_FIELD_SELECTOR = 'input[type="password"], input[type="text"][data-password="true"]';

let extensionEnabled = true;
let showPasswordsByDefault = false;

/**
 * Toggle the password field’s visibility
 */
function togglePasswordVisibility(field, button) {
  if (field.type === 'password') {
    field.type = 'text';
    button.textContent = 'Hide';
  } else {
    field.type = 'password';
    button.textContent = 'Show';
  }
}

/**
 * Remove only the toggle buttons that our extension created
 */
function removeOurToggleButtons() {
  const toggleButtons = document.querySelectorAll(`.${TOGGLE_BUTTON_CLASS}`);
  toggleButtons.forEach((button) => {
    const inputField = button.previousSibling;
    if (inputField && inputField.tagName === 'INPUT') {
      inputField.type = 'password';
      delete inputField.dataset.password; // Remove our marker
    }
    button.remove();
  });
}

/**
 * Add a custom toggle button next to a password field
 */
function addCustomToggleButton(field) {
  // If there’s already a next-sibling button with our custom class, do not duplicate
  if (
    field.nextSibling &&
    field.nextSibling.classList &&
    field.nextSibling.classList.contains(TOGGLE_BUTTON_CLASS)
  ) {
    return;
  }

  // Mark the field so we know it's managed by our extension
  field.dataset.password = 'true';

  // Create the toggle button
  const toggleButton = document.createElement('button');
  // Button text depends on whether we are going to show or hide
  toggleButton.textContent = showPasswordsByDefault ? 'Hide' : 'Show';
  toggleButton.type = 'button';
  toggleButton.classList.add(TOGGLE_BUTTON_CLASS);

  // Click event: toggle visibility
  toggleButton.addEventListener('click', () => {
    togglePasswordVisibility(field, toggleButton);
  });

  // Insert the toggle button after the password field
  field.parentNode.insertBefore(toggleButton, field.nextSibling);

  // If "show passwords by default" is on, wait a short time before revealing.
  // This delay allows 1Password or other password managers to detect/fill the input
  // while it is still type="password."
  if (showPasswordsByDefault) {
    // Only switch to "text" if it’s still "password" after the delay
    setTimeout(() => {
      if (field.type === 'password') {
        field.type = 'text';
        toggleButton.textContent = 'Hide';
      }
    }, 500);
  }
}

function addCustomToggleButtons() {
  const passwordFields = document.querySelectorAll(PASSWORD_FIELD_SELECTOR);
  passwordFields.forEach((field) => {
    addCustomToggleButton(field);
  });
}

/**
 * Remove the custom toggle buttons and restore password fields
 */
function removeCustomToggleButtons() {
  removeOurToggleButtons();
}

/**
 * Inject a CSS file for styling (optional)
 */
function injectStylesheet() {
  if (!document.getElementById('toggle-password-styles')) {
    const styleElement = document.createElement('link');
    styleElement.id = 'toggle-password-styles';
    styleElement.rel = 'stylesheet';
    styleElement.href = chrome.runtime.getURL('content.css');
    document.head.appendChild(styleElement);
  }
}


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

// Watch for DOM changes (new fields, etc.)
const observer = new MutationObserver((mutations) => {
  if (!extensionEnabled) return;

  mutations.forEach((mutation) => {
    // For newly added nodes, check if any are (or contain) password fields
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
          // Check descendants
          const passwordFields = node.querySelectorAll?.(PASSWORD_FIELD_SELECTOR);
          if (passwordFields?.length) {
            passwordFields.forEach((field) => {
              addCustomToggleButton(field);
            });
          }
        }
      }
    });

    // If an input changes type to "password" or "text" with our data attr
    if (
      mutation.type === 'attributes' &&
      mutation.attributeName === 'type' &&
      mutation.target.tagName === 'INPUT'
    ) {
      const input = mutation.target;
      if (
        input.type === 'password' ||
        (input.type === 'text' && input.dataset.password === 'true')
      ) {
        addCustomToggleButton(input);
      }
    }
  });
});

// Begin observing body for changes
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['type'],
});

// Listen for messages from the popup to update our settings
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'update') {
    const wasEnabled = extensionEnabled;
    extensionEnabled = request.extensionEnabled !== false;
    showPasswordsByDefault = request.showPasswordsByDefault === true;

    if (extensionEnabled) {
      addCustomToggleButtons();
    } else {
      removeCustomToggleButtons();
    }
  }
});

init();