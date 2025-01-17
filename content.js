const TOGGLE_BUTTON_CLASS = 'toggle-password-custom-button'
const PASSWORD_FIELD_SELECTOR = 'input[type="password"], input[type="text"][data-password="true"]'

let extensionEnabled = true
let showPasswordsByDefault = false

function togglePasswordVisibility(field, button) {
  if (field.type === 'password') {
    field.type = 'text'
    button.textContent = 'Hide'
  } else {
    field.type = 'password'
    button.textContent = 'Show'
  }
}

function removeOurToggleButtons() {
  const toggleButtons = document.querySelectorAll(`.${TOGGLE_BUTTON_CLASS}`)
  toggleButtons.forEach((button) => {
    const inputField = button.previousSibling
    if (inputField && inputField.tagName === 'INPUT') {
      inputField.type = 'password'
      delete inputField.dataset.password
    }
    button.remove()
  })
}

function addCustomToggleButton(field) {
  if (
    field.nextSibling &&
    field.nextSibling.classList &&
    field.nextSibling.classList.contains(TOGGLE_BUTTON_CLASS)
  ) {
    return
  }
  field.dataset.password = 'true'
  const toggleButton = document.createElement('button')
  toggleButton.textContent = showPasswordsByDefault ? 'Hide' : 'Show'
  toggleButton.type = 'button'
  toggleButton.classList.add(TOGGLE_BUTTON_CLASS)
  toggleButton.addEventListener('click', () => {
    togglePasswordVisibility(field, toggleButton)
  })
  field.parentNode.insertBefore(toggleButton, field.nextSibling)
  if (showPasswordsByDefault && field.type === 'password') {
    field.addEventListener('input', () => {
      if (field.type === 'password') {
        field.type = 'text'
        toggleButton.textContent = 'Hide'
      }
    })

    field.addEventListener('focus', () => {
      if (field.value && field.type === 'password') {
        field.type = 'text'
        toggleButton.textContent = 'Hide'
      }
    })

    setTimeout(() => {
      if (field.value && field.type === 'password') {
        field.type = 'text';
        toggleButton.textContent = 'Hide';
      }
    }, 500);
  }
}

function addCustomToggleButtons() {
  const passwordFields = document.querySelectorAll(PASSWORD_FIELD_SELECTOR)
  passwordFields.forEach((field) => {
    addCustomToggleButton(field)
  })
}

function removeCustomToggleButtons() {
  removeOurToggleButtons()
}

function injectStylesheet() {
  if (!document.getElementById('toggle-password-styles')) {
    const styleElement = document.createElement('link')
    styleElement.id = 'toggle-password-styles'
    styleElement.rel = 'stylesheet'
    styleElement.href = chrome.runtime.getURL('content.css')
    document.head.appendChild(styleElement)
  }
}

function init() {
  injectStylesheet()
  chrome.storage.sync.get(['extensionEnabled', 'showPasswordsByDefault'], (result) => {
    extensionEnabled = result.extensionEnabled !== false
    showPasswordsByDefault = result.showPasswordsByDefault === true
    if (extensionEnabled) {
      addCustomToggleButtons()
    } else {
      removeCustomToggleButtons()
    }
  })
}

const observer = new MutationObserver((mutations) => {
  if (!extensionEnabled) return
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches && node.matches('input')) {
          if (
            node.type === 'password' ||
            (node.type === 'text' && node.dataset.password === 'true')
          ) {
            addCustomToggleButton(node)
          }
        } else {
          const passwordFields = node.querySelectorAll?.(PASSWORD_FIELD_SELECTOR)
          if (passwordFields?.length) {
            passwordFields.forEach((field) => {
              addCustomToggleButton(field)
            })
          }
        }
      }
    })
    if (
      mutation.type === 'attributes' &&
      mutation.attributeName === 'type' &&
      mutation.target.tagName === 'INPUT'
    ) {
      const input = mutation.target
      if (
        input.type === 'password' ||
        (input.type === 'text' && input.dataset.password === 'true')
      ) {
        addCustomToggleButton(input)
      }
    }
  })
})

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['type'],
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'update') {
    const wasEnabled = extensionEnabled
    extensionEnabled = request.extensionEnabled !== false
    showPasswordsByDefault = request.showPasswordsByDefault === true
    if (extensionEnabled) {
      addCustomToggleButtons()
    } else {
      removeCustomToggleButtons()
    }
  }
})

init()
